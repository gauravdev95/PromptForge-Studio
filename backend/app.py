"""PromptForge Studio — optional backend.
Serves the frontend + a real /api/compile endpoint (same engine as the browser).
No API key needed. Run from the project root:
    pip install -r backend/requirements.txt
    python backend/app.py
Then open http://localhost:8000
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from compiler import compile_prompt

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="PromptForge Studio", version="1.0.0")


class CompileRequest(BaseModel):
    intent: str
    model: str = "Claude 4 Sonnet (XML)"


class CompileResponse(BaseModel):
    user_intent: str
    target_model: str
    p0_draft: str
    p_final: str
    score: float
    latency_ms: float
    cost_inr: float
    mode: str
    results: list
    gradients: list


@app.get("/api/health")
def health():
    return {"ok": True, "app": "PromptForge Studio", "mode": "local", "cost_inr": 0}


@app.post("/api/compile", response_model=CompileResponse)
def compile_endpoint(req: CompileRequest):
    return compile_prompt(req.intent, req.model)


app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")


@app.get("/")
def index():
    return FileResponse(ROOT / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
