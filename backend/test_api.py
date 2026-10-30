import sys
import io

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ast_endpoints():
    print("=== 1. Testing /api/ast/parse-map (Raw Python Code to Functions & Classes JSON Map) ===")
    sample_raw_python = """
class AudioSynthesizer:
    \"\"\"Manages real-time audio pitch modulation for indentation.\"\"\"
    def __init__(self, sample_rate: int = 44100):
        self.sample_rate = sample_rate

    def modulate_pitch(self, depth: int) -> float:
        \"\"\"Calculate frequency based on indentation depth.\"\"\"
        base_hz = 220.0
        return base_hz * (1.1892 ** depth)

def process_voice_intent(raw_utterance: str) -> str:
    \"\"\"Converts developer voice utterance to AST query target.\"\"\"
    return raw_utterance.strip().lower()
"""
    r_map = client.post("/api/ast/parse-map", json={"code": sample_raw_python})
    assert r_map.status_code == 200, r_map.text
    map_data = r_map.json()
    print("Parsed raw code, quick audio summary:", map_data["quick_audio_summary"])
    print("Classes found:", [c["name"] for c in map_data["classes"]])
    print("Methods inside class AudioSynthesizer:", [m["name"] for m in map_data["classes"][0]["methods"]])
    print("Standalone functions found:", [f["name"] for f in map_data["functions"]])

    print("\n=== 2. Testing /api/ast/sample ===")
    r = client.get("/api/ast/sample")
    assert r.status_code == 200, r.text
    data = r.json()
    print("Loaded sample code, total lines:", data["structure"]["total_lines"])
    print("Classes found:", [c["name"] for c in data["structure"]["classes"]])
    print("Functions found:", [f["name"] for f in data["structure"]["functions"]])

    print("\n=== 3. Testing /api/ast/jump ===")
    r = client.post("/api/ast/jump", json={"current_line": 1, "target_type": "function", "direction": "next"})
    assert r.status_code == 200
    print("Next function announcement:", r.json()["speech_announcement"])
    print("Target line:", r.json()["target_node"]["start_line"])

    print("\n=== 4. Testing /api/ast/voice-command: 'Move to calculate_total function' ===")
    r = client.post("/api/ast/voice-command", json={"voice_transcript": "Move to calculate_total function", "current_line": 1})
    assert r.status_code == 200
    print("Voice announcement:", r.json()["speech_announcement"])
    print("Target line:", r.json()["target_node"]["start_line"])

    print("\n=== 5. Testing Database Models & Endpoints (/api/users) ===")
    user_res = client.post("/api/users/", json={"email": "developer@technetra.org"})
    assert user_res.status_code == 200
    user_data = user_res.json()
    user_id = user_data["id"]
    print(f"Created user id {user_id} with email {user_data['email']}")

    # Get preferences
    pref_res = client.get(f"/api/users/{user_id}/preferences")
    assert pref_res.status_code == 200
    print("User audio preferences initialized:", pref_res.json())

    # Update preferences
    pref_update = client.put(
        f"/api/users/{user_id}/preferences",
        json={"speech_rate": 1.25, "pitch_cues": True, "verbosity_level": "concise"}
    )
    assert pref_update.status_code == 200
    print("Updated preferences speech_rate:", pref_update.json()["speech_rate"])

    # Register custom voice command
    cmd_res = client.post(
        f"/api/users/{user_id}/commands",
        json={
            "spoken_phrase": "jump to main",
            "action_type": "ast_jump",
            "action_payload": {"target": "main", "type": "function"}
        }
    )
    assert cmd_res.status_code == 200
    print("Registered custom voice command:", cmd_res.json()["spoken_phrase"])

    # Update Codebase State
    state_res = client.put(
        f"/api/users/{user_id}/state",
        json={
            "project_id": "tech_netra_demo",
            "active_file": "sample_code.py",
            "active_line": 42,
            "active_ast_node": "while_loop",
            "last_error_trace": {"status": "clean"}
        }
    )
    assert state_res.status_code == 200
    print("Updated codebase state, active line:", state_res.json()["active_line"])

    print("\n=== 6. Testing /api/debug/explain (TL;DR Audio Summary & Auto-Patch) ===")
    trace = (
        'Traceback (most recent call last):\n'
        '  File "sample_code.py", line 97, in process_order\n'
        '    total_with_tax = subtotal + raw_tax_fee\n'
        'TypeError: unsupported operand type(s) for +: \'float\' and \'str\''
    )
    with open("sample_code.py", "r") as f:
        code = f.read()
    r = client.post("/api/debug/explain", json={"stack_trace": trace, "code": code})
    assert r.status_code == 200
    dbg = r.json()
    print("TL;DR Summary:", dbg["tldr_summary"])
    print("Patched line:", dbg["patched_line"])

    print("\n>>> ALL BACKEND & DATABASE TESTS PASSED WITH 100% SUCCESS! <<<")


