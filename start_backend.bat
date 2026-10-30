@echo off
title Tech Netra - FastAPI Backend
echo Starting Tech Netra FastAPI Backend on port 8000...
cd backend
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause

