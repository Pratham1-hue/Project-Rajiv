"""
Scope-aware Python refactorings driven by the standard library `ast` module.

`ast` (rather than tree-sitter) is used here because refactoring needs Python's own
notion of name binding: Load vs Store contexts, argument lists, and statement
lists, so that extracted code receives exactly the parameters it reads and returns
exactly the values the remaining code still needs.
"""
import ast
import difflib
import keyword
import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple, Union

FunctionNode = Union[ast.FunctionDef, ast.AsyncFunctionDef]


class RefactorError(Exception):
    """Raised with a speakable explanation when a refactoring cannot be applied safely."""


@dataclass
class RefactorResult:
    updated_code: str
    diff: str
    summary: str
    focus_line: int
    details: Dict[str, object] = field(default_factory=dict)


def normalize_identifier(spoken: str, style: str = "snake") -> str:
    """Turn a dictated name ("process payment", "processPayment.") into a valid identifier."""
    cleaned = re.sub(r"[^A-Za-z0-9_\s]", " ", spoken).strip()
    words = cleaned.split()
    if not words:
        raise RefactorError("No name was given for the refactoring.")
    if len(words) == 1:
        name = words[0]
    elif style == "camel":
        name = words[0].lower() + "".join(w.capitalize() for w in words[1:])
    else:
        name = "_".join(w.lower() for w in words)
    if name[0].isdigit():
        name = f"fn_{name}"
    if not name.isidentifier() or keyword.iskeyword(name):
        raise RefactorError(f"{spoken} is not a valid Python name.")
    return name


def make_diff(before: str, after: str, file_name: str) -> str:
    return "\n".join(
        difflib.unified_diff(
            before.splitlines(), after.splitlines(), fromfile=f"a/{file_name}", tofile=f"b/{file_name}", lineterm="", n=1
        )
    )


def _parse(code: str) -> ast.Module:
    try:
        return ast.parse(code)
    except SyntaxError as exc:
        raise RefactorError(f"The file has a syntax error at line {exc.lineno}, so it cannot be refactored safely.")


def _with_parents(tree: ast.AST) -> Dict[ast.AST, ast.AST]:
    parents: Dict[ast.AST, ast.AST] = {}
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            parents[child] = node
    return parents


def _statement_lists(tree: ast.AST) -> Iterable[List[ast.stmt]]:
    for node in ast.walk(tree):
        for _, value in ast.iter_fields(node):
            if isinstance(value, list) and value and all(isinstance(v, ast.stmt) for v in value):
                yield value


def _stmt_start(stmt: ast.stmt) -> int:
    decorators = getattr(stmt, "decorator_list", None) or []
    return min([stmt.lineno] + [d.lineno for d in decorators])


def _enclosing_functions(tree: ast.Module, parents: Dict[ast.AST, ast.AST], node: ast.AST) -> List[FunctionNode]:
    """Innermost-first chain of functions enclosing `node`."""
    chain: List[FunctionNode] = []
    current = parents.get(node)
    while current is not None:
        if isinstance(current, (ast.FunctionDef, ast.AsyncFunctionDef)):
            chain.append(current)
        current = parents.get(current)
    return chain


def _walk_scope(nodes: Iterable[ast.AST]) -> Iterable[ast.AST]:
    """Walk nodes without descending into nested function/class/lambda scopes."""
    stack = list(nodes)
    while stack:
        node = stack.pop()
        yield node
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
                continue
            stack.append(child)


def _bound_names(node: ast.AST) -> List[Tuple[str, int]]:
    """Names bound by a single node, with their line numbers."""
    out: List[Tuple[str, int]] = []
    if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)):
        out.append((node.id, node.lineno))
    elif isinstance(node, (ast.Import, ast.ImportFrom)):
        for alias in node.names:
            out.append(((alias.asname or alias.name).split(".")[0], node.lineno))
    elif isinstance(node, ast.ExceptHandler) and node.name:
        out.append((node.name, node.lineno))
    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        out.append((node.name, node.lineno))
    return out


def _function_args(fn: FunctionNode) -> List[str]:
    a = fn.args
    names = [arg.arg for arg in a.posonlyargs + a.args + a.kwonlyargs]
    if a.vararg:
        names.append(a.vararg.arg)
    if a.kwarg:
        names.append(a.kwarg.arg)
    return names


