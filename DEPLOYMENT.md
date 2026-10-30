# Deploying Tech Netra

The fastest hackathon setup is two free services:

```
Browser
  ├── Next.js frontend  ->  Vercel   (https://your-app.vercel.app)
  └── FastAPI backend   ->  Render   (https://your-api.onrender.com)
```

The browser handles speech and audio. The backend only parses code, explains errors, generates code, and audits screenshots.

---

## 0. Put the project on GitHub

The project root is not currently a git repository, but `frontend/` has its own
create-next-app repository. Move that nested repository aside before creating a
single repository at the project root (the frontend work is uncommitted, so
nothing is lost):

```powershell
# From the project root
Move-Item .\frontend\.git "$env:TEMP\tech-netra-frontend-git-backup"

git init
git add .
git commit -m "Tech Netra hackathon MVP"
git branch -M main
```

Create an empty repository on GitHub, then:

```powershell
git remote add origin https://github.com/<your-username>/tech-netra.git
git push -u origin main
```

> If you prefer to keep the frontend repository separate, deploy `frontend/`
> to Vercel from that repository and create a second repository for `backend/`.

---

## 1. Deploy the backend to Render

1. Sign in at [render.com](https://render.com) and choose **New > Blueprint**.
2. Connect the GitHub repository. Render reads `render.yaml` and creates the
   `tech-netra-api` Python service.
3. After the service is created, open **Environment** and add
   `ANTHROPIC_API_KEY` if you want real AI code generation, debugging, and vision
   audits. Without it, the app still works with the built-in sample fallbacks.
4. Wait for the deploy, then open:

   ```
   https://<your-service>.onrender.com/health
   ```

   It should return `{"status":"online"}`.

If you prefer a manual service instead of the Blueprint:

- **New > Web Service**, connect the repo.
- **Root Directory:** `backend`
- **Runtime:** Python
- **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- Add the same environment variables.

### Free-tier behavior

Render's free web service sleeps after a period of inactivity. The first request
after sleeping can take 30–60 seconds. For a demo, open the app (or ping
`/health`) a few minutes before you present. A free uptime monitor can also ping
`/health` every 10 minutes.

SQLite data is ephemeral on the free tier and resets on redeploy. That is fine
for this MVP because the main preferences live in the browser's `localStorage`.
For persistent accounts, attach a Render disk or set `DATABASE_URL` to a
PostgreSQL database and install a PostgreSQL driver.

---

## 2. Deploy the frontend to Vercel

1. Sign in at [vercel.com](https://vercel.com) and choose **Add New > Project**.
2. Import the same GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Keep the detected framework as **Next.js**.
5. Add an environment variable:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<your-service>.onrender.com` |

   Add it for **Production**, **Preview**, and **Development**.
6. Click **Deploy**.

`NEXT_PUBLIC_API_URL` is compiled into the browser bundle, so changing it
requires a new deployment.

---

## 3. Lock down CORS (recommended after the first deploy)

The backend defaults to allowing every origin. Once you know the Vercel URL,
set this on the Render service:

```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

If you also use Vercel preview deployments, add the preview domain pattern as a
second rule:

```
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
```

Keep `ALLOWED_ORIGINS` set to your production URL; the regex adds previews on
top of it.

Redeploy the backend after changing environment variables.

---

## 4. Verify the deployed app

- Open `https://your-app.vercel.app`.
- The "Welcome to Tech Netra" splash should appear.
- Press **Start** (or any key) and confirm the sample code loads.
- Try **Alt + L**, **Alt + F**, and the arrow keys; speech should announce code
  symbols.
- Open the debugger with **Alt + D** and the code generator with **Alt + G**.
- Open the Visual Co-Pilot with **Alt + A**, attach a screenshot, and run the
  audit to exercise the Claude vision path. Without a screenshot, it returns
  the built-in layout check.
- Microphone dictation (**Alt + V**) requires HTTPS. Vercel provides HTTPS, so
  the browser will ask for microphone permission.

---

## Environment variables

### Backend (Render)

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | No | Enables Claude-backed codegen, debugging, and vision audit |
| `ANTHROPIC_MODEL` | No | Claude model ID; defaults to `claude-sonnet-5-5` |
| `ALLOWED_ORIGINS` | No | Comma-separated frontend origins; defaults to `*` |
| `ALLOWED_ORIGIN_REGEX` | No | Regex for preview origins, e.g. `https://.*\.vercel\.app` |
| `DATABASE_URL` | No | Defaults to SQLite; use PostgreSQL for persistence |
| `TECH_NETRA_WORKSPACE` | No | Location of the optional git sandbox |

Never put `ANTHROPIC_API_KEY` in the frontend or in a `NEXT_PUBLIC_` variable.

### Frontend (Vercel)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes (production) | Public URL of the Render backend |

---

## Local production test

Backend (native):

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or, if Docker Desktop is running:

```powershell
cd backend
docker build -t tech-netra-api .
docker run --rm -p 8000:8000 -e ANTHROPIC_API_KEY="<optional>" tech-netra-api
```

Frontend:

```powershell
cd frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm run build
npm start
```

Open `http://localhost:3000`.

---

## Demo-day checklist

- [ ] Backend `/health` is awake before presenting.
- [ ] Frontend loads the sample code and speaks line 1.
- [ ] `ANTHROPIC_API_KEY` is set if you are demoing generated code or vision audit.
- [ ] `ANTHROPIC_MODEL` matches a model available to your Anthropic account.
- [ ] Test on the venue Wi-Fi, not only your phone hotspot.
- [ ] Keep the local `start_backend.bat` + `start_frontend.bat` setup as a fallback.
- [ ] Use Chrome or Edge for the most reliable Web Speech voices.
- [ ] Have a screen reader (NVDA on Windows) ready if the judges want to see it.
