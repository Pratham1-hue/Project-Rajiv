<p align="center"><img src="frontend/public/tech-netra-logo.svg" alt="Tech Netra logo: an eye between code brackets with soundwaves" width="420"></p>

# Tech Netra: Voice-First Codebase Assistant & Interactive Tutor

> **Accessibility-First Developer Platform for Visually Impaired (VI) and Blind Engineers.**
> Eliminates the cognitive fatigue of linear screen-reader navigation by translating codebase exploration, debugging, and UI verification into a fast, non-linear, conversational audio interface.

---

## 🌟 Architecture & Core Feature Pillars

### 1. Structural Audio Navigation ("AST Jumping")
* **Tree-Sitter Parsing Pipeline:** Source code (Python & JavaScript/TypeScript) is compiled into concrete syntax trees using modern `tree-sitter`. Structural entities (classes, methods, functions, loops, conditionals, imports) are mapped into navigable nodes.
* **Non-Linear Navigation:** Jump directly across syntax structures with keyboard shortcuts or natural voice dictation.
* **Audio Scope & Indentation Cues:** Every indentation level is mapped to a precise musical tone using the **Web Audio API** (220 Hz base frequency for module level, scaling smoothly through 261 Hz, 311 Hz, 370 Hz, 440 Hz). Landing on any line automatically announces its parent scope (e.g., *"Inside class PaymentGateway, method process_charge"*).

### 2. Conversational Debugger & AST Explainer
* **Stack Trace Interception:** Captures terminal exceptions and maps the error frame directly to AST line numbers and scopes.
* **2-Sentence TL;DR Plain-English Audio Summary:** Synthesizes the core error cause without reading noisy stack frames aloud.
* **Auto-Focus:** Instantly jumps the cursor to the exact bug line.
* **Interactive State Inspection:** Ask *"Where was this variable last modified?"* or *"What are the current variable values at this line?"*.
* **1-Line Auto-Patch:** Suggests the exact 1-line diff, announces it verbally, and applies the fix when the user presses `Enter`.

### 3. Voice-Driven Code Generation & Editing Loop
* **Intent Prompting:** Developers dictate logic (e.g. *"Create a function that takes a list of integers and returns prime numbers"*).
* **Verbal Audio Diffs:** Before modifying code, the system announces the diff aloud (e.g. *"Adding 11 lines to sample_code.py. Press Enter to accept or Escape to reject"*).

### 4. Visual Co-Pilot (Multimodal UI Verification)
* **Non-Visual Spatial Audit:** Multimodal vision audit analyzing an uploaded screenshot of the rendered UI from top-left to bottom-right.
* **WCAG Compliance Audit:** Evaluates color contrast, focus traps, and ARIA landmarks to ensure AAA compliance.

### 5. Voice Navigation ("Take Me To...")
* **Smart Command Parsing:** Say "Take me to class User" or "Go to function login" or "Jump to line 75"
* **Instant Jumping:** Parses voice command, finds target in code, jumps cursor, announces context
* **Works with any language:** Python, JavaScript, Java, C++

### 6. File Upload & Project Loading
* **Multi-Language Support:** Upload Python, JavaScript/TypeScript, Java, or C/C++ files (max 5 MB)
* **Automatic Structure Parsing:** Detects classes, functions, methods
* **Live in Editor:** Loaded file is immediately available for navigation and editing

### 7. Vibe Code (Context-Aware Generation)
* **File-Aware Code Gen:** Say "Add a function to validate emails" and Claude generates code *in the context of your file*
* **Smart Insertion:** Suggests where to place the new code (end of file, inside class, etc.)
* **Style Matching:** Analyzes existing code and matches your style and patterns

---

## ⌨️ Accessibility & Keyboard Shortcuts (No Mouse Required)

