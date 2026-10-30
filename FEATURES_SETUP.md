# Tech Netra - New Features Setup Guide

This document covers the three new features added to Tech Netra MVP:
1. **Voice Navigation** - "Take me to class/function/line"
2. **File Upload** - Upload Python, JS, Java, C++ files
3. **Vibe Code** - Context-aware code generation

---

## Prerequisites

Before setting up, ensure you have:
- ✅ Backend running: `http://127.0.0.1:8000`
- ✅ Frontend running: `http://localhost:3000`
- ✅ Anthropic API key in `backend/.env`
- ✅ `claude-haiku-5-5` model (cheapest option)

---

## Feature 1: Voice Navigation

### What It Does

Converts voice commands into code navigation:
```
"Take me to class User" → Jumps to the User class definition
"Go to function login" → Finds and reads the login function
"Jump to line 75" → Navigates to line 75 immediately
```

### Backend Implementation

File: `backend/app/routes/voice_navigation_routes.py`

**Endpoints:**
- `POST /api/voice-nav/navigate` - Navigate to a target

**Request:**
```json
{
  "command": "go to function loginUser",
  "code": "...full file content...",
  "file_name": "auth.py"
}
```

**Response:**
```json
{
  "target_line": 25,
  "target_name": "loginUser",
  "context": "def loginUser(username, password):",
  "spoken_response": "Found function loginUser at line 25...",
  "error": null
}
```

### Frontend Integration

In `frontend/app/page.tsx`, wire up voice navigation:

```typescript
// When user says "go to function foo"
const navResult = await fetch(`${API_BASE}/api/voice-nav/navigate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    command: userVoiceInput,  // "go to function foo"
    code: currentCode,
    file_name: currentFileName
  })
});

const nav = await navResult.json();
if (!nav.error) {
  setCursorLine(nav.target_line);  // Jump to line
  speakText(nav.spoken_response);   // Announce
}
```

### Test It

```bash
cd backend
py -c "
from app.routes.voice_navigation_routes import extract_target

# Test parsing
cmd = 'take me to class User'
target_type, target_name, line = extract_target(cmd)
print(f'Parsed: type={target_type}, name={target_name}, line={line}')
# Output: Parsed: type=class, name=user, line=None
"
```

Or test via API:
```bash
curl -X POST http://127.0.0.1:8000/api/voice-nav/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "command": "go to line 50",
    "code": "line 1\nline 2\n...\nline 50\n",
    "file_name": "test.py"
  }'
```

---

## Feature 2: File Upload

### What It Does

Uploads code files (Python, JS, Java, C++) for analysis:
- Parses file structure (classes, functions)
- Loads content into editor
- Enables vibe code generation in file context

### Supported Formats

| Language | Extensions | AST Parsing |
|----------|------------|-------------|
| Python | `.py` | ✅ Full |
| JavaScript/TypeScript | `.js`, `.jsx`, `.ts`, `.tsx` | ✅ Full |
| Java | `.java` | ⚠️ Metadata only |
| C/C++ | `.cpp`, `.cc`, `.cxx`, `.c`, `.h`, `.hpp` | ⚠️ Metadata only |

### Backend Implementation

File: `backend/app/routes/file_upload_routes.py`

**Endpoints:**
- `POST /api/files/upload` - Upload a file
- `GET /api/files/supported-formats` - List supported formats

**Upload Request:**
```bash
curl -X POST http://127.0.0.1:8000/api/files/upload \
  -F "file=@myfile.py"
```

**Upload Response:**
```json
{
  "file_name": "myfile.py",
  "language": "python",
  "file_size": 2048,
  "line_count": 75,
  "char_count": 2048,
  "content": "...file content...",
  "parsed": true,
  "structure_summary": "Found 3 classes and 12 functions.",
  "error": null
}
```

### Frontend Integration

Create a file upload modal:

```typescript
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${API_BASE}/api/files/upload`, {
    method: "POST",
    body: formData
  });
  
  const data = await res.json();
  setCode(data.content);  // Load into editor
  setFileName(data.file_name);
  speakText(`Loaded ${data.file_name}. ${data.structure_summary}`);
};
```