def _check_extractable(selected: List[ast.stmt]):
    def visit(node: ast.AST, loop_depth: int):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            return
        if isinstance(node, ast.Return):
            raise RefactorError(f"Line {node.lineno} contains a return statement, which cannot move into a new function.")
        if isinstance(node, (ast.Yield, ast.YieldFrom)):
            raise RefactorError(f"Line {node.lineno} contains a yield, which cannot move into a new function.")
        if isinstance(node, (ast.Global, ast.Nonlocal)):
            raise RefactorError(f"Line {node.lineno} declares global or nonlocal names, which cannot be extracted.")
        if isinstance(node, (ast.Break, ast.Continue)) and loop_depth == 0:
            raise RefactorError(f"Line {node.lineno} uses break or continue for a loop outside the selection.")
        inner = loop_depth + (1 if isinstance(node, (ast.For, ast.AsyncFor, ast.While)) else 0)
        for child in ast.iter_child_nodes(node):
            visit(child, inner)

    for stmt in selected:
        visit(stmt, 0)


def _select_statements(tree: ast.Module, code_lines: List[str], start: int, end: int) -> Tuple[List[ast.stmt], int, int]:
    """Pick the innermost statement list whose overlapping statements cover the selection."""
    while start <= end and _is_blank_or_comment(code_lines, start):
        start += 1
    while end >= start and _is_blank_or_comment(code_lines, end):
        end -= 1
    if start > end:
        raise RefactorError("The selection contains no code.")

    best: Optional[Tuple[List[ast.stmt], int, int]] = None
    for stmts in _statement_lists(tree):
        overlapping = [s for s in stmts if _stmt_start(s) <= end and s.end_lineno >= start]
        if not overlapping:
            continue
        span_start = _stmt_start(overlapping[0])
        span_end = overlapping[-1].end_lineno
        if span_start <= start and span_end >= end:
            if best is None or (span_end - span_start) < (best[2] - best[1]):
                best = (overlapping, span_start, span_end)
    if best is None:
        raise RefactorError(f"Lines {start} to {end} do not form complete statements.")
    stmts, span_start, span_end = best
    if any(isinstance(s, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) for s in stmts):
        raise RefactorError("The selection contains a whole function or class definition. Select statements inside a function body.")
    # A single cursor line may grow to its full block; an explicit range must not silently grow
    if start != end and (span_start < start or span_end > end):
        raise RefactorError(
            f"Lines {start} to {end} cut through a statement spanning lines {span_start} to {span_end}. Select the whole statement."
        )
    return best


def _is_blank_or_comment(lines: List[str], line_no: int) -> bool:
    text = lines[line_no - 1].strip() if 0 < line_no <= len(lines) else ""
    return not text or text.startswith("#")


def _indent_of(line: str) -> str:
    return line[: len(line) - len(line.lstrip())]


