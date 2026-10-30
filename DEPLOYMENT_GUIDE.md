# Tech Netra - Production Deployment Guide

## 🚀 Ready for Launch!

Your Tech Netra application is complete and ready to deploy. This guide will walk you through deploying to Vercel (frontend) and Render (backend).

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Frontend (Vercel)                 │
│   Next.js + React + TypeScript       │
│   URL: tech-netra.vercel.app        │
└──────────────┬──────────────────────┘
               │ HTTPS API calls
               ↓
┌─────────────────────────────────────┐
│   Backend (Render)                  │
│   FastAPI + Python                  │
│   URL: tech-netra.onrender.com      │
│   Uses: Anthropic Claude API        │
└─────────────────────────────────────┘
```

---

## Prerequisites

✅ GitHub account with your code pushed  
✅ Vercel account (free - sign up at vercel.com)  
✅ Render account (free - sign up at render.com)  
✅ Anthropic API key (already in your backend/.env)  

---

## Part 1: Deploy Backend (Render) - Takes ~5 minutes

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up (GitHub login recommended)
3. Create new account

### Step 2: Create Web Service
1. Dashboard → **New +** → **Web Service**
2. Connect your GitHub repository
   - Select: `Pratham1-hue/Project-Rajiv`
   - Leave default (Render auto-detects FastAPI)
3. Configure:
   - **Name**: `tech-netra-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Region**: Choose closest to you
   - **Plan**: Free (for MVP)

### Step 3: Set Environment Variables
In Render dashboard → Service Settings → Environment:

Add these variables:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx... (copy from your backend/.env)
ANTHROPIC_MODEL=claude-haiku-5-5
ALLOWED_ORIGINS=https://tech-netra.vercel.app,https://*.vercel.app
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
```

### Step 4: Deploy
- Click **Deploy**
- Wait for build to complete (3-5 minutes)
- Copy the live URL when ready: `https://tech-netra-abc123.onrender.com`
- ✅ Test health endpoint: `https://tech-netra-abc123.onrender.com/health`

### Step 5: Keep Backend Awake (Important!)
Render free tier spins down after 15 minutes of inactivity. To prevent:
1. Set up Render Cron Job (paid) OR
2. Use external uptime monitor (UptimeRobot - free)

**UptimeRobot Setup (Recommended)**:
- Go to https://uptimerobot.com
- Create account
- Add new monitor:
  - URL: Your Render backend health endpoint
  - Interval: 5 minutes
  - Gets: `200 OK`
- ✅ Backend stays active

---

## Part 2: Deploy Frontend (Vercel) - Takes ~3 minutes

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Grant repository access

### Step 2: Import Project
1. Dashboard → **New Project**
2. Import from GitHub → Select `Project-Rajiv`
3. Auto-detects Next.js ✅

### Step 3: Configure Environment
Before deploying, set environment variable:

In Vercel project settings → Environment Variables:

Add:
```
NEXT_PUBLIC_API_URL=https://tech-netra-abc123.onrender.com
```
(Replace `tech-netra-abc123` with your actual Render URL)

### Step 4: Deploy
- Click **Deploy**
- Wait for build (2-3 minutes)
- Get live URL: `https://tech-netra.vercel.app`
- ✅ Visit and test the app!

---

## Part 3: Testing Live Deployment

### Health Checks
```bash
# Backend health
curl https://tech-netra-abc123.onrender.com/health

# Frontend loads
https://tech-netra.vercel.app
```

### Feature Tests
1. **Upload File** (Alt+U)
   - Upload a Python/JS file
   - Verify code loads

2. **Code Generator** (Alt+G)
   - Type a prompt
   - Press "Generate & Read Summary"
   - Verify Claude responds

3. **Voice Input** (Alt+G → Alt+M)
   - Click microphone or press Alt+M
   - Speak a prompt
   - Verify text appears

4. **Vibe Code** (Alt+B)
   - Select a vibe
   - Generate code
   - Verify output style matches vibe