### Test It

```bash
# Create a test file
echo 'def hello():\n    print("Hello")' > test.py

# Upload it
curl -X POST http://127.0.0.1:8000/api/files/upload \
  -F "file=@test.py"
```

---

## Feature 3: Vibe Code

### What It Does

Generates code in the context of your current file:

```
User: "Add a function to validate emails"
Claude understands:
  - Current file: user_utils.py
  - Existing classes: User, Session, Database
  - Style: Similar to existing code
  - Location: End of file

Result: A function that fits naturally
```

### Backend Implementation

File: `backend/app/routes/vibe_code_routes.py`

**Endpoints:**
- `POST /api/vibe-code/generate` - Generate code in context

**Request:**
```json
{
  "vibe_request": "add a function to calculate the sum of a list",
  "current_code": "...file content...",
  "file_name": "math_utils.py",
  "cursor_line": 50,
  "style_preference": "functional"
}
```

**Response:**
```json
{
  "generated_code": "def sum_list(items):\n    return sum(items)",
  "explanation": "Generated Python function for summing list",
  "language": "python",
  "suggested_location": 52,
  "fits_context": true,
  "spoken_response": "Generated code snippet. Ready to insert at line 52..."
}
```

### Claude Integration

Vibe code uses Claude's context awareness:

1. **Language Detection:** Reads file extension
2. **Structure Analysis:** Parses existing classes/functions
3. **Style Matching:** Observes coding patterns
4. **Context Prompt:** Sends existing code to Claude
5. **Result:** Generated code that fits seamlessly

### Frontend Integration

```typescript
const handleVibeCode = async (request: string) => {
  const res = await fetch(`${API_BASE}/api/vibe-code/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vibe_request: request,  // "Add email validation"
      current_code: code,
      file_name: fileName,
      cursor_line: cursorLine,
      style_preference: "oop"  // optional
    })
  });
  
  const data = await res.json();
  speakText(data.spoken_response);  // "Generated code snippet..."
  showCodePreview(data.generated_code);  // Show code to user
  // User presses Enter to accept
};
```

### Test It

```bash
curl -X POST http://127.0.0.1:8000/api/vibe-code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "vibe_request": "add a factorial function",
    "current_code": "# Math utilities\n",
    "file_name": "math.py"
  }'
```

---

## Integration Checklist

### Backend

- [x] Three new route modules created
- [x] Routes registered in `app/main.py`
- [x] All endpoints return proper response schemas
- [x] Tests pass (run `py test_new_features.py`)

### Frontend

To fully integrate, add these to `frontend/app/page.tsx`:

**Import new types:**
```typescript
// Add to imports
type VoiceNavResponse = {
  target_line: number;
  target_name: string;
  context: string;
  spoken_response: string;
};

type FileUploadResponse = {
  file_name: string;
  language: string;
  line_count: number;
  structure_summary: string;
};

