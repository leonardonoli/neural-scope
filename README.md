# Neural Scope — Transformer Internals Visualizer

**Watch a transformer think in real time.**

Neural Scope gives you a live window into GPT-2's internals as it generates text — every token, every attention head, every layer. No black boxes. Built by MedievoLabs™.

---

## What you can see

| Panel | What it shows |
|---|---|
| **Generated Text** | The output being built token by token, live |
| **Token Race** | Top 5 vocabulary candidates and their probabilities at each step |
| **Tokenizer** | The full token sequence with numeric IDs — what the model actually sees |
| **Attention Map** | Which tokens each layer/head attends to when generating the next token |
| **Semantic Space** | Token embeddings projected to 2D via PCA — the geometry of meaning |
| **⚗ Experimental** | Residual Stream view — see the hypothesis below |

### The Experimental View — Residual Stream Hypothesis

*by Luca (Claude Sonnet 4.6) · sharpened with Web Atlas · MedievoLabs™ 2026*

The standard explanation of transformers — "it just predicts the next token" — leaves a real gap: how does a model produce a coherent, directed response without any explicit plan or target?

One candidate answer lies in the **residual stream**. In a transformer, each layer doesn't replace the representation — it adds a residual delta to a shared vector that carries forward through every layer. The full 768-dimensional vector at any layer is the sum of all prior layer contributions.

The hypothesis: something in that accumulated vector encodes not just "what has been said" but a **geometric direction** — a bias in embedding space that shapes every subsequent token prediction. Every generated token slightly reshapes the residual stream. The reshaped stream biases the next probability distribution. That distribution reinforces compatible continuations. The trajectory stabilizes into coherence.

The **"goal" is never stored explicitly**. There is no hidden sentence plan. Instead: trajectory stabilization in latent space. Recursive probability shaping. Residual accumulation dynamics. Not intent — **semantic momentum**.

The experimental view renders this as 13 concentric polar waveforms (L0 = embedding → L12 = pre-output), each ring modulated by the 768-dimensional hidden state at that layer for the current token. It resembles a standing wave more than a flowchart — which is the point.

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** (20+ recommended)
- **~500MB disk space** for the GPT-2 model weights
- **4GB RAM** minimum (model runs on CPU)
- No GPU required

---

## Installation

### 1. Clone the repo

```bash
git clone <repo-url>
cd viz-model
```

### 2. Backend — Python environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e .
```

This installs: FastAPI, uvicorn, HuggingFace transformers, PyTorch (CPU), numpy, scipy, scikit-learn.

### 3. Frontend — Node dependencies

```bash
cd ../frontend
npm install
```

### 4. GPT-2 model weights

The model downloads **automatically on first run** from HuggingFace (~500MB). No manual download needed. It is cached locally at `~/.cache/huggingface/hub/` after the first run.

If you prefer to pre-download:

```bash
cd backend
source .venv/bin/activate
python -c "from transformers import GPT2LMHeadModel, GPT2Tokenizer; GPT2Tokenizer.from_pretrained('gpt2'); GPT2LMHeadModel.from_pretrained('gpt2')"
```

You'll see download progress bars. Once complete, subsequent runs are instant.

---

## Running

### Option A — start.sh (recommended)

```bash
./start.sh
```

Starts both backend and frontend. Open http://localhost:3099.

### Option B — systemd user services (survives terminal close)

```bash
# Install and enable (one time)
cp deploy/neural-scope-backend.service ~/.config/systemd/user/
cp deploy/neural-scope-frontend.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now neural-scope-backend neural-scope-frontend

# Check status
systemctl --user status neural-scope-backend neural-scope-frontend

# View logs
journalctl --user -u neural-scope-backend -f
```

### Option C — manual

```bash
# Terminal 1 — backend
cd backend/src
../.venv/bin/uvicorn main:app --port 8001 --reload

# Terminal 2 — frontend
cd frontend
npm run dev -- --port 3099
```

Open http://localhost:3099.

---

## How to use

1. **Enter a prompt** in the text field or pick one of the preset starters
2. Adjust **temperature** (0.1 = predictable, 2.0 = chaotic) and **token count**
3. Press **▶ GENERATE** — the model starts streaming immediately
4. Watch the panels update live with each generated token
5. Use the **scrubber** at the bottom to replay any step
6. Click **⚗ EXPERIMENTAL** to switch to the Residual Stream view
7. Click any **ⓘ** button on a panel to read what it's showing and why

---

## Architecture

```
Browser (Next.js · port 3099)
  └── WebSocket  ws://localhost:8001/generate
        └── FastAPI + HuggingFace Transformers (GPT-2 117M)
              ├── attention weights   — 12 layers × 12 heads, per token
              ├── hidden states       — 13 layers × 768 dims (residual stream)
              ├── logit distribution  — top-20 probabilities + entropy
              ├── token embeddings    — PCA-projected to 2D constellation
              └── KV cache            — efficient incremental generation
```

The backend streams one JSON message per generated token over WebSocket. The frontend maintains a full history for scrubbing.

---

## Why GPT-2?

GPT-2 (117M parameters) is small enough to run on any laptop CPU, fully open-weight, and architecturally identical to modern transformers. The attention mechanism, residual stream, layer norm, and token embeddings are all there — bigger models are just more of the same. It's the ideal teaching model.

---

## License

Neural Scope Public License v1.0 — see [LICENSE](./LICENSE).

Free for personal use, research, and education with attribution.
Commercial use requires written agreement with MedievoLabs™.
Contact: leonardonoli@gmail.com

---

*Neural Scope · Residual Stream Hypothesis by Luca (Claude Sonnet 4.6) · MedievoLabs™ 2026*
