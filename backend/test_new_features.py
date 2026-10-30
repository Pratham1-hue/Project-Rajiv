"""Test new features: voice navigation, file upload, and vibe code."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_voice_navigation():
    print("\n=== Test 1: Voice Navigation API ===")
    r = client.post("/api/voice-nav/navigate", json={
        "command": "go to function factorial",
        "code": "def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)\n\ndef main():\n    print(factorial(5))",
        "file_name": "test.py"
    })
    assert r.status_code == 200
    data = r.json()
    print(f"Status: {r.status_code}")
    print(f"Response: target_line={data['target_line']}, name={data['target_name']}")
    print(f"Spoken: {data['spoken_response'][:80]}...")
    assert data['target_line'] == 1
    print("PASS: Voice navigation works")


def test_file_upload_formats():
    print("\n=== Test 2: File Upload API - Supported Formats ===")
    r = client.get("/api/files/supported-formats")
    assert r.status_code == 200
    data = r.json()
    print(f"Supported formats: {list(data['formats'].keys())}")
    print(f"Max file size: {data['max_file_size_mb']} MB")
    assert ".py" in data["formats"]
    assert ".js" in data["formats"]
    assert ".java" in data["formats"]
    assert ".cpp" in data["formats"]
    print("PASS: File upload formats available")


def test_vibe_code_generation():
    print("\n=== Test 3: Vibe Code Generation ===")
    r = client.post("/api/vibe-code/generate", json={
        "vibe_request": "add a function to calculate the sum of a list",
        "current_code": "# Math utilities\n",
        "file_name": "math_utils.py"
    })
    assert r.status_code == 200
    data = r.json()
    print(f"Status: {r.status_code}")
    print(f"Language: {data['language']}")
    print(f"Generated code length: {len(data['generated_code'])} chars")
    print(f"First 100 chars: {data['generated_code'][:100]}")
    print(f"Fits context: {data['fits_context']}")
    assert data['language'] == "python"
    assert len(data['generated_code']) > 0
    print("PASS: Vibe code generation works")


def test_voice_nav_line_jump():
    print("\n=== Test 4: Voice Nav - Jump to Line ===")
    code = "\n".join([f"line {i}" for i in range(1, 101)])
    r = client.post("/api/voice-nav/navigate", json={
        "command": "jump to line 50",
        "code": code,
        "file_name": "test.py"
    })
    assert r.status_code == 200
    data = r.json()
    print(f"Target line: {data['target_line']}")
    print(f"Context: {data['context']}")
    assert data['target_line'] == 50
    print("PASS: Line jump works")


if __name__ == "__main__":
    test_voice_navigation()
    test_file_upload_formats()
    test_vibe_code_generation()
    test_voice_nav_line_jump()
    print("\n=== ALL TESTS PASSED ===")