type VibeCodeResponse = {
  generated_code: string;
  explanation: string;
  spoken_response: string;
};
```

**Wire up voice navigation:**
```typescript
// In handleVoiceCommand or voice processing
if (transcript.includes("take me to") || transcript.includes("go to") || transcript.includes("line")) {
  const navRes = await fetch(`${API_BASE}/api/voice-nav/navigate`, {
    method: "POST",
    body: JSON.stringify({ command: transcript, code, file_name: fileName })
  });
  const nav = await navRes.json();
  if (nav.target_line) {
    setCursorLine(nav.target_line);
    announce(nav.spoken_response, false);
  }
}
```

**Add file upload UI:**
```typescript
// Add to VoiceCodeGenModal or create new FileUploadModal
const handleFile = async (event) => {
  const file = event.target.files[0];
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/files/upload`, { method: "POST", body: formData });
  const data = await res.json();
  setCode(data.content);
  announce(`Loaded ${data.file_name}. ${data.structure_summary}`);
};
```

**Wire vibe code generator:**
```typescript
// In code generator modal
if (transcript.includes("generate") || transcript.includes("add")) {
  const vibeRes = await fetch(`${API_BASE}/api/vibe-code/generate`, {
    method: "POST",
    body: JSON.stringify({ vibe_request: transcript, current_code: code, file_name: fileName })
  });
  const vibe = await vibeRes.json();
  setGeneratedCode(vibe.generated_code);
  announce(vibe.spoken_response);
}
```

---

## Deployment

### On Render (Backend)

Add environment variables:
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-5-5
ALLOWED_ORIGINS=https://your-vercel-url.vercel.app
```

The three new routes will automatically be available at:
- `https://your-backend.onrender.com/api/voice-nav/navigate`
- `https://your-backend.onrender.com/api/files/upload`
- `https://your-backend.onrender.com/api/vibe-code/generate`

### On Vercel (Frontend)

Set environment variable:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

Frontend will automatically call the new endpoints.

---

## API Reference Summary

### Voice Navigation
```
POST /api/voice-nav/navigate
Body: {
  command: "go to function foo",
  code: "...",
  file_name: "script.py"
}
Response: { target_line, target_name, context, spoken_response, error }
```

### File Upload
```
POST /api/files/upload
Body: FormData with file
Response: { file_name, language, line_count, content, structure_summary }

GET /api/files/supported-formats
Response: { formats: {...}, max_file_size_mb: 5 }
```

### Vibe Code
```
POST /api/vibe-code/generate
Body: {
  vibe_request: "add email validation",
  current_code: "...",
  file_name: "users.py"
}
Response: { generated_code, explanation, language, suggested_location, spoken_response }
```

---

## Troubleshooting

### "Voice navigation says 'Parse error'"

- Make sure file is valid Python or JavaScript
- For Java/C++, basic parsing is supported (classes/functions only)
- Try a simpler file first

### "File upload returns 'Unsupported file type'"

Check file extension:
- ✅ `.py`, `.js`, `.java`, `.cpp`
- ❌ `.txt`, `.pdf`, `.doc`
- Use correct extension for your language

### "Vibe code generates empty result"

- Check backend is running and has API key
- Try a simpler request: "write a hello world function"
- Check `http://127.0.0.1:8000/health` → should be 200

### "Response times are slow"

Claude Haiku is fast but:
- First request may take 2-3 seconds (API cold start)
- Large files (1000+ lines) may take longer
- Consider showing "Generating..." feedback to user

---

## Performance Tips

### Optimize File Upload
- Limit to files <5 MB
- For large codebases, upload one module at a time
- Preprocess to remove comments/docstrings for parsing speed

### Optimize Vibe Code
- Keep "current_code" under 1000 lines (send just relevant context)
- More specific requests → better results ("Add email regex validation" vs "Add validation")
- Reuse generated code patterns ("Generate like the User class")

### Optimize Voice Navigation
- Commands are parsed locally (instant response)
- Only file parsing goes to Claude (only for unknown commands)
- Use keyboard shortcuts for speed: Alt+N (next) is faster than voice

---

## What's Next?

These three features enable:

1. **Voice Navigation** + **File Upload** = Instant codebase jumping
2. **Vibe Code** + **File Upload** = Context-aware generation
3. **All three** = Complete voice-first development workflow

Future enhancements:
- [ ] Multi-file projects (upload folder)
- [ ] Version control integration (git commands via voice)
- [ ] Collaborative features (share code sessions)
- [ ] Sound markers and audio minimap
- [ ] Refactor assistant (rename, extract, inline)

---

## Summary

You now have a fully featured, **voice-first code assistant** with:
- ✅ Instant navigation ("take me to function X")
- ✅ File upload (Python, JS, Java, C++)
- ✅ Context-aware code generation (Vibe Code)
- ✅ All powered by Claude Haiku (cheapest model)

**Ready to deploy!** 🚀
