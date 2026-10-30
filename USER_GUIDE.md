# Tech Netra - User Guide for Blind & Low-Vision Developers

**Welcome to Tech Netra**, your voice-first, accessibility-optimized code assistant. This guide will help you get started and master all features.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Keyboard Shortcuts](#keyboard-shortcuts)
3. [Voice Commands](#voice-commands)
4. [File Upload & Management](#file-upload--management)
5. [Code Generation (Vibe Code)](#code-generation-vibe-code)
6. [Navigation & Jumping](#navigation--jumping)
7. [Debugging & Code Review](#debugging--code-review)
8. [Visual Co-Pilot](#visual-co-pilot)
9. [Accessibility Features](#accessibility-features)
10. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### First Launch

1. Open **Tech Netra** in your browser (e.g., `http://localhost:3000`)
2. You'll see the **splash screen** with "Welcome to Tech Netra"
3. Press **any key** or click to dismiss the splash screen
4. The main editor loads with sample Python code

### What You'll Hear

When you start the app:
- "Tech Netra initialized. Press Alt+H for keyboard shortcuts or Alt+V to dictate."
- Audio cues (beeps and tones) to confirm actions
- Code read aloud with **symbol pronunciation** (e.g., "less than" instead of "<")

### Main Interface Areas

- **Header:** App name, status indicator, accessibility settings
- **Code Editor:** Main area for reading/navigating code (line-by-line)
- **AST Outline:** Tree view of classes, functions, and structure
- **Live Controller:** Voice input and command feedback
- **Bottom Panel:** Real-time logs and stack traces

---

## Keyboard Shortcuts

Press **Alt+H** to hear a full list. Here are the essentials:

### Navigation & Selection
| Shortcut | Action | Notes |
|----------|--------|-------|
| **Arrow Up/Down** | Move cursor line by line | Hears current line read aloud |
| **Ctrl+Home** | Jump to start of file | Line 1 |
| **Ctrl+End** | Jump to end of file | Last line |
| **Alt+N** | Next function/class | Jumps to next definition |
| **Alt+B** | Previous function/class | Jumps to previous definition |

### Voice & Commands
| Shortcut | Action | Notes |
|----------|--------|-------|
| **Alt+V** | Toggle voice controller | Enables/disables mic input |
| **Alt+G** | Open code generator | Say what you want to create |
| **Alt+D** | Open debugger | Paste error and get explanation |
| **Alt+A** | Visual co-pilot | Upload screenshot for UI audit |
| **Alt+H** | Keyboard help | Hear all shortcuts |

### Accessibility & Settings
| Shortcut | Action | Notes |
|----------|--------|-------|
| **Alt+P** | Cycle symbol level | "some" → "most" → "all" symbols |
| **Alt+M** | Motion mode | "ambient" (animations) or "frozen" (no animations) |
| **Alt+T** | Text size | Increases or decreases for screen readers |

### Code Editing
| Shortcut | Action | Notes |
|----------|--------|-------|
| **Ctrl+S** | Save file | (Local storage, not uploaded) |
| **Ctrl+L** | Load file | Pick a file to analyze |
| **Ctrl+E** | Clear editor | Start fresh |

---

## Voice Commands

Press **Alt+V** to open the live voice controller, then speak one of these commands:

### Code Generation

Say phrases like:

```
"Generate a function to calculate the sum of a list"
"Add a class for user authentication with login and logout"
"Write a helper to validate email addresses"
"Create a sorting algorithm in Python"
"Generate a button component in React"
```

Claude will create code **in the context of your current file**, automatically choosing the right language and style.

### Navigation Commands

**Jump directly to code:**

```
"Take me to class User"
"Go to function login"
"Jump to line 75"
"Navigate to method process"
"Line number 42"
```

The app will:
1. Parse the command
2. Find the target in your code
3. Jump to that line
4. Read it aloud with surrounding context

### Debugging Commands

**Get help with errors:**

```
"Explain this error"
"What does this TypeError mean?"
"Help me debug this"
```

Paste or paste an error stack trace. Claude will:
1. Identify the problem
2. Explain in plain English
3. Suggest a one-line fix
4. Read it aloud

---

## File Upload & Management

### Upload a Code File

1. Click **"File Upload"** or use **Alt+U** (when implemented)
2. Choose a file in one of these formats:
   - **Python:** `.py`
   - **JavaScript/TypeScript:** `.js`, `.jsx`, `.ts`, `.tsx`
   - **Java:** `.java`
   - **C/C++:** `.cpp`, `.cc`, `.cxx`, `.c`, `.h`, `.hpp`
3. Max file size: **5 MB**

### What Happens After Upload

- File content loads into the editor
- Audio announcement: "Loaded file.py. 150 lines. Found 3 classes and 12 functions."
- You can now:
  - Navigate with arrow keys
  - Jump to specific classes/functions
  - Generate code in context
  - Debug issues

---

## Code Generation (Vibe Code)

### What is Vibe Code?

"Vibe Code" generates code that **fits naturally** into your current file. It understands:
- Your current language (Python, JavaScript, Java, C++)
- Existing classes and functions
- Where to insert new code
- Your coding style

### How to Use

1. Open the file you want to extend
2. Press **Alt+G** to open the code generator
3. Say your request:
   - "Add a function to parse JSON"
   - "Create a class for a database connection"
   - "Write unit tests for the login function"
4. Claude generates code
5. You can:
   - **Accept:** Insert at suggested location
   - **Modify:** Ask Claude to adjust
   - **Place:** Choose where to insert

### Example Workflow

```
You: "Generate a matrix multiplication function"
Tech Netra: "Loaded file math_utils.py. Found 5 functions.
            Generating matrix multiplication function...
            Done. Insert at line 156? Press Enter to accept."
You: Press Enter
Tech Netra: "Function inserted. Code reads: def matrix_multiply(A, B)..."
```

---

## Navigation & Jumping

### Line-by-Line Navigation

- **Up/Down arrows:** Move one line at a time, hear each line read
- Current line is announced with line number and context (indentation depth, scope)

### Function & Class Jumping

**Via keyboard:**
- **Alt+N:** Jump to next function/class
- **Alt+B:** Jump to previous function/class

**Via voice:**
- Say "Take me to function loginUser"
- Say "Go to class Database"
- Say "Jump to line 75"

### Audio Feedback

When you jump, you hear:
- Line number
- Code content (first ~30 chars)
- Current scope (e.g., "Inside class User, method login")
- Indentation depth (as pitch: higher = deeper)

---

## Debugging & Code Review

### How to Debug

1. Press **Alt+D** to open the debugger
2. Paste or describe the error:
   - Paste a stack trace
   - Describe the error: "I got a TypeError at line 42"
   - Ask a question: "Why is this loop infinite?"
3. Claude analyzes and provides:
   - **TL;DR Summary:** Plain English explanation
   - **Patch Suggestion:** Exact line to fix
   - **Spoken Response:** Audible explanation

### Stack Trace Example

**Input:**
```
TypeError: unsupported operand type(s) for +: 'float' and 'str'
  File "order.py", line 42, in process_order
    total = subtotal + raw_tax_fee
```

**Output:**
```
"A string was added to a number. The tax fee is stored as text, 
 but your code is trying to add it to a number. Fix: convert raw_tax_fee to float."

Patch: total = subtotal + float(raw_tax_fee)
```

---

## Visual Co-Pilot

### What is the Visual Co-Pilot?

A **screen reader-friendly UI auditor** that:
- Analyzes UI screenshots
- Checks accessibility (WCAG compliance)
- Identifies layout and contrast issues
- Suggests improvements for blind users

### How to Use

1. Take a screenshot of your UI (any tool)
2. Press **Alt+A** to open Visual Co-Pilot
3. Click **"Choose File"** and upload the screenshot
4. Click **"Run Audit"**
5. Tech Netra reads:
   - Spatial layout (top-left to bottom-right)
   - WCAG accessibility score
   - Specific recommendations
   - Focus trap warnings

### Example Output

```
"Spatial Summary: Header at top with logo and status. 
 Code editor in the center with syntax highlighting. 
 Sidebar on the right with file tree.

 WCAG Audit: Overall AAA compliance. Color contrast 7:1. 
 All buttons have aria-labels. No focus traps detected.

 Score: 94/100. Recommendations: 
 1. Keep focus rings on active elements
 2. Maintain 48px touch targets
 3. Add live region announcements for real-time updates"
```

---

## Accessibility Features

### Screen Reader Optimization

- **Semantic HTML:** All roles, labels, and aria-attributes are correct
- **Live regions:** Announcements use aria-live for non-intrusive updates
- **Skip links:** Jump directly to code editor or main content
- **Announcement order:** Logical, prevents clutter

### Symbol Pronunciation

Tech Netra reads code symbols clearly:
- `<` → "less than"
- `>` → "greater than"
- `==` → "is equal to"
- `!=` → "is not equal to"
- `&&` → "and"
- `||` → "or"
- `=>` → "arrow"
- `:=` → "walrus assign" (Python 3.8+)

**Cycle symbol detail with Alt+P:**
- **"some":** Only operators and brackets
- **"most":** Operators, brackets, and punctuation
- **"all":** Every symbol, including colons and dots

### Motion & Animation

- **Alt+M to toggle:** "Frozen" mode disables all animations for focus-sensitive users
- Animations don't prevent interaction
- Smooth transitions use `prefers-reduced-motion` if set in OS

### Text Size & Font

- **Alt+T:** Increase or decrease text size
- Uses CSS variable `--tech-netra-text-scale`
- Scales all UI elements proportionally
- Default: 100% (1.0 scale)

---

## Tips & Tricks

### Pro Tips for Power Users

1. **Pre-upload your files:** Load entire projects before editing
2. **Use vibe code for boilerplate:** Fastest way to create new classes/functions
3. **Read line context:** Arrow keys auto-announce scope and indentation depth
4. **Combine commands:** "Go to function login, then generate a password validator"
5. **Symbol shortcuts:** Memorize Alt+P for quick symbol verbosity changes

### Keyboard Speed

- Arrow keys move **one line at a time** with immediate audio feedback
- Alt+N/B jumps to **next/previous definition** (faster for large files)
- Use voice "go to line 150" for **instant jumping**

### Debugging Faster

- **Paste the last error:** Debug remembers your previous error
- **Ask for one-line fixes:** Claude prioritizes minimal, surgical patches
- **See the code:** Voice responses include the original line for context

### Generating Better Code

- **Be specific:** "Function to validate email" → generic function
- **Be contextual:** "Add email validation to the user class" → better fit
- **Ask for style:** "Write it in a functional style" → influences Claude
- **Iterate:** "Make it more concise" or "Add error handling"

### File Management

- Upload once, navigate infinitely
- Switch between multiple uploaded files
- Local storage saves your work (doesn't upload without permission)
- Always keep a backup of important code

---

## Troubleshooting

### "I can't hear the app"

1. Check your system volume
2. Check browser volume (not muted)
3. Press Alt+V to toggle voice controller
4. Try Alt+H (help) to test speech

### "The editor isn't responding to my voice"

1. Make sure **Alt+V** is on (status indicator shows active)
2. Check microphone permissions in browser
3. Speak clearly and slowly
4. Try again, or use keyboard shortcuts as backup

### "Claude isn't generating code"

1. Check that your backend API key is set (`backend/.env`)
2. Make sure backend is running (`http://127.0.0.1:8000/health` → 200 OK)
3. Try a simpler request: "Write a hello world function"
4. Check browser console (F12) for error messages

### "File upload says 'file too large'"

Max size is **5 MB**. Solutions:
- Split large files into smaller ones
- Remove comments or compress the file
- Upload just the relevant functions

### "Line numbers don't match my file"

Tech Netra counts from **line 1** (human-readable). 
- "Line 1" = first line of file
- Matches most editors (VS Code, PyCharm, etc.)

---

## Accessibility Verification

### What We've Tested

- ✅ Keyboard navigation (no mouse required)
- ✅ Screen reader compatibility (NVDA, JAWS, VoiceOver)
- ✅ Color contrast (WCAG AAA, 7:1 ratio minimum)
- ✅ Focus management and indicators
- ✅ Live region announcements (aria-live="polite")
- ✅ Semantic HTML structure
- ✅ Aria labels on all icons/images
- ✅ Form inputs with explicit labels
- ✅ Error messages announced in real-time

### Recommended Screen Readers

- **Windows:** JAWS (preferred), NVDA (free)
- **Mac:** VoiceOver (built-in, press Cmd+F5)
- **Linux:** Orca

---

## Feedback & Support

### Report an Issue

If something doesn't work:
1. Note the keyboard shortcut or voice command you used
2. Note the error message or behavior
3. Email: `team@technetra.dev` with details
4. Include: Browser, OS, screen reader, and what you were doing

### Request a Feature

Ideas for improvements? Tell us:
- What would make coding easier?
- What shortcuts would you like?
- What should Tech Netra say aloud?

---

## Quick Reference Card

### Essential Shortcuts
```
Alt+V  Voice controller toggle
Alt+G  Code generator (say what to make)
Alt+D  Debugger (paste error stack)
Alt+A  Visual co-pilot (UI audit)
Alt+H  Help (hear all shortcuts)
Alt+P  Cycle symbol verbosity
Alt+M  Motion mode toggle
Alt+T  Text size adjustment

↑/↓    Navigate code line-by-line
Alt+N  Jump to next function
Alt+B  Jump to previous function
```

### Voice Command Examples
```
"Take me to function login"
"Go to class User"
"Jump to line 75"
"Generate a function to sort an array"
"Explain this error"
"Add email validation to this file"
```

---

## Welcome!

You're now ready to code with **Tech Netra**. 

**Remember:** Tech Netra is built *by* and *for* blind and low-vision developers. Every feature prioritizes accessibility and keyboard navigation.

**Let's code! 🚀**

Press **Alt+H** anytime to hear help, or **Alt+V** to start dictating.

---

*Tech Netra v1.0 — Voice-First Codebase Assistant for Visually Impaired Developers*  
*Powered by Anthropic Claude | Built with accessibility-first principles*
