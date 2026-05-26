import asyncio
import json
import threading
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from model import load_model, tokenize, generate_stream

app = FastAPI(title="viz-model")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, load_model)
    print("[viz-model] Model loaded.")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/tokenize")
async def tokenize_endpoint(text: str):
    loop = asyncio.get_event_loop()
    tokens = await loop.run_in_executor(None, tokenize, text)
    return {"tokens": tokens}


@app.websocket("/generate")
async def generate_ws(ws: WebSocket):
    await ws.accept()
    try:
        raw = await ws.receive_text()
        params = json.loads(raw)
        prompt = params.get("prompt", "")
        temperature = float(params.get("temperature", 0.8))
        top_k = int(params.get("top_k", 50))
        top_p = float(params.get("top_p", 0.95))
        max_new_tokens = int(params.get("max_new_tokens", 80))

        loop = asyncio.get_event_loop()

        def run():
            for event in generate_stream(
                prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
            ):
                asyncio.run_coroutine_threadsafe(
                    ws.send_json(event), loop
                ).result(timeout=10)

        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        thread.join()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await ws.send_json({"type": "error", "message": str(e)})