| Key Shortcut | Action | Auditory Feedback |
| :--- | :--- | :--- |
| **`Alt + F`** | Jump to **Next Function / Method** in AST | Affirmative chime + parent scope voice announcement |
| **`Alt + Shift + F`** | Jump to **Previous Function / Method** in AST | Chime + parent scope announcement |
| **`Alt + C`** | Jump to **Next Class** in AST | Rising chime + class summary announcement |
| **`Alt + Shift + C`** | Jump to **Previous Class** in AST | Chime + class summary announcement |
| **`Alt + L`** | Jump to **Next Loop** (`for` / `while`) | Pitch tone for indentation depth + loop announcement |
| **`Alt + Shift + L`** | Jump to **Previous Loop** in AST | Indentation tone + loop announcement |
| **`Alt + I`** | Jump to **Next Conditional** (`if` statement) | Pitch tone + condition announcement |
| **`Up / Down Arrow`** | Move cursor line-by-line | Dynamic pitch tone (Web Audio API) + line announcement |
| **`Alt + V`** | **Toggle Voice Dictation & Intent Listening** | Acoustic rising/falling tone on mic state change |
| **`Alt + D`** | Open **Conversational Debugger** | Alert tone + auto-focus on error line |
| **`Alt + G`** | Open **Voice Code Generator** | Audio diff spoken aloud |
| **`Alt + A`** | Open **Visual Co-Pilot Spatial UI Audit** | Spatial layout & WCAG score read aloud |
| **`Alt + H`** | Open **Keyboard & Voice Reference Dialog** | Spoken shortcuts guide |
| **`Alt + U`** | Upload a **Code File** (Python, JS, Java, C++) | Upload confirmation chime |
| **`Enter`** | **Apply 1-Line Patch** or **Accept Code Diff** | Harmonic success chime |
| **`Escape`** | **Stop Voice Speech (TTS)** / Close active modal | Immediate speech cancellation |

---

## 🗣️ Supported Voice Commands

You can speak any of the following natural commands (or press `Alt + V`):
* *"Move to calculate_total function"*
* *"Skip to next if statement"*
* *"Go to where verify_token is imported"*
* *"Next class"*
* *"Next loop"*
* *"Next function"*
* *"Where was this variable last modified?"*
* *"Create a function that takes a list of integers and returns prime numbers"*

---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### 2. Backend Setup (FastAPI & Tree-Sitter)
```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify backend health at: `http://127.0.0.1:8000/`

Optional AI features: copy `backend/.env.example` to `backend/.env` and set
`ANTHROPIC_API_KEY`. The default model is `claude-sonnet-5-5`; override it with
`ANTHROPIC_MODEL` if needed. Without a key, code generation, debugging, and
vision audit use built-in fallbacks.

To run backend test suite:
```bash
cd backend
py test_api.py
```

### 3. Frontend Setup (Next.js & Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Deploying for a hackathon

See [DEPLOYMENT.md](DEPLOYMENT.md) for a step-by-step Vercel + Render deployment,
environment variables, CORS, and a demo-day checklist.

---

## 📂 Project Structure

```
Tech Netra/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI server with CORS & routes
│   │   ├── ast_parser/
│   │   │   ├── __init__.py
│   │   │   ├── models.py            # Pydantic models for AST nodes & symbols
│   │   │   ├── python_parser.py     # Tree-sitter Python AST engine & pitch calculator
│   │   │   ├── js_parser.py         # Tree-sitter JS/TS AST parser
│   │   │   └── service.py           # Structural jumping, voice intent, & line inspector
│   │   └── routes/
│   │       ├── ast_routes.py        # /api/ast (parse, symbols, jump, voice-command)
│   │       ├── debug_routes.py      # /api/debug (explain, variable query, auto-patch)
│   │       ├── codegen_routes.py    # /api/codegen (voice generation & audio diffs)
│   │       └── vision_routes.py     # /api/vision (spatial layout & WCAG audit)
│   ├── sample_code.py               # E-commerce payment & order processor testbed
│   ├── test_api.py                  # Backend test suite
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── globals.css              # High-contrast WCAG AAA styling & focus rings
│   │   ├── layout.tsx               # Root layout with accessibility metadata
│   │   └── page.tsx                 # Core Voice-First IDE Dashboard
│   ├── components/
│   │   ├── AccessibleHeader.tsx     # High-contrast header with scope & audio controls
│   │   ├── AccessibleCodeEditor.tsx # Keyboard-accessible code editor with AST badges
│   │   ├── ASTOutline.tsx           # Hierarchical AST symbol navigation panel
│   │   ├── VoiceController.tsx      # Web Speech API voice controller & quick chips
│   │   ├── ConversationalDebugger.tsx # Stack trace explainer & 1-line auto-patch
│   │   ├── VoiceCodeGenModal.tsx    # Voice logic prompter with verbal audio diffs
│   │   ├── VisualCoPilotModal.tsx   # Top-left to bottom-right spatial UI audit
│   │   ├── KeyboardHelpModal.tsx    # Accessible shortcuts reference
│   │   └── LiveAnnouncer.tsx        # Screen reader ARIA live regions
│   ├── lib/
│   │   ├── audioEngine.ts           # Web Audio API pitch synthesis & Web Speech TTS
│   │   ├── api.ts                   # Typed API client for FastAPI backend
│   │   └── types.ts                 # TypeScript data contracts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

