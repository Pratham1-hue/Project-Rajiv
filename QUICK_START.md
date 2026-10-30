# Tech Netra - Quick Start Guide (5 Minutes)

Get Tech Netra running in under 5 minutes with these 3 simple steps.

---

## Step 1: Set Up Your Anthropic API Key (1 minute)

**You have:** Your Anthropic API key (e.g., `sk-ant-...`)

**Action:**

```bash
# Navigate to the backend folder
cd backend

# Create the .env file with your key
# On Windows:
echo ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE > .env
echo ANTHROPIC_MODEL=claude-haiku-5-5 >> .env

# On Mac/Linux:
echo "ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE" > .env
echo "ANTHROPIC_MODEL=claude-haiku-5-5" >> .env
```

**Verify:**
```bash
cat .env  # Should show your key
```

---

## Step 2: Start the Backend (1 minute)

**From the `backend` folder:**

```bash
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Expected output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Verify it's running:**
```bash
# In another terminal
curl http://127.0.0.1:8000/health
# Should return: {"status":"ok"}
```

---

## Step 3: Start the Frontend (2 minutes)

**In a new terminal, from the `frontend` folder:**

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js
- Local:         http://localhost:3000
✓ Ready in 852ms
```

**Open your browser to:**
```
http://localhost:3000
```

---

## You're Done! 🎉

### Test It

1. **Dismiss the splash screen** - Press any key
2. **Try these features:**

   **Voice Navigation:**
   - Press **Alt+V** to enable voice
   - Say: "Go to function openStringAtLineStart"
   - It jumps to that function and reads it aloud
   
   **Code Generation:**
   - Press **Alt+G** to open code generator
   - Say: "Write a function to calculate factorial"
   - Claude generates code in seconds
   
   **Debugging:**
   - Press **Alt+D** to open debugger
   - Paste an error stack trace
   - Get explanation and suggested fix

3. **Try uploading a file:**
   - Create a simple Python file: `hello.py`
   - Press **Alt+U** to upload (when implemented in UI)
   - File loads into editor

---

## Keyboard Shortcuts Cheat Sheet

| Key | Action |
|-----|--------|
| **Alt+V** | Voice controller toggle |
| **Alt+G** | Code generator |
| **Alt+D** | Debugger |
| **Alt+A** | Visual co-pilot |
| **Alt+H** | Help & shortcuts |
| **Alt+U** | Upload file |
| **↑/↓** | Navigate code |
| **Alt+N** | Next function |
| **Alt+B** | Previous function |

---

## Troubleshooting

### "Backend won't start"
```bash
# Check if port 8000 is in use
netstat -ano | grep 8000

# Kill the process if needed
taskkill /F /PID <PID>

# Try again
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### "Frontend shows 502 error"
- Make sure backend is running on port 8000
- Check that your `.env` has the API key
- Wait 5 seconds for the frontend to reconnect

### "Claude isn't generating code"
1. Check the `.env` file has your API key
2. Restart the backend after adding the key
3. Check `http://127.0.0.1:8000/health` returns 200

### "I can't hear anything"
1. Check system volume is on
2. Check browser volume isn't muted
3. Press **Alt+V** to toggle voice controller
4. Try **Alt+H** to test (it should read help aloud)

---

## Next Steps

After everything is working:

1. **Read the USER GUIDE:** `USER_GUIDE.md` - All features explained
2. **Explore new features:** `FEATURES_SETUP.md` - Voice navigation, file upload, vibe code
3. **Deploy:** `DEPLOYMENT.md` - Instructions for Render + Vercel

---

## Cost Summary

- **Model:** Claude Haiku 5.5 (cheapest Claude model)
- **Input:** $0.80 per 1M tokens
- **Output:** $4.00 per 1M tokens
- **Per request:** ~0.0001¢ (fractions of a cent)
- **Monthly budget:** ~$1-5 for heavy daily use

---

## What's Included

✅ Voice navigation ("take me to function X")  
✅ File upload (Python, JS, Java, C++)  
✅ Vibe code (context-aware generation)  
✅ Code debugging with Claude  
✅ Visual UI auditing  
✅ Fully keyboard accessible  
✅ Screen reader optimized  
✅ All powered by Claude Haiku  

---

## Architecture

```
┌─────────────────┐
│   Browser       │
│  (Next.js)      │
│   Port 3000     │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  Backend        │
│  (FastAPI)      │
│  Port 8000      │
└────────┬────────┘
         │ API Key
         ↓
┌─────────────────┐
│  Anthropic      │
│  Claude API     │
│  claude-haiku   │
└─────────────────┘
```

---

## Common Commands

```bash
# Start backend
cd backend && py -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Start frontend (in new terminal)
cd frontend && npm run dev

# Run backend tests
cd backend && py test_api.py

# Build for production
cd frontend && npm run build

# Check TypeScript
cd frontend && npx tsc --noEmit
```

---

## Support

- **Report an issue:** Check browser console (F12)
- **Read documentation:** See `USER_GUIDE.md` and `FEATURES_SETUP.md`
- **Check logs:** Backend prints to console, frontend logs in browser console

---

## You're All Set! 🚀

Start coding with Tech Netra!

```
Press Alt+V to start speaking.
Say: "Take me to function something"
Or: "Generate a function to do something"
Or: "Explain this error"
```

**Happy accessible coding!**

---

*Tech Netra v1.0 - Voice-First Codebase Assistant for Visually Impaired Developers*