def extract_function(
    code: str, start_line: int, end_line: int, raw_name: str, file_name: str = "main.py"
) -> RefactorResult:
    """Extract statements spanning [start_line, end_line] into a new function or method."""
    tree = _parse(code)
    parents = _with_parents(tree)
    lines = code.split("\n")
    if start_line > end_line:
        start_line, end_line = end_line, start_line

    selected, sel_start, sel_end = _select_statements(tree, lines, start_line, end_line)
    _check_extractable(selected)

    enclosing = _enclosing_functions(tree, parents, selected[0])
    scope_fn = enclosing[0] if enclosing else None
    if scope_fn is not None and sel_start <= scope_fn.lineno:
        raise RefactorError("The selection includes the function definition itself. Select lines inside the function body.")

    name = normalize_identifier(raw_name)

    # Names visible before the selection: arguments plus earlier bindings in every enclosing function
    defined_before: set = set()
    for fn in enclosing:
        defined_before.update(_function_args(fn))
        for node in _walk_scope(fn.body):
            for bound, line in _bound_names(node):
                if line < sel_start:
                    defined_before.add(bound)

    selected_ids = {id(n) for s in selected for n in _walk_scope([s])}
    loads_in_order: List[str] = []
    stores_in_selection: set = set()
    for node in sorted(
        (n for s in selected for n in _walk_scope([s]) if isinstance(n, ast.Name)),
        key=lambda n: (n.lineno, n.col_offset),
    ):
        if isinstance(node.ctx, ast.Load) and node.id not in loads_in_order:
            loads_in_order.append(node.id)
        elif isinstance(node.ctx, ast.Store):
            stores_in_selection.add(node.id)
    for s in selected:
        for node in _walk_scope([s]):
            for bound, _ in _bound_names(node):
                if not isinstance(node, ast.Name):
                    stores_in_selection.add(bound)
            if isinstance(node, ast.AugAssign) and isinstance(node.target, ast.Name):
                if node.target.id not in loads_in_order:
                    loads_in_order.append(node.target.id)

    params = [n for n in loads_in_order if n in defined_before] if enclosing else []

    scope_body = scope_fn.body if scope_fn else tree.body
    loads_after = {
        n.id
        for n in _walk_scope(scope_body)
        if id(n) not in selected_ids and isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load) and n.lineno > sel_end
    }
    outputs = sorted(stores_in_selection & loads_after, key=lambda v: next(
        (n.lineno for s in selected for n in _walk_scope([s]) if isinstance(n, ast.Name) and n.id == v), 0
    ))

    # Decide placement: method on the same class, or a top-level function
    parent_of_scope = parents.get(scope_fn) if scope_fn else None
    is_method = isinstance(parent_of_scope, ast.ClassDef) and not any(
        isinstance(d, ast.Name) and d.id == "staticmethod" for d in scope_fn.decorator_list
    ) and bool(_function_args(scope_fn))

    existing = {
        n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
    }
    if name in existing:
        raise RefactorError(f"A function or class named {name} already exists. Choose another name.")

    base_indent = _indent_of(lines[sel_start - 1])
    if scope_fn is not None:
        unit = _indent_of(lines[scope_fn.body[0].lineno - 1])[len(_indent_of(lines[scope_fn.lineno - 1])):] or "    "
    else:
        unit = "    "

    if is_method:
        receiver = _function_args(scope_fn)[0]
        def_indent = _indent_of(lines[scope_fn.lineno - 1])
        signature_params = [receiver] + [p for p in params if p != receiver]
        call_args = [p for p in params if p != receiver]
        callee = f"{receiver}.{name}"
        insert_after = scope_fn.end_lineno
    else:
        def_indent = ""
        signature_params = params
        call_args = params
        callee = name
        if scope_fn is not None:
            top = selected[0]
            while parents.get(top) is not None and not isinstance(parents.get(top), ast.Module):
                top = parents[top]
            insert_after = top.end_lineno
        else:
            insert_after = None  # module level: define the function before its first use

    is_async = any(isinstance(n, ast.Await) for s in selected for n in _walk_scope([s]))
    body_lines = []
    for raw in lines[sel_start - 1 : sel_end]:
        stripped = raw[len(base_indent):] if raw.startswith(base_indent) else raw.lstrip()
        body_lines.append(f"{def_indent}{unit}{stripped}" if raw.strip() else "")

    scope_label = f"{scope_fn.name}" if scope_fn else "module level"
    new_fn = [
        f"{def_indent}{'async ' if is_async else ''}def {name}({', '.join(signature_params)}):",
        f'{def_indent}{unit}"""Extracted from {scope_label}."""',
        *body_lines,
    ]
    if outputs:
        new_fn.append(f"{def_indent}{unit}return {', '.join(outputs)}")

    call_expr = f"{'await ' if is_async else ''}{callee}({', '.join(call_args)})"
    call_line = f"{base_indent}{', '.join(outputs)} = {call_expr}" if outputs else f"{base_indent}{call_expr}"

    updated = list(lines)
    if insert_after is not None:
        spacer = [""] if is_method else ["", ""]
        updated[insert_after:insert_after] = spacer + new_fn
        updated[sel_start - 1 : sel_end] = [call_line]
        removed = sel_end - sel_start
        focus_line = insert_after - removed + len(spacer) + 1
    else:
        updated[sel_start - 1 : sel_end] = [call_line]
        updated[sel_start - 1 : sel_start - 1] = new_fn + ["", ""]
        focus_line = sel_start

    updated_code = "\n".join(updated)
    try:
        ast.parse(updated_code)
    except SyntaxError as exc:
        raise RefactorError(f"The extracted code would not compile (line {exc.lineno}), so nothing was changed.")

    kind = "method" if is_method else "function"
    takes = f"taking {', '.join(call_args)}" if call_args else "taking no arguments"
    returns = f", returning {', '.join(outputs)}" if outputs else ""
    count = sel_end - sel_start + 1
    summary = (
        f"Extract {count} line{'s' if count != 1 else ''} ({sel_start} to {sel_end}) from {scope_label} "
        f"into {kind} {name} {takes}{returns}."
    )
    return RefactorResult(
        updated_code=updated_code,
        diff=make_diff(code, updated_code, file_name),
        summary=summary,
        focus_line=focus_line,
        details={
            "name": name,
            "kind": kind,
            "params": call_args,
            "returns": outputs,
            "start_line": sel_start,
            "end_line": sel_end,
        },
    )


