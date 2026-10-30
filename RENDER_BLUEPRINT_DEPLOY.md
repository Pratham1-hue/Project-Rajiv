# Deploy to Render Using Blueprint (Easiest Way)

## What is Render Blueprint?

**Render Blueprint** is the easiest way to deploy your app. Instead of clicking through the UI, Render reads your `render.yaml` file and deploys automatically.

---

## Step 1: Push to GitHub (Already Done ✅)

Your code is already on GitHub:
- Repository: https://github.com/Pratham1-hue/Project-Rajiv
- Branch: main
- `render.yaml` included

---

## Step 2: Deploy on Render (3 minutes)

### Option A: Using Render Dashboard (Easiest)

1. Go to https://render.com
2. Sign up with GitHub (authorize repo access)
3. Click **Dashboard** → **New** → **Blueprint**
4. Select your GitHub repository: `Project-Rajiv`
5. Render auto-reads `render.yaml` and shows deployment plan
6. Review the configuration:
   - Service: `tech-netra-backend`
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Click **Create Blueprint** → **Deploy**
8. Wait 3-5 minutes for build ✅

### Option B: Using Render CLI (For Developers)

```bash
# Install Render CLI
npm install -g @render-oss/render-cli

# Login
render login

# Deploy from project directory
cd D:\Machine Learning Projects\Project Rajiv
render deploy
```

---

## Step 3: Set Environment Variables

After deployment starts, Render asks for secrets:

### Critical: Add Your API Key

1. In Render Dashboard → Your Service → **Environment**
2. Add these variables:

```
ANTHROPIC_API_KEY = sk-ant-xxxxxxxx...
(copy from your backend/.env file)
```

The other variables are already in `render.yaml`:
- `ANTHROPIC_MODEL` = `claude-haiku-5-5`
- `ALLOWED_ORIGINS` = `https://tech-netra.vercel.app`
- `ALLOWED_ORIGIN_REGEX` = `https://.*\.vercel\.app`

---

## Step 4: Wait for Deployment

Monitor the build:
1. Render Dashboard → Your Service → **Logs**
2. Watch for:
   - "Starting server process" = ✅ Success
   - "Application startup complete" = ✅ Ready
   - Any error messages = ⚠️ Check below

---

## Step 5: Get Your Backend URL

When deployment completes:
1. Copy your Render service URL (e.g., `https://tech-netra-abc123.onrender.com`)
2. Test it: Open `https://tech-netra-abc123.onrender.com/health` in browser
3. Should show: `{"status": "ok"}`

---

## Step 6: Deploy Frontend on Vercel

Now that backend is running:

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click **New Project** → Import `Project-Rajiv`
4. Before deploying, set environment variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://tech-netra-abc123.onrender.com` (your Render URL)
5. Click **Deploy**
6. Wait 2-3 minutes

---

## Step 7: Verify Everything Works

Visit your Vercel URL and test:
- [ ] Page loads without errors
- [ ] Alt+U (file upload) works
- [ ] Alt+G (code generator) works
- [ ] Alt+M (microphone) works
- [ ] Typing in editor works
- [ ] Code generation returns results

---

## Troubleshooting

### "Build Failed" on Render

**Check logs** in Render Dashboard:
- Look for error messages
- Common: `ANTHROPIC_API_KEY` not set
- Solution: Add it in Environment variables

### "Cannot reach backend" from Frontend

**Fix**:
1. Check Vercel `NEXT_PUBLIC_API_URL` is correct
2. Test Render health endpoint directly
3. Verify Render service status is "Live" (green)

### "Application startup failed"

**Check**:
- `ANTHROPIC_API_KEY` is valid (not expired)
- All Python dependencies installed
- Backend logs for specific errors

### Port Already in Use (Local Testing)

```bash
# Kill process on port 8000
taskkill /F /IM python.exe
```

---

## What's Inside `render.yaml`

```yaml
services:
  - type: web                    # Web service (not worker/cron)
    name: tech-netra-backend     # Service name in Render
    env: python                  # Runtime: Python
    plan: free                   # Free tier
    buildCommand: pip install -r requirements.txt  # Install dependencies
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    workingDirectory: ./backend  # Where to run (has main.py, requirements.txt)
    envVars:                     # Environment variables
      - ANTHROPIC_API_KEY        # You'll set this manually (secret)
      - ANTHROPIC_MODEL: claude-haiku-5-5
      - ALLOWED_ORIGINS: URLs allowed to call this API
      - ALLOWED_ORIGIN_REGEX: Pattern for preview deployments
```

---

## Benefits of Blueprint

✅ **One-click deploy** - Render reads config, no manual setup  
✅ **Reproducible** - Same config every time  
✅ **Version controlled** - `render.yaml` in GitHub  
✅ **Easy updates** - Push to GitHub, Render auto-redeploys  
✅ **Multiple environments** - Can have staging/prod configs  

---

## After Deployment

### Keep Backend Awake

Render free tier spins down after 15 minutes. Keep it warm:

**Option 1: UptimeRobot (Free)**
- Go to https://uptimerobot.com
- Add monitor: `https://your-render-url/health`
- Interval: 5 minutes
- Done! Backend stays active

**Option 2: Upgrade to Paid ($7/month)**
- Render → Pricing
- Select "Standard" plan
- Backend always running

### Monitor Usage

1. Render Dashboard → Your Service → **Metrics**
2. Check:
   - CPU usage
   - Memory usage
   - Request count
   - Error rate

---

## Success Checklist

- [ ] Code pushed to GitHub ✅
- [ ] `render.yaml` file exists ✅
- [ ] Create Blueprint on Render
- [ ] Set `ANTHROPIC_API_KEY` env variable
- [ ] Wait for build to complete
- [ ] Test `/health` endpoint
- [ ] Set `NEXT_PUBLIC_API_URL` on Vercel
- [ ] Test frontend on Vercel
- [ ] All features working
- [ ] Set up UptimeRobot (optional)

---

## Command Cheat Sheet

```bash
# Test locally first (no deploy)
cd backend
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Push to GitHub (triggers Render if configured)
git add -A
git commit -m "Deploy message"
git push origin main

# Check deployment status
# Go to: https://render.com/dashboard → Your Service → Logs
```

---

## Support

- **Render Docs**: https://render.com/docs
- **Blueprint Docs**: https://render.com/docs/deploy-an-app
- **GitHub Integration**: https://render.com/docs/github

---

## Next Steps

1. Go to Render Dashboard
2. Click **New** → **Blueprint**
3. Select **Project-Rajiv**
4. Review and click **Deploy**
5. Wait 5 minutes
6. Set `ANTHROPIC_API_KEY`
7. Deploy frontend on Vercel
8. Test everything

**You're done!** 🚀

---

**Time to production: ~10 minutes total**

Frontend + Backend both live on free tier!
