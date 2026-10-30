import tree_sitter_python as tspython
from tree_sitter import Language, Parser, Node
from typing import List, Optional, Tuple, Dict
from app.ast_parser.models import ASTNode, CodeStructure

# Initialize Tree-sitter Python Language and Parser
PY_LANGUAGE = Language(tspython.language())
_parser = Parser(PY_LANGUAGE)


CODE_OPEN = "\u27e6"
CODE_CLOSE = "\u27e7"


def code_span(text: str) -> str:
    """Mark source code inside speech text so the client speaks its symbols (e.g. '>' as 'greater than')."""
    return f"{CODE_OPEN}{text}{CODE_CLOSE}" if text else text


def get_audio_pitch(depth: int) -> float:
    """
    Calculate an audio tone frequency based on indentation depth.
    Base tone: 220 Hz (A3 - calm, grounded).
    Scales upward by equal-tempered steps (minor thirds approx: ~1.1892 factor)
    Depth 0: 220 Hz
    Depth 1: 261.63 Hz (C4)
    Depth 2: 329.63 Hz (E4)
    Depth 3: 440.00 Hz (A4)
    Depth 4: 523.25 Hz (C5)
    Depth 5+: 659.25 Hz (E5)
    """
    base_freq = 220.0
    semitone_multiplier = 1.189207  # ~3 semitones per nesting level
    freq = base_freq * (semitone_multiplier ** min(depth, 8))
    return round(freq, 2)


def get_node_text(node: Node, source_bytes: bytes) -> str:
    """Extract and decode UTF-8 text for a node."""
    return source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")


def extract_parameters(node: Node, source_bytes: bytes) -> List[str]:
    """Extract function parameter names from parameters node."""
    params_node = node.child_by_field_name("parameters")
    if not params_node:
        return []
    params = []
    for child in params_node.named_children:
        if child.type == "identifier":
            params.append(get_node_text(child, source_bytes))
        elif child.type in ("typed_parameter", "default_parameter", "typed_default_parameter"):
            name_node = child.child_by_field_name("name") or (child.named_children[0] if child.named_children else None)
            if name_node:
                params.append(get_node_text(name_node, source_bytes))
    return params


def extract_docstring(body_node: Optional[Node], source_bytes: bytes) -> Optional[str]:
    """Extract the first string statement in the body as docstring."""
    if not body_node:
        return None
    for child in body_node.named_children:
        if child.type == "expression_statement":
            expr = child.named_children[0] if child.named_children else None
            if expr and expr.type == "string":
                text = get_node_text(expr, source_bytes).strip("\"' \n\t")
                return text.split("\n")[0]
        break
    return None


def format_parent_scope(scope_stack: List[str]) -> str:
    """Format parent scope for screen reader audio announcement."""
    if not scope_stack:
        return "Top-level module"
    return "Inside " + ", ".join(scope_stack)


