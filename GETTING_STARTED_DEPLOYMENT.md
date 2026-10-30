# 🚀 Tech Netra - Getting Started with Deployment

**Welcome!** Your Tech Netra app is complete and ready to deploy. This is a quick guide to get you live in ~10 minutes.

---

## What You'll Get After Deployment

✅ **Live Frontend**: https://tech-netra.vercel.app  
✅ **Live Backend**: https://tech-netra-xxx.onrender.com  
✅ **Working Features**: File upload, voice code gen, vibe code, editing  
✅ **Accessible**: Keyboard + voice + screen reader support  

---

## Prerequisites (Have These Ready)

1. **GitHub Account** - Already done (https://github.com/Pratham1-hue/Project-Rajiv)
2. **Vercel Account** - Sign up free at https://vercel.com
3. **Render Account** - Sign up free at https://render.com
4. **Anthropic API Key** - Already in your `backend/.env`

---

## The 10-Minute Deployment Plan

### Step 1: Get Your Anthropic API Key (1 min)
```bash
# It's already in your backend/.env file:
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
# Copy this value - you'll need it soon
```

### Step 2: Deploy Backend on Render (5 min)

1. Go to **https://render.com** and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repo (click "Connect account")
4. Select `Project-Rajiv`
5. Fill in:
   - **Name**: `tech-netra-backend`
   - **Region**: Your closest region
   - **Plan**: Free
6. Click **Create Web Service** (stays on deployment page)
7. While deploying, click **Environment** (left menu)
8. Add 4 environment variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxx... (from your .env)
   ANTHROPIC_MODEL=claude-haiku-5-5
   ALLOWED_ORIGINS=https://tech-netra.vercel.app
   ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
   ```
9. Wait for green "Live" status (3-5 min)
10. **Copy your URL** like: `https://tech-netra-abc123.onrender.com`

### Step 3: Deploy Frontend on Vercel (3 min)

1. Go to **https://vercel.com** and sign up with GitHub
2. Click **New Project**
3. Find and import `Project-Rajiv`
4. Before clicking Deploy, go to **Environment Variables**
5. Add one variable:
   ```
   NEXT_PUBLIC_API_URL=https://tech-netra-abc123.onrender.com
   (Use the Render URL you just copied)
   ```
6. Click **Deploy** and wait (2-3 min)
7. When done, click the live URL 🎉

### Step 4: Test It Works (2 min)

Open your Vercel URL and:
1. Try uploading a file (Alt+U)
2. Try generating code (Alt+G)
3. Try vibe code (Alt+B)
4. Try typing in the editor

All working? **You're done! 🎉**

---

## If Something Goes Wrong

### "Cannot reach backend" Error
**Solution**: 
1. Check Render URL in Vercel env var is correct
2. Test Render health: `https://your-render-url/health`
3. Verify Render status shows "Live" (green)

### Render shows "Build failed"
**Solution**:
1. Check Render logs (click Service → Logs)
2. Verify `ANTHROPIC_API_KEY` is set
3. Try restarting: Service → Manual Deploy

### Voice input doesn't work
**Solution**:
1. Only works in Chrome/Edge/Safari
2. Type prompt manually as backup
3. All other features still work

---

## Optional: Keep Backend Awake (Free)

Render free tier shuts down after 15 min of no traffic. To prevent:

1. Go to **https://uptimerobot.com**
2. Sign up (free)
3. Add monitor:
   - URL: `https://your-render-url/health`
   - Interval: 5 minutes
4. Done! Backend stays warm 24/7

---

## Next Steps

✅ **Deployment done?**

1. **Share your link** - Everyone can use it now!
2. **Collect feedback** - What do users think?
3. **Monitor usage** - Check Render logs weekly
4. **Plan updates** - What features next?

---

## Documentation (Read Later)

| Document | When to Read |
|----------|---|
| `USER_GUIDE.md` | How to use all features |
| `DEPLOYMENT_GUIDE.md` | If you need full details |
| `CODE_GENERATOR_VS_VIBE_CODE.md` | Understand the difference |
| `FINAL_SUMMARY.md` | Project overview |

---

## Key Shortcuts (Share With Users)

| Shortcut | What It Does |
|----------|---|
| **Alt+U** | Upload code file |
| **Alt+G** | Generate code (type or speak) |
| **Alt+M** | Use microphone (in code gen) |
| **Alt+B** | Generate with vibe/style |
| **Alt+H** | Show all shortcuts |

---

## Success Checklist

- [ ] Vercel account created
- [ ] Render account created
- [ ] Backend deployed on Render
- [ ] Backend environment vars set
- [ ] Frontend deployed on Vercel
- [ ] Frontend API URL set
- [ ] Page loads without errors
- [ ] File upload works
- [ ] Code generation works
- [ ] All features working
- [ ] UptimeRobot set up (optional)

---

## Troubleshooting Quick Links

- **Build errors?** Check Render/Vercel logs
- **Slow response?** Render free tier, consider upgrade
- **API errors?** Verify ANTHROPIC_API_KEY is valid
- **CORS issues?** Check ALLOWED_ORIGINS in Render env

---

## You're Now Live! 🎉

**Frontend**: https://tech-netra.vercel.app  
**Backend**: https://tech-netra-xxx.onrender.com  

Share the link and let users experience voice-first code assistance!

---

## Questions?

1. Check `README.md` for project overview
2. Check `USER_GUIDE.md` for feature details
3. Check `DEPLOYMENT_GUIDE.md` for deep dive
4. Visit GitHub for issues: https://github.com/Pratham1-hue/Project-Rajiv

---

**Happy deploying! 🚀**

*Tech Netra: Making code accessible to everyone, one voice command at a time.* 🎤✨
