import tree_sitter_javascript as tsjs
from tree_sitter import Language, Parser, Node
from typing import List, Optional
from app.ast_parser.models import ASTNode, CodeStructure
from app.ast_parser.python_parser import get_audio_pitch, format_parent_scope, code_span

JS_LANGUAGE = Language(tsjs.language())
_js_parser = Parser(JS_LANGUAGE)

FUNCTION_TYPES = (
    "function_declaration",
    "generator_function_declaration",
    "function_expression",
    "generator_function",
    "method_definition",
    "arrow_function",
)
LOOP_TYPES = ("for_statement", "while_statement", "do_statement", "for_in_statement")


def get_node_text(node: Node, source_bytes: bytes) -> str:
    return source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")


def resolve_function_name(node: Node, source_bytes: bytes) -> str:
    """Name a function, falling back to the variable or property it is assigned to."""
    name_node = node.child_by_field_name("name")
    if name_node:
        return get_node_text(name_node, source_bytes)

    parent = node.parent
    if parent is not None:
        if parent.type == "variable_declarator":
            target = parent.child_by_field_name("name")
        elif parent.type == "pair":
            target = parent.child_by_field_name("key")
        elif parent.type == "assignment_expression":
            target = parent.child_by_field_name("left")
        else:
            target = None
        if target:
            return get_node_text(target, source_bytes)

    return "anonymous_fn"


def extract_js_parameters(node: Node, source_bytes: bytes) -> List[str]:
    params_node = node.child_by_field_name("parameters") or node.child_by_field_name("parameter")
    if not params_node:
        return []
    if params_node.type == "identifier":
        return [get_node_text(params_node, source_bytes)]
    return [get_node_text(child, source_bytes) for child in params_node.named_children]