5. **Editor Editing**
   - Type in code editor
   - Changes save immediately
   - Structure outline updates

### CORS Testing
If you see CORS errors in browser console:
1. Check `ALLOWED_ORIGINS` in Render env vars
2. Make sure Vercel URL is exact match
3. Test health endpoint directly

---

## Part 4: Custom Domain (Optional)

### Vercel Custom Domain
1. Vercel Dashboard → Project Settings → Domains
2. Add custom domain (requires DNS setup)
3. Verify DNS records

### Render Custom Domain
1. Render Dashboard → Service Settings → Custom Domain
2. Add domain
3. Update DNS CNAME record

---

## Troubleshooting

### "502 Bad Gateway" from Frontend
**Cause**: Backend URL incorrect or backend down
- ✅ Check `NEXT_PUBLIC_API_URL` in Vercel env vars
- ✅ Test backend health endpoint directly
- ✅ Verify CORS headers in Render

### "Cannot reach backend"
**Cause**: CORS blocked or API URL wrong
- ✅ Open browser DevTools → Network
- ✅ Check preflight request (OPTIONS)
- ✅ Verify response has `Access-Control-Allow-Origin`

### Render Backend Spins Down
**Solution**: Set up UptimeRobot (5-minute health check)
- Free account at uptimerobot.com
- Pings backend every 5 minutes
- Keeps it warm

### Files Not Uploading
**Cause**: Backend file size limit
- Check `backend/app/routes/file_upload_routes.py` line with `max_size`
- Default is 5 MB
- Increase if needed

### Voice Input Not Working
**Cause**: Browser doesn't support Web Speech API
- Works: Chrome, Edge, Safari
- Firefox: Limited support
- Use text input as fallback

---

## Production Best Practices

### Security
✅ Keep `ANTHROPIC_API_KEY` in environment variables only  
✅ Never commit `.env` file  
✅ Use HTTPS (automatic on Vercel/Render)  
✅ Set CORS to specific domains  
✅ Validate file uploads (type, size)  

### Performance
✅ Enable caching in Vercel settings  
✅ Use CDN (Vercel does this by default)  
✅ Monitor backend response times  
✅ Set up error tracking (Sentry)  

### Monitoring
✅ Set up email alerts on Render  
✅ Monitor API costs on Anthropic console  
✅ Track user feedback  
✅ Review error logs weekly  

---

## Environment Variables Reference

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://tech-netra-xxx.onrender.com
```

### Backend (Render)
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx...
ANTHROPIC_MODEL=claude-haiku-5-5
ALLOWED_ORIGINS=https://tech-netra.vercel.app
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
```

---

## Post-Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Backend health endpoint responds (200 OK)
- [ ] Frontend deployed to Vercel
- [ ] Frontend loads without errors
- [ ] CORS working (no browser errors)
- [ ] File upload works
- [ ] Code generator returns Claude responses
- [ ] Voice input captures text correctly
- [ ] Vibe code generates with different styles
- [ ] Line numbers visible in editor
- [ ] Editable editor allows typing
- [ ] All keyboard shortcuts work
- [ ] Mobile responsive layout works
- [ ] Screen reader announcements work
- [ ] UptimeRobot monitors backend

---

## Support & Updates

### Check Deployment Status
- **Vercel**: Deployments → Vercel Dashboard
- **Render**: Service → Logs

### Update Code
1. Push changes to GitHub
2. Vercel auto-redeploys on push (if configured)
3. Render auto-redeploys on push (if configured)

### Scale Up Later
- **More users?** Upgrade Vercel/Render plan
- **Higher API costs?** Monitor Anthropic usage
- **Custom domain?** Add in service settings

---

## Success! 🎉

Your Tech Netra is now live!

**Frontend**: https://tech-netra.vercel.app  
**Backend**: https://tech-netra-xxx.onrender.com  

Share the URL and start using voice-first code assistance!

---

## Questions?

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Anthropic API Docs**: https://docs.anthropic.com
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Next.js Docs**: https://nextjs.org/docs

**Happy coding! 🚀**