def parse_python_code(code_str: str, file_path: Optional[str] = None) -> CodeStructure:
    """
    Parse Python source code into a structured AST representation
    optimized for voice navigation, screen-readers, and audio cues.
    """
    source_bytes = code_str.encode("utf-8")
    tree = _parser.parse(source_bytes)
    root = tree.root_node

    lines = code_str.splitlines()
    total_lines = len(lines) if lines else 1

    classes: List[ASTNode] = []
    functions: List[ASTNode] = []
    methods: List[ASTNode] = []
    loops: List[ASTNode] = []
    conditionals: List[ASTNode] = []
    imports: List[ASTNode] = []
    error_handlers: List[ASTNode] = []
    all_symbols: List[ASTNode] = []

    def traverse_body(body: Optional[Node], depth: int, scope_stack: List[str], parent: ASTNode):
        if not body:
            return
        for child in body.named_children:
            child_item = traverse(child, depth, scope_stack)
            if child_item:
                parent.children.append(child_item)

    def traverse(node: Node, depth: int, scope_stack: List[str]) -> Optional[ASTNode]:
        node_type = node.type
        current_scope_str = format_parent_scope(scope_stack)
        ast_item: Optional[ASTNode] = None

        if node_type == "class_definition":
            name_node = node.child_by_field_name("name")
            name = get_node_text(name_node, source_bytes) if name_node else "AnonymousClass"
            start_line = node.start_point[0] + 1
            start_col = node.start_point[1]
            end_line = node.end_point[0] + 1
            end_col = node.end_point[1]

            body_node = node.child_by_field_name("body")
            docstring = extract_docstring(body_node, source_bytes)

            summary = f"Class {code_span(name)}, lines {start_line} to {end_line}"
            if docstring:
                summary += f". {docstring}"

            snippet = "\n".join(lines[start_line - 1: min(start_line + 4, end_line)])

            ast_item = ASTNode(
                id=f"class_{name}_{start_line}",
                node_type="class",
                name=name,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                docstring=docstring,
                summary=summary,
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=snippet,
                children=[]
            )
            classes.append(ast_item)
            all_symbols.append(ast_item)

            # Traverse class body with updated scope
            new_scope = scope_stack + [f"class {name}"]
            if body_node:
                for child in body_node.named_children:
                    child_item = traverse(child, depth + 1, new_scope)
                    if child_item:
                        ast_item.children.append(child_item)
            return ast_item

        elif node_type == "function_definition":
            name_node = node.child_by_field_name("name")
            name = get_node_text(name_node, source_bytes) if name_node else "anonymous_function"
            start_line = node.start_point[0] + 1
            start_col = node.start_point[1]
            end_line = node.end_point[0] + 1
            end_col = node.end_point[1]

            params = extract_parameters(node, source_bytes)
            return_type_node = node.child_by_field_name("return_type")
            return_type = get_node_text(return_type_node, source_bytes) if return_type_node else None

            body_node = node.child_by_field_name("body")
            docstring = extract_docstring(body_node, source_bytes)

            is_method = any(s.startswith("class ") for s in scope_stack)
            kind_label = "Method" if is_method else "Function"

            param_announcement = f"takes {', '.join(code_span(p) for p in params)}" if params else "takes no parameters"
            summary = f"{kind_label} {code_span(name)}, {param_announcement}, line {start_line}"
            if return_type:
                summary += f", returns {code_span(return_type)}"
            if docstring:
                summary += f". {docstring}"

            snippet = "\n".join(lines[start_line - 1: min(start_line + 4, end_line)])

            ast_item = ASTNode(
                id=f"{'method' if is_method else 'func'}_{name}_{start_line}",
                node_type="method" if is_method else "function",
                name=name,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                parameters=params,
                return_type=return_type,
                docstring=docstring,
                summary=summary,
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=snippet,
                children=[]
            )

            if is_method:
                methods.append(ast_item)
            else:
                functions.append(ast_item)
            all_symbols.append(ast_item)

            # Traverse function body
            new_scope = scope_stack + [f"{'method' if is_method else 'function'} {name}"]
            if body_node:
                for child in body_node.named_children:
                    child_item = traverse(child, depth + 1, new_scope)
                    if child_item:
                        ast_item.children.append(child_item)
            return ast_item

        elif node_type in ("for_statement", "while_statement"):
            start_line = node.start_point[0] + 1
            start_col = node.start_point[1]
            end_line = node.end_point[0] + 1
            end_col = node.end_point[1]
            loop_type = "For loop" if node_type == "for_statement" else "While loop"
            first_line_code = lines[start_line - 1].strip() if start_line - 1 < len(lines) else ""

            summary = f"{loop_type} at line {start_line}: {code_span(first_line_code)}"
            ast_item = ASTNode(
                id=f"loop_{start_line}",
                node_type="loop",
                name=loop_type,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=summary,
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=first_line_code,
                children=[]
            )
            loops.append(ast_item)
            all_symbols.append(ast_item)

            new_scope = scope_stack + [f"{loop_type} line {start_line}"]
            traverse_body(node.child_by_field_name("body"), depth + 1, new_scope, ast_item)

            for clause in node.children_by_field_name("alternative"):
                clause_line = clause.start_point[0] + 1
                traverse_body(
                    clause.child_by_field_name("body"),
                    depth + 1,
                    scope_stack + [f"loop else line {clause_line}"],
                    ast_item,
                )
            return ast_item

        elif node_type == "if_statement":
            start_line = node.start_point[0] + 1
            start_col = node.start_point[1]
            end_line = node.end_point[0] + 1
            end_col = node.end_point[1]
            first_line_code = lines[start_line - 1].strip() if start_line - 1 < len(lines) else ""

            summary = f"Conditional if statement at line {start_line}: {code_span(first_line_code)}"
            ast_item = ASTNode(
                id=f"if_{start_line}",
                node_type="conditional",
                name="If statement",
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=summary,
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=first_line_code,
                children=[]
            )
            conditionals.append(ast_item)
            all_symbols.append(ast_item)

            # Traverse consequence and alternative
            consequence = node.child_by_field_name("consequence")
            new_scope = scope_stack + [f"if line {start_line}"]
            if consequence:
                for child in consequence.named_children:
                    child_item = traverse(child, depth + 1, new_scope)
                    if child_item:
                        ast_item.children.append(child_item)

            for clause in node.children_by_field_name("alternative"):
                if clause.type == "elif_clause":
                    clause_line = clause.start_point[0] + 1
                    clause_scope = scope_stack + [f"elif line {clause_line}"]
                    traverse_body(clause.child_by_field_name("consequence"), depth + 1, clause_scope, ast_item)
                else:
                    clause_line = clause.start_point[0] + 1
                    clause_scope = scope_stack + [f"else line {clause_line}"]
                    traverse_body(clause.child_by_field_name("body"), depth + 1, clause_scope, ast_item)
            return ast_item

        elif node_type == "try_statement":
            start_line = node.start_point[0] + 1
            start_col = node.start_point[1]
            end_line = node.end_point[0] + 1
            end_col = node.end_point[1]
            handler_count = sum(1 for c in node.named_children if c.type in ("except_clause", "except_group_clause"))
            summary = f"Try block at line {start_line} with {handler_count} error handler{'s' if handler_count != 1 else ''}"
            ast_item = ASTNode(
                id=f"try_{start_line}",
                node_type="error_handler",
                name="Try block",
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=summary,
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=lines[start_line - 1].strip() if start_line - 1 < len(lines) else "",
                children=[]
            )
            error_handlers.append(ast_item)
            all_symbols.append(ast_item)

            for clause in node.named_children:
                clause_line = clause.start_point[0] + 1
                if clause.type == "block":
                    traverse_body(clause, depth + 1, scope_stack + [f"try line {start_line}"], ast_item)
                else:
                    label = clause.type.replace("_clause", "").replace("_", " ")
                    for block in clause.named_children:
                        if block.type == "block":
                            traverse_body(block, depth + 1, scope_stack + [f"{label} line {clause_line}"], ast_item)
            return ast_item

        elif node_type in ("import_statement", "import_from_statement"):
            start_line = node.start_point[0] + 1
            start_col = node.start_point[1]
            end_line = node.end_point[0] + 1
            end_col = node.end_point[1]
            import_code = lines[start_line - 1].strip() if start_line - 1 < len(lines) else ""

            summary = f"Import statement at line {start_line}: {code_span(import_code)}"
            ast_item = ASTNode(
                id=f"import_{start_line}",
                node_type="import",
                name=import_code,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=summary,
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=import_code,
                children=[]
            )
            imports.append(ast_item)
            all_symbols.append(ast_item)
            return ast_item

        else:
            # Continue traversal for child statements (like module body)
            for child in node.named_children:
                traverse(child, depth, scope_stack)
            return None

    # Traverse from root node
    for child in root.named_children:
        traverse(child, 0, [])

    # Sort all_symbols by start_line ascending
    all_symbols.sort(key=lambda x: (x.start_line, x.start_col))

    return CodeStructure(
        file_path=file_path,
        language="python",
        total_lines=total_lines,
        classes=classes,
        functions=functions,
        methods=methods,
        imports=imports,
        loops=loops,
        conditionals=conditionals,
        error_handlers=error_handlers,
        all_symbols=all_symbols
    )

