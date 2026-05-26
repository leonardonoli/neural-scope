import torch
import numpy as np
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from typing import Generator
import threading

MODEL_NAME = "gpt2"

_model: GPT2LMHeadModel | None = None
_tokenizer: GPT2Tokenizer | None = None
_lock = threading.Lock()


def load_model() -> tuple[GPT2LMHeadModel, GPT2Tokenizer]:
    global _model, _tokenizer
    with _lock:
        if _model is None:
            _tokenizer = GPT2Tokenizer.from_pretrained(MODEL_NAME)
            _model = GPT2LMHeadModel.from_pretrained(MODEL_NAME, output_attentions=True)
            _model.eval()
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

    input_ids = tokenizer.encode(prompt, return_tensors="pt")
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
            next_id = torch.multinomial(final_probs, 1)

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

            yield {
                "type": "token",
                "step": step,
                "token": {
                    "id": int(next_id),
                    "text": token_text,
                },
                "top_tokens": top_tokens,
                "attentions": attn_layers,  # [layer][head][position]
                "context_tokens": tokenize(tokenizer.decode(generated_ids[0])),
            }

            # feed only the new token for next step (KV cache)
            input_ids = next_id

            if int(next_id) == tokenizer.eos_token_id:
                break

    yield {"type": "done"}