def parse_js_code(code_str: str, file_path: Optional[str] = None) -> CodeStructure:
    """Parse JavaScript or TypeScript code into structured AST."""
    source_bytes = code_str.encode("utf-8")
    tree = _js_parser.parse(source_bytes)
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

    def line_text(start_line: int) -> str:
        return lines[start_line - 1].strip() if start_line - 1 < len(lines) else ""

    def traverse_block(block: Optional[Node], depth: int, scope_stack: List[str], parent: ASTNode):
        if not block:
            return
        children = block.named_children if block.type in ("statement_block", "class_body", "else_clause") else [block]
        for child in children:
            child_item = traverse(child, depth, scope_stack)
            if child_item:
                parent.children.append(child_item)

    def traverse(node: Node, depth: int, scope_stack: List[str]) -> Optional[ASTNode]:
        node_type = node.type
        current_scope_str = format_parent_scope(scope_stack)
        start_line = node.start_point[0] + 1
        start_col = node.start_point[1]
        end_line = node.end_point[0] + 1
        end_col = node.end_point[1]

        if node_type == "class_declaration":
            name_node = node.child_by_field_name("name")
            name = get_node_text(name_node, source_bytes) if name_node else "AnonymousClass"
            ast_item = ASTNode(
                id=f"js_class_{name}_{start_line}",
                node_type="class",
                name=name,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=f"Class {code_span(name)}, lines {start_line} to {end_line}",
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=line_text(start_line),
                children=[]
            )
            classes.append(ast_item)
            all_symbols.append(ast_item)
            traverse_block(node.child_by_field_name("body"), depth + 1, scope_stack + [f"class {name}"], ast_item)
            return ast_item

        elif node_type in FUNCTION_TYPES:
            name = resolve_function_name(node, source_bytes)
            is_method = node_type == "method_definition" or (
                bool(scope_stack) and scope_stack[-1].startswith("class ")
            )
            kind = "method" if is_method else "function"
            params = extract_js_parameters(node, source_bytes)
            param_announcement = f"takes {', '.join(code_span(p) for p in params)}" if params else "takes no parameters"

            ast_item = ASTNode(
                id=f"js_{kind}_{name}_{start_line}_{start_col}",
                node_type=kind,
                name=name,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                parameters=params,
                summary=f"{kind.capitalize()} {code_span(name)}, {param_announcement}, line {start_line}",
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=line_text(start_line),
                children=[]
            )
            if is_method:
                methods.append(ast_item)
            else:
                functions.append(ast_item)
            all_symbols.append(ast_item)

            body_node = node.child_by_field_name("body")
            new_scope = scope_stack + [f"{kind} {name}"]
            if body_node and body_node.type == "statement_block":
                traverse_block(body_node, depth + 1, new_scope, ast_item)
            elif body_node:
                # Expression-bodied arrow functions can still contain nested functions
                for child in body_node.named_children:
                    child_item = traverse(child, depth + 1, new_scope)
                    if child_item:
                        ast_item.children.append(child_item)
            return ast_item

        elif node_type in LOOP_TYPES:
            snippet = line_text(start_line)
            ast_item = ASTNode(
                id=f"js_loop_{start_line}_{start_col}",
                node_type="loop",
                name="Loop",
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=f"Loop at line {start_line}: {code_span(snippet)}",
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=snippet,
                children=[]
            )
            loops.append(ast_item)
            all_symbols.append(ast_item)
            traverse_block(node.child_by_field_name("body"), depth + 1, scope_stack + [f"loop line {start_line}"], ast_item)
            return ast_item

        elif node_type == "if_statement":
            snippet = line_text(start_line)
            ast_item = ASTNode(
                id=f"js_if_{start_line}_{start_col}",
                node_type="conditional",
                name="If statement",
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=f"Conditional at line {start_line}: {code_span(snippet)}",
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=snippet,
                children=[]
            )
            conditionals.append(ast_item)
            all_symbols.append(ast_item)

            new_scope = scope_stack + [f"if line {start_line}"]
            traverse_block(node.child_by_field_name("consequence"), depth + 1, new_scope, ast_item)

            alternative = node.child_by_field_name("alternative")
            if alternative:
                for child in alternative.named_children:
                    if child.type == "if_statement":
                        # `else if` chains are sibling conditionals at the same depth
                        traverse(child, depth, scope_stack)
                    else:
                        traverse_block(child, depth + 1, new_scope, ast_item)
            return ast_item

        elif node_type == "try_statement":
            handler = node.child_by_field_name("handler")
            snippet = line_text(start_line)
            ast_item = ASTNode(
                id=f"js_try_{start_line}_{start_col}",
                node_type="error_handler",
                name="Try block",
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=f"Try block at line {start_line} with {1 if handler else 0} catch handler",
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=snippet,
                children=[]
            )
            error_handlers.append(ast_item)
            all_symbols.append(ast_item)
            traverse_block(node.child_by_field_name("body"), depth + 1, scope_stack + [f"try line {start_line}"], ast_item)
            for clause in (handler, node.child_by_field_name("finalizer")):
                if clause:
                    label = "catch" if clause.type == "catch_clause" else "finally"
                    traverse_block(
                        clause.child_by_field_name("body"),
                        depth + 1,
                        scope_stack + [f"{label} line {clause.start_point[0] + 1}"],
                        ast_item,
                    )
            return ast_item

        elif node_type == "export_statement" and node.child_by_field_name("declaration"):
            # `export function/class/const ...` exposes the declaration itself
            return traverse(node.child_by_field_name("declaration"), depth, scope_stack)

        elif node_type in ("import_statement", "export_statement"):
            snippet = line_text(start_line)
            label = "Import" if node_type == "import_statement" else "Export"
            ast_item = ASTNode(
                id=f"js_import_{start_line}",
                node_type="import",
                name=snippet,
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
                depth=depth,
                parent_scope=current_scope_str,
                summary=f"{label} at line {start_line}: {code_span(snippet)}",
                audio_pitch_frequency=get_audio_pitch(depth),
                code_snippet=snippet,
                children=[]
            )
            imports.append(ast_item)
            all_symbols.append(ast_item)
            # `export default () => {}` still contains a navigable function
            for child in node.named_children:
                traverse(child, depth, scope_stack)
            return ast_item

        else:
            first_item: Optional[ASTNode] = None
            for child in node.named_children:
                item = traverse(child, depth, scope_stack)
                if item and first_item is None:
                    first_item = item
            # Pass through wrappers like `const x = () => {}` so the function attaches to its parent
            if node_type in ("lexical_declaration", "variable_declaration", "variable_declarator", "expression_statement"):
                return first_item
            return None

    for child in root.named_children:
        traverse(child, 0, [])

    all_symbols.sort(key=lambda x: (x.start_line, x.start_col))

    return CodeStructure(
        file_path=file_path,
        language="javascript",
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
