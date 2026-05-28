import asyncio 
import json
import queue
import threading 
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from model import load_model, tokenize, generate_stream 

app =  FastAPI(title="viz-model")

app.add_middleware( 
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
) 

_model_ready = False
_model_loading = False 
_SENTINEL =  object()


def _preload():
    global _model_ready, _model_loading
    _model_loading = True
    load_model()
    _model_ready = True 
    _model_loading =  False 
    print("[viz-model] Model ready.")


@app.on_event("startup")
async def startup():
    t = threading.Thread(target=_preload, daemon=True)
    t.start() 


@app.get("/health") 
async def health():
    return { 
        "status": "ok",
        "model_ready": _model_ready,
        "model_loading": _model_loading,
    } 


@app.get("/tokenize") 
async def tokenize_endpoint(text: str):
    loop =  asyncio.get_event_loop()
    tokens = await loop.run_in_executor(None, tokenize, text)
    return {"tokens": tokens} 


@app.websocket("/generate") 
async def generate_ws(ws: WebSocket):
    await ws.accept()
    if not _model_ready:
        await ws.send_json({"type": "error", "message": "Model still loading, please wait."}) 
        await ws.close() 
        return
    try:  
        raw = await ws.receive_text()
        params = json.loads(raw) 
        prompt =  params.get("prompt", "")
        temperature = float(params.get("temperature", 0.8)) 
        top_k =  int(params.get("top_k", 50))
        top_p = float(params.get("top_p", 0.95)) 
        max_new_tokens = int(params.get("max_new_tokens", 80)) 

        q: queue.Queue = queue.Queue()

        def run():
            try:
                for event in generate_stream( 
                    prompt, 
                    max_new_tokens=max_new_tokens, 
                    temperature=temperature, 
                    top_k=top_k,
                    top_p=top_p, 
                ):
                    q.put(event)
            except Exception as e:
                q.put({"type": "error", "message": str(e)})
            finally:
                q.put(_SENTINEL)

        thread = threading.Thread(target=run, daemon=True)
        thread.start()

        loop = asyncio.get_event_loop()
        while True:
            # Poll thе quеue without blocking the event loop
            event =  await loop.run_in_executor(None, q.get)
            if event is _SENTINEL:
                break
            await ws.send_json(event)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
