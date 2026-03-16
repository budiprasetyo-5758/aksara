"""
AKSARA RSCM — FastAPI Main Application
Entry point for the backend API server.

Run with:
    cd backend
    uvicorn main:app --reload --port 8000
"""

# Must be set BEFORE any transformers/sentence_transformers import
import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import documents, chat, sessions

app = FastAPI(
    title="AKSARA RSCM API",
    description="Asisten Pencarian Sumber Data — RAG Backend for RSCM Hospital",
    version="1.0.0",
)

# ── CORS Middleware ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ────────────────────────────────────
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(sessions.router)


@app.get("/")
async def root():
    return {
        "name": "AKSARA RSCM API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
