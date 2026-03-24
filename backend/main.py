"""
LumenAI — FastAPI Backend Server
Wraps the existing core/ fact-checking pipeline with REST + WebSocket APIs.
"""

import sys
import os
import json
import uuid
import asyncio
import base64
from datetime import datetime
from typing import Optional
from pathlib import Path

# Add project root to path so we can import core modules
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(PROJECT_ROOT / ".env")

from core.pipeline import run_pipeline
from core.storage import load_history, save_history

app = FastAPI(title="LumenAI API", version="1.0.0")

# CORS — allow Vercel + local dev
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Also allow any *.vercel.app origin via environment variable
VERCEL_URL = os.getenv("VERCEL_URL", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
if VERCEL_URL:
    ALLOWED_ORIGINS.append(f"https://{VERCEL_URL}")
if FRONTEND_URL:
    ALLOWED_ORIGINS.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for active pipeline sessions
pipeline_sessions = {}  # session_id -> {"status": ..., "result": ..., "logs": [...]}
pipeline_websockets = {}  # session_id -> [websocket, ...]


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "LumenAI"}


@app.get("/api/history")
async def get_history():
    """Return all past session results."""
    history = load_history()
    return history


@app.get("/api/history/{session_id}")
async def get_history_item(session_id: str):
    """Return a single session result by ID."""
    history = load_history()
    for item in history:
        if item.get("session_id") == session_id:
            return item
    raise HTTPException(status_code=404, detail="Session not found")


@app.get("/api/result/{session_id}")
async def get_result(session_id: str):
    """Return pipeline result for a session (from memory or history)."""
    if session_id in pipeline_sessions:
        session = pipeline_sessions[session_id]
        return {
            "status": session["status"],
            "result": session.get("result"),
            "logs": session.get("logs", []),
        }
    # Try history
    history = load_history()
    for item in history:
        if item.get("session_id") == session_id:
            return {"status": "complete", "result": item, "logs": []}
    raise HTTPException(status_code=404, detail="Session not found")


@app.post("/api/verify")
async def verify_claims(
    input_text: str = Form(""),
    input_url: str = Form(""),
    max_claims: int = Form(20),
    depth: str = Form("standard"),
    sources_per_claim: int = Form(5),
    min_source_quality: int = Form(2),
    pdf_file: Optional[UploadFile] = File(None),
):
    """Start a fact-check pipeline. Returns session_id immediately."""
    session_id = str(uuid.uuid4())[:8]

    pdf_bytes = b""
    if pdf_file:
        pdf_bytes = await pdf_file.read()

    if not input_text.strip() and not input_url.strip() and not pdf_bytes:
        raise HTTPException(status_code=400, detail="No input provided")

    pipeline_sessions[session_id] = {
        "status": "running",
        "result": None,
        "logs": [],
        "stop_requested": False,
    }

    # Run pipeline in background thread (it's synchronous)
    asyncio.get_event_loop().run_in_executor(
        None,
        _run_pipeline_sync,
        session_id, input_text, input_url, pdf_bytes,
        max_claims, depth, sources_per_claim, min_source_quality,
    )

    return {"session_id": session_id, "status": "started"}


def _run_pipeline_sync(
    session_id, input_text, input_url, pdf_bytes,
    max_claims, depth, sources_per_claim, min_source_quality
):
    """Runs the pipeline synchronously in a thread, pushing updates via WebSocket."""
    
    def progress_callback(stage, message, pct):
        log_entry = {
            "stage": stage,
            "message": message,
            "pct": pct,
            "timestamp": datetime.now().isoformat(),
        }
        if session_id in pipeline_sessions:
            pipeline_sessions[session_id]["logs"].append(log_entry)

        # Send via WebSocket (fire and forget)
        if session_id in pipeline_websockets:
            for ws_loop_pair in pipeline_websockets[session_id]:
                ws, loop = ws_loop_pair
                try:
                    asyncio.run_coroutine_threadsafe(
                        ws.send_json(log_entry), loop
                    )
                except Exception:
                    pass

    def stop_check():
        if session_id in pipeline_sessions:
            return pipeline_sessions[session_id].get("stop_requested", False)
        return False

    try:
        result = run_pipeline(
            input_text=input_text,
            input_url=input_url,
            input_pdf_bytes=pdf_bytes,
            max_claims=max_claims,
            depth=depth,
            sources_per_claim=sources_per_claim,
            min_source_quality=min_source_quality,
            progress_callback=progress_callback,
            stop_check=stop_check,
        )

        if session_id in pipeline_sessions:
            pipeline_sessions[session_id]["status"] = "complete"
            pipeline_sessions[session_id]["result"] = result

        # Save to history
        history = load_history()
        history.append(result)
        save_history(history)

        # Notify WebSocket clients of completion
        completion_msg = {"stage": "complete", "message": "Pipeline complete.", "pct": 100, "result": result}
        if session_id in pipeline_websockets:
            for ws_loop_pair in pipeline_websockets[session_id]:
                ws, loop = ws_loop_pair
                try:
                    asyncio.run_coroutine_threadsafe(
                        ws.send_json(completion_msg), loop
                    )
                except Exception:
                    pass

    except Exception as e:
        if session_id in pipeline_sessions:
            pipeline_sessions[session_id]["status"] = "error"
            pipeline_sessions[session_id]["error"] = str(e)

        error_msg = {"stage": "error", "message": str(e), "pct": 0}
        if session_id in pipeline_websockets:
            for ws_loop_pair in pipeline_websockets[session_id]:
                ws, loop = ws_loop_pair
                try:
                    asyncio.run_coroutine_threadsafe(
                        ws.send_json(error_msg), loop
                    )
                except Exception:
                    pass


@app.websocket("/ws/pipeline/{session_id}")
async def websocket_pipeline(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time pipeline progress."""
    await websocket.accept()
    loop = asyncio.get_event_loop()

    if session_id not in pipeline_websockets:
        pipeline_websockets[session_id] = []
    pipeline_websockets[session_id].append((websocket, loop))

    # Send any existing logs
    if session_id in pipeline_sessions:
        for log in pipeline_sessions[session_id]["logs"]:
            await websocket.send_json(log)

    try:
        while True:
            # Keep connection alive, listen for stop commands
            data = await websocket.receive_text()
            if data == "stop":
                if session_id in pipeline_sessions:
                    pipeline_sessions[session_id]["stop_requested"] = True
    except WebSocketDisconnect:
        if session_id in pipeline_websockets:
            pipeline_websockets[session_id] = [
                pair for pair in pipeline_websockets[session_id] if pair[0] != websocket
            ]


@app.post("/api/stop/{session_id}")
async def stop_pipeline(session_id: str):
    """Request to stop a running pipeline."""
    if session_id in pipeline_sessions:
        pipeline_sessions[session_id]["stop_requested"] = True
        return {"status": "stop_requested"}
    raise HTTPException(status_code=404, detail="Session not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
