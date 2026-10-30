import os
from dotenv import load_dotenv

# Load local .env files for development. Deployed platforms inject env vars directly.
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes.ast_routes import router as ast_router
from app.routes.debug_routes import router as debug_router
from app.routes.codegen_routes import router as codegen_router
from app.routes.vision_routes import router as vision_router
from app.routes.user_routes import router as user_router
from app.routes.voice_navigation_routes import router as voice_nav_router
from app.routes.file_upload_routes import router as file_upload_router
from app.routes.vibe_code_routes import router as vibe_code_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    yield

# Also initialize immediately on module load
init_db()


app = FastAPI(
    title="Tech Netra: Voice-First Codebase Assistant Backend",
    description="Accessibility-first developer platform for visually impaired programmers with AST navigation, conversational debugging, and visual auditing.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS: set ALLOWED_ORIGINS to the deployed frontend URL(s), comma-separated.
# Defaults to "*" so a first deployment works without extra configuration.
def _cors_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "*")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["*"]


allowed_origins = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Optional regex, e.g. https://.*\.vercel\.app for preview deployments
    allow_origin_regex=os.environ.get("ALLOWED_ORIGIN_REGEX") or None,
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(ast_router)
app.include_router(debug_router)
app.include_router(codegen_router)
app.include_router(vision_router)
app.include_router(user_router)
app.include_router(voice_nav_router)
app.include_router(file_upload_router)
app.include_router(vibe_code_router)


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Tech Netra Voice-First Assistant API",
        "endpoints": [
            "/api/ast/parse-map",
            "/api/ast/sample",
            "/api/ast/parse",
            "/api/ast/symbols",
            "/api/ast/jump",
            "/api/ast/node-at-line",
            "/api/ast/voice-command",
            "/api/users",
            "/api/debug/explain",
            "/api/debug/query-variable",
            "/api/debug/apply-patch",
            "/api/codegen/generate",
            "/api/vision/audit"
        ]
    }


@app.get("/health")
def health():
    return {"status": "online"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