def test_js_parser_exports_arrows_and_else():
    print("\n=== 7. JS parser: exports, named arrow functions, else blocks ===")
    js_code = (
        "import x from 'y';\n"
        "export function exportedFn(a) { if (a) { return 1; } else { for (const i of a) {} } }\n"
        "export class ExportedClass { method() { while (true) { break; } } }\n"
        "const add = (a, b) => a + b;\n"
        "export const arrow = () => {};\n"
    )
    r = client.post("/api/ast/parse", json={"code": js_code, "file_path": "demo.js"})
    assert r.status_code == 200, r.text
    data = r.json()
    func_names = {f["name"] for f in data["functions"]}
    assert {"exportedFn", "add", "arrow"} <= func_names, func_names
    assert [c["name"] for c in data["classes"]] == ["ExportedClass"]
    assert [m["name"] for m in data["methods"]] == ["method"]
    assert [i["name"] for i in data["imports"]] == ["import x from 'y';"]
    assert len(data["loops"]) == 2, "loop inside else block and loop inside method must both be found"
    else_loop = next(l for l in data["loops"] if l["start_line"] == 2)
    assert else_loop["depth"] == 2, else_loop
    print("Functions:", sorted(func_names), "| loops:", len(data["loops"]))


def test_python_parser_elif_else_depth():
    print("\n=== 8. Python parser: elif / else bodies get correct depth & scope ===")
    py_code = (
        "def f(x):\n"
        "    if x:\n"
        "        pass\n"
        "    elif x > 1:\n"
        "        while x:\n"
        "            x -= 1\n"
        "    else:\n"
        "        for i in range(2):\n"
        "            pass\n"
    )
    r = client.post("/api/ast/parse", json={"code": py_code, "file_path": "demo.py"})
    assert r.status_code == 200, r.text
    loops = {l["start_line"]: l for l in r.json()["loops"]}
    assert loops[5]["depth"] == 2 and "elif line 4" in loops[5]["parent_scope"], loops[5]
    assert loops[8]["depth"] == 2 and "else line 7" in loops[8]["parent_scope"], loops[8]
    print("elif loop scope:", loops[5]["parent_scope"])
    print("else loop scope:", loops[8]["parent_scope"])


def test_codegen_validation():
    print("\n=== 9. Codegen rejects blank prompts and emits valid identifiers ===")
    assert client.post("/api/codegen/generate", json={"prompt": ""}).status_code == 422
    assert client.post("/api/codegen/generate", json={"prompt": "   "}).status_code == 422
    r = client.post("/api/codegen/generate", json={"prompt": "Validate customer's age > 18!"})
    assert r.status_code == 200, r.text
    code = r.json()["generated_code"]
    compile(code, "<generated>", "exec")
    print("Generated header:", code.splitlines()[0])


def test_anthropic_route_integration():
    print("\n=== 10. Anthropic-backed routes parse Claude responses ===")
    import base64

    from app import ai_service
    from app.routes import codegen_routes, debug_routes, vision_routes

    assert ai_service.extract_json('```json\n{"command": "git status"}\n```') == {"command": "git status"}
    assert ai_service.strip_code_fences("```python\ndef f():\n    pass\n```") == "def f():\n    pass"

    old_codegen = codegen_routes.generate_text
    old_debug = debug_routes.generate_json
    old_vision = vision_routes.generate_json_with_image
    try:
        codegen_routes.generate_text = lambda *a, **k: "```python\ndef add(a, b):\n    return a + b\n```"
        r = client.post("/api/codegen/generate", json={"prompt": "add two numbers"})
        assert r.status_code == 200, r.text
        assert r.json()["generated_code"] == "def add(a, b):\n    return a + b"

        debug_routes.generate_json = lambda *a, **k: {
            "summary": "A string was added to a number.",
            "patched_line": "    total = subtotal + float(raw_tax_fee)",
        }
        trace = (
            'Traceback (most recent call last):\n'
            '  File "sample_code.py", line 97, in process_order\n'
            "TypeError: unsupported operand type(s) for +: 'float' and 'str'"
        )
        r = client.post(
            "/api/debug/explain",
            json={"stack_trace": trace, "code": "    total = subtotal + raw_tax_fee\n"},
        )
        assert r.status_code == 200, r.text
        assert "string was added" in r.json()["tldr_summary"]

        vision_routes.generate_json_with_image = lambda *a, **k: {
            "spatial_summary": "Header at top, editor in the middle.",
            "wcag_audit": "Strong contrast; labels present.",
            "recommendations": ["Keep focus rings"],
            "score": 93,
        }
        image = base64.b64encode(b"fake-png").decode()
        r = client.post(
            "/api/vision/audit",
            data={"image_base64": f"data:image/png;base64,{image}", "url": "https://example.com"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["score"] == 93
        assert "Header at top" in r.json()["spatial_summary"]
    finally:
        codegen_routes.generate_text = old_codegen
        debug_routes.generate_json = old_debug
        vision_routes.generate_json_with_image = old_vision

    print("Claude text, JSON, and image responses wired correctly.")


if __name__ == "__main__":
    test_ast_endpoints()
    test_js_parser_exports_arrows_and_else()
    test_python_parser_elif_else_depth()
    test_codegen_validation()
    test_anthropic_route_integration()
    print("\n>>> ALL REGRESSION TESTS PASSED <<<")