def rename_symbol(code: str, old: str, raw_new: str, cursor_line: int, file_name: str = "main.py") -> RefactorResult:
    """Rename a local variable/parameter (inside the function at the cursor) or a module-level name."""
    tree = _parse(code)
    new = normalize_identifier(raw_new)
    if old == new:
        raise RefactorError(f"{old} already has that name.")

    # Innermost function at the cursor that binds `old` determines the scope
    scope: ast.AST = tree
    candidates = [
        n for n in ast.walk(tree)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.lineno <= cursor_line <= n.end_lineno
    ]
    for fn in sorted(candidates, key=lambda f: f.end_lineno - f.lineno):
        local_bindings = set(_function_args(fn)) | {b for n in _walk_scope(fn.body) for b, _ in _bound_names(n)}
        if old in local_bindings:
            scope = fn
            break

    in_scope_names = set()
    for n in ast.walk(scope):
        if isinstance(n, ast.Name):
            in_scope_names.add(n.id)
        elif isinstance(n, ast.arg):
            in_scope_names.add(n.arg)
        elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            in_scope_names.add(n.name)
    if old not in in_scope_names:
        raise RefactorError(f"No symbol named {old} was found.")
    if new in in_scope_names:
        raise RefactorError(f"The name {new} is already used in this scope.")

    lines = code.split("\n")
    edits: List[Tuple[int, int, int]] = []  # (line, byte_col, byte_len)

    def add_edit(line: int, byte_col: int):
        edits.append((line, byte_col, len(old.encode("utf-8"))))

    nodes = ast.walk(scope) if scope is not tree else ast.walk(tree)
    for n in nodes:
        if isinstance(n, ast.Name) and n.id == old:
            add_edit(n.lineno, n.col_offset)
        elif isinstance(n, ast.arg) and n.arg == old:
            add_edit(n.lineno, n.col_offset)
        elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and n.name == old:
            line_bytes = lines[n.lineno - 1].encode("utf-8")
            m = re.search(rb"\b(?:def|class)\s+(" + re.escape(old.encode()) + rb")\b", line_bytes)
            if m:
                add_edit(n.lineno, m.start(1))

    if scope is tree:
        # Module-level rename must not touch functions that shadow the name locally
        shadowing = [
            fn for fn in ast.walk(tree)
            if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef))
            and old in (set(_function_args(fn)) | {b for n in _walk_scope(fn.body) for b, _ in _bound_names(n) if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))})
        ]
        edits = [
            e for e in edits
            if not any(fn.lineno < e[0] <= fn.end_lineno or (fn.lineno == e[0] and fn.name != old) for fn in shadowing)
        ]

    if not edits:
        raise RefactorError(f"No references to {old} could be renamed.")

    for line_no, byte_col, byte_len in sorted(set(edits), key=lambda e: (e[0], e[1]), reverse=True):
        raw = lines[line_no - 1].encode("utf-8")
        lines[line_no - 1] = (raw[:byte_col] + new.encode("utf-8") + raw[byte_col + byte_len:]).decode("utf-8")

    updated_code = "\n".join(lines)
    _parse(updated_code)

    occurrences = len(set(edits))
    where = f"function {scope.name}" if scope is not tree else "the whole file"
    first_line = min(e[0] for e in edits)
    return RefactorResult(
        updated_code=updated_code,
        diff=make_diff(code, updated_code, file_name),
        summary=f"Rename {old} to {new}: {occurrences} occurrence{'s' if occurrences != 1 else ''} in {where}.",
        focus_line=first_line,
        details={"old": old, "new": new, "occurrences": occurrences},
    )
