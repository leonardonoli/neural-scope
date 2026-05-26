# Neural Scope — Transformer Internals Visualizer

Watch a transformer think in real time.

Chat with a small language model (GPT-2) and see every internal operation live:
- **Tokenizer** — how your text is split into sub-word tokens
- **Token probabilities** — the full distribution over vocabulary at every generation step
- **Attention** — which tokens each layer/head focuses on when generating each word
- **Embedding space** — *(phase 3)* where words live geometrically

No black boxes. The model is fully open — we own every layer, every weight, every hook.

## Why GPT-2?

GPT-2 is small enough to run on CPU, old enough to be fully open, and structurally identical to modern transformers. The attention heads, the residual stream, the layer norm — it's all there. Bigger models are just more of the same.

## Running

**Backend** (Python / FastAPI):
```bash
cd backend
source .venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

**Frontend** (Next.js):
```bash
cd frontend
npm run dev -- --port 3099
```

Open: http://localhost:3099

The model downloads automatically on first run (~500MB).

## Architecture

```
Browser (Next.js)
  └── WebSocket ws://localhost:8000/generate
        └── FastAPI + HuggingFace transformers
              ├── forward hooks → attention weights (12 layers × 12 heads)
              ├── logits → token probability distribution
              └── KV cache → efficient token-by-token streaming
```

## Roadmap

- [x] Phase 1 — tokenizer + streaming + probability chart
- [x] Phase 2 — attention heatmap (layer/head scrubber)
- [ ] Phase 3 — embedding space (UMAP projection)
- [ ] Phase 4 — beam search visualization, sampling controls
- [ ] Phase 5 — layer residual stream visualization
