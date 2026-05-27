import torch
import numpy as np
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from typing import Generator
import threading
from sklearn.decomposition import PCA

MODEL_NAME = "gpt2"

_model: GPT2LMHeadModel | None = None
_tokenizer: GPT2Tokenizer | None = None
_lock = threading.Lock()


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_model() -> tuple[GPT2LMHeadModel, GPT2Tokenizer]:
    global _model, _tokenizer
    with _lock:
        if _model is None:
            _tokenizer = GPT2Tokenizer.from_pretrained(MODEL_NAME)
            _model = GPT2LMHeadModel.from_pretrained(MODEL_NAME, output_attentions=True)
            _model = _model.to(DEVICE)
            _model.eval()
            print(f"[viz-model] Model loaded on {DEVICE}")
        return _model, _tokenizer


def tokenize(text: str) -> list[dict]:
    _, tokenizer = load_model()
    encoding = tokenizer(text, return_offsets_mapping=True)
    ids = encoding["input_ids"]
    offsets = encoding["offset_mapping"]
    return [
        {
            "id": int(tid),
            "text": tokenizer.decode([tid]),
            "start": int(s),
            "end": int(e),
        }
        for tid, (s, e) in zip(ids, offsets)
    ]


def generate_stream(
    prompt: str,
    max_new_tokens: int = 80,
    temperature: float = 0.8,
    top_k: int = 50,
    top_p: float = 0.95,
) -> Generator[dict, None, None]:
    model, tokenizer = load_model()

    input_ids = tokenizer.encode(prompt, return_tensors="pt").to(DEVICE)
    past_key_values = None
    generated_ids = input_ids.clone()

    with torch.no_grad():
        for step in range(max_new_tokens):
            outputs = model(
                input_ids=input_ids,
                past_key_values=past_key_values,
                use_cache=True,
                output_attentions=True,
            )

            logits = outputs.logits[:, -1, :]  # (1, vocab)
            past_key_values = outputs.past_key_values
            attentions = outputs.attentions  # tuple of (1, heads, seq, seq)

            # --- probabilities ---
            scaled = logits / max(temperature, 1e-8)
            probs = torch.softmax(scaled, dim=-1)

            # top-k filter
            if top_k > 0:
                vals, _ = torch.topk(scaled, top_k)
                scaled = scaled.masked_fill(scaled < vals[:, -1:], float("-inf"))

            # top-p filter
            sorted_logits, sorted_idx = torch.sort(scaled, descending=True)
            cumprobs = torch.cumsum(torch.softmax(sorted_logits, dim=-1), dim=-1)
            remove = cumprobs - torch.softmax(sorted_logits, dim=-1) > top_p
            sorted_logits[remove] = float("-inf")
            scaled.scatter_(1, sorted_idx, sorted_logits)

            final_probs = torch.softmax(scaled, dim=-1)
            next_id = torch.multinomial(final_probs, 1).to(DEVICE)

            # entropy (nats) over full distribution — logged per step for later charting
            entropy = float(-torch.sum(probs * torch.log(probs + 1e-10)))

            # top-20 for chart
            top_probs, top_ids = torch.topk(probs, 20)
            top_tokens = [
                {
                    "token": tokenizer.decode([int(tid)]),
                    "id": int(tid),
                    "prob": float(p),
                    "log_prob": float(torch.log(p + 1e-10)),
                }
                for p, tid in zip(top_probs[0], top_ids[0])
            ]

            # attention for last generated position, all layers & heads
            # shape per layer: (1, num_heads, seq_len, seq_len)
            seq_len = generated_ids.shape[1]
            attn_layers = []
            for layer_attn in attentions:
                # last token attending to all prior tokens
                a = layer_attn[0, :, -1, :seq_len].cpu().numpy()  # (heads, seq)
                attn_layers.append(a.tolist())

            token_text = tokenizer.decode([int(next_id)])
            generated_ids = torch.cat([generated_ids, next_id], dim=1)

            # --- constellation: 2D PCA of token embeddings ---
            # embedding matrix: (vocab_size, 768)
            emb_matrix = model.transformer.wte.weight  # (vocab, 768)
            ctx_ids = generated_ids[0].cpu().tolist()
            ctx_embeddings = emb_matrix[ctx_ids].detach().cpu().float().numpy()  # (seq, 768)

            # need at least 2 tokens for PCA
            if len(ctx_ids) >= 2:
                n_components = min(2, len(ctx_ids))
                pca = PCA(n_components=n_components)
                coords_2d = pca.fit_transform(ctx_embeddings)  # (seq, 2)
                # normalize to [-1, 1]
                for dim in range(coords_2d.shape[1]):
                    mn, mx = coords_2d[:, dim].min(), coords_2d[:, dim].max()
                    rng = mx - mn if mx - mn > 1e-8 else 1.0
                    coords_2d[:, dim] = (coords_2d[:, dim] - mn) / rng * 2 - 1
                constellation = [
                    {"id": int(tid), "token": tokenizer.decode([int(tid)]), "x": float(coords_2d[i, 0]), "y": float(coords_2d[i, 1])}
                    for i, tid in enumerate(ctx_ids)
                ]
            else:
                constellation = []

            yield {
                "type": "token",
                "step": step,
                "entropy": entropy,
                "token": {
                    "id": int(next_id),
                    "text": token_text,
                },
                "top_tokens": top_tokens,
                "attentions": attn_layers,  # [layer][head][position]
                "context_tokens": tokenize(tokenizer.decode(generated_ids[0])),
                "constellation": constellation,
            }

            # feed only the new token for next step (KV cache)
            input_ids = next_id

            if int(next_id) == tokenizer.eos_token_id:
                break

    yield {"type": "done"}
