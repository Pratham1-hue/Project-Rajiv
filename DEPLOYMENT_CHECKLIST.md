# 🚀 Tech Netra - Quick Deployment Checklist

## Before You Deploy

- [ ] GitHub repository has all code pushed: https://github.com/Pratham1-hue/Project-Rajiv
- [ ] Anthropic API key ready (in `backend/.env`)
- [ ] Vercel account created (free - vercel.com)
- [ ] Render account created (free - render.com)

---

## Backend Deployment (Render) - ~5 minutes

### Create Backend
1. [ ] Go to https://render.com
2. [ ] Click **New** → **Web Service**
3. [ ] Connect GitHub → Select `Project-Rajiv`
4. [ ] Name: `tech-netra-backend`
5. [ ] Build Command: `pip install -r requirements.txt`
6. [ ] Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. [ ] Plan: **Free**
8. [ ] Click **Deploy** and wait 3-5 minutes

### Set Environment Variables (Render)
1. [ ] Service Settings → **Environment**
2. [ ] Add `ANTHROPIC_API_KEY` = your key from `backend/.env`
3. [ ] Add `ANTHROPIC_MODEL` = `claude-haiku-5-5`
4. [ ] Add `ALLOWED_ORIGINS` = `https://tech-netra.vercel.app,https://*.vercel.app`
5. [ ] Add `ALLOWED_ORIGIN_REGEX` = `https://.*\.vercel\.app`
6. [ ] **Save** and wait for redeploy

### Test Backend
1. [ ] Copy your Render URL (e.g., `https://tech-netra-abc.onrender.com`)
2. [ ] Test health: `https://tech-netra-abc.onrender.com/health`
3. [ ] Should see: `{"status": "ok"}`
4. [ ] **Save this URL** for frontend config

### Keep Backend Alive (Important!)
1. [ ] Go to https://uptimerobot.com
2. [ ] Sign up (free)
3. [ ] Add new monitor:
   - URL: Your Render health endpoint
   - Interval: 5 minutes
4. [ ] This prevents Render from shutting down your backend

---

## Frontend Deployment (Vercel) - ~3 minutes

### Create Frontend
1. [ ] Go to https://vercel.com
2. [ ] Sign up with GitHub (authorize repo access)
3. [ ] Click **New Project**
4. [ ] Import from GitHub → Search `Project-Rajiv`
5. [ ] Click **Import**
6. [ ] Framework: **Next.js** (auto-detected)

### Set Environment Variable
**This is critical - frontend won't connect to backend without this**

1. [ ] Project Settings → **Environment Variables**
2. [ ] Add new:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://tech-netra-abc.onrender.com` (your Render backend URL from above)
   - Environments: Select all (**Production**, **Preview**, **Development**)
3. [ ] Click **Save**

### Deploy
1. [ ] Click **Deploy**
2. [ ] Wait 2-3 minutes for build
3. [ ] Copy your Vercel URL (e.g., `https://tech-netra.vercel.app`)
4. [ ] Open URL in browser - should load without errors ✅

---

## Verify Deployment Works

### Quick Tests
1. [ ] Open https://tech-netra.vercel.app in browser
2. [ ] Page loads without errors
3. [ ] Header shows "TECH NETRA" title
4. [ ] Code editor appears with sample code

### Feature Tests
5. [ ] **File Upload** (Alt+U) - Upload a Python file
6. [ ] **Code Generator** (Alt+G) - Generate some code
7. [ ] **Voice Input** (Alt+M in Code Gen) - Try microphone (if supported)
8. [ ] **Vibe Code** (Alt+B) - Generate with different vibes
9. [ ] **Editor** - Click and type to edit code
10. [ ] **Line Numbers** - Visible on left side

### Backend Tests
11. [ ] Open browser DevTools (F12)
12. [ ] Go to **Network** tab
13. [ ] Try any feature
14. [ ] Look for API calls to your Render backend
15. [ ] Should see **200 OK** responses (no 502/503 errors)

---

## Troubleshooting

### "Cannot reach the Tech Netra backend"
- [ ] Check `NEXT_PUBLIC_API_URL` in Vercel is correct
- [ ] Verify Render backend is running (check logs)
- [ ] Test health endpoint directly in browser
- [ ] Check CORS headers in Render logs

### Backend shows "502 Bad Gateway"
- [ ] Check Render logs for startup errors
- [ ] Verify `ANTHROPIC_API_KEY` is set and valid
- [ ] Try restarting the Render service
- [ ] Check requirements.txt has all dependencies

### Voice input not working
- [ ] Your browser is Chrome/Edge/Safari (required for Web Speech)
- [ ] Type prompt manually as fallback
- [ ] Check browser console for errors (F12)

### File upload fails
- [ ] File size less than 5 MB
- [ ] File type: .py, .js, .jsx, .ts, .tsx, .java, .cpp, .c, .h
- [ ] Check backend logs for errors

---

## Success! 🎉

If you reach here with all checkmarks:

✅ **Frontend**: https://tech-netra.vercel.app  
✅ **Backend**: https://tech-netra-xxx.onrender.com  
✅ **All features working**  
✅ **Ready for users**  

---

## Optional: Custom Domain

### Add Domain to Vercel
1. [ ] Vercel Dashboard → Project → Settings → Domains
2. [ ] Enter your domain
3. [ ] Update DNS records (Vercel shows instructions)

### Add Domain to Render
1. [ ] Render Dashboard → Service → Custom Domain
2. [ ] Enter your domain
3. [ ] Add CNAME record to your DNS

---

## After Deployment

### Monitor
- [ ] Set up error tracking (Sentry - optional)
- [ ] Monitor Anthropic API usage (console.anthropic.com)
- [ ] Check Render logs weekly
- [ ] Monitor Vercel analytics

### Updates
- [ ] Any code changes? Push to GitHub
- [ ] Vercel auto-redeploys on push
- [ ] Render auto-redeploys on push (if enabled)

### Scaling
- [ ] More users? Upgrade Vercel/Render plan
- [ ] API costs? Monitor Anthropic usage
- [ ] Performance? Enable caching

---

## Support

📖 **Read Full Guide**: `DEPLOYMENT_GUIDE.md`  
🔗 **GitHub Repo**: https://github.com/Pratham1-hue/Project-Rajiv  
📞 **Vercel Support**: https://vercel.com/support  
📞 **Render Support**: https://render.com/support  

---

**You've got this! 🚀 Enjoy Tech Netra in production!**
