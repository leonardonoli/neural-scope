"use client";
import { useState } from "react";

interface Props {
  // attentions[layer][head][position] — attention from last generated token to each prior token
  attentions: number[][][];
  contextTokens: { id: number; text: string }[];
}

function heatColor(v: number): string {
  // 0 → dark blue, 0.5 → purple, 1 → cyan/white
  const r = Math.round(v * 0 + (1 - v) * 8);
  const g = Math.round(v * 212 + (1 - v) * 11);
  const b = Math.round(v * 255 + (1 - v) * 23);
  const a = 0.15 + v * 0.85;
  return `rgba(${r},${g},${b},${a})`;
}

export default function AttentionMap({ attentions, contextTokens }: Props) {
  const numLayers = attentions.length;
  const numHeads = attentions[0]?.length ?? 0;

  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState(0);

  if (!numLayers) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>ATTENTION</span>
        </div>
        <div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted)" }}>
          waiting for generation...
        </div>
      </div>
    );
  }

  const safeLayer = Math.min(layer, numLayers - 1);
  const safeHead = Math.min(head, numHeads - 1);
  const row = attentions[safeLayer][safeHead]; // attention weights for each token position
  const maxVal = Math.max(...row, 1e-8);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>
          ATTENTION
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <span style={{ color: "var(--text-dim)", fontSize: 10 }}>layer</span>
          <select
            value={safeLayer}
            onChange={e => setLayer(Number(e.target.value))}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 3,
              padding: "1px 4px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {Array.from({ length: numLayers }, (_, i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          <span style={{ color: "var(--text-dim)", fontSize: 10, marginLeft: 6 }}>head</span>
          <select
            value={safeHead}
            onChange={e => setHead(Number(e.target.value))}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 3,
              padding: "1px 4px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {Array.from({ length: numHeads }, (_, i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 6 }}>
          last generated token attending to each context token
        </div>
        <div className="flex flex-wrap gap-1">
          {row.map((weight, i) => {
            const norm = weight / maxVal;
            const tok = contextTokens[i];
            if (!tok) return null;
            return (
              <div
                key={i}
                title={`weight: ${weight.toFixed(4)}`}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "4px 6px",
                  borderRadius: 4,
                  background: heatColor(norm),
                  border: `1px solid rgba(0,212,255,${norm * 0.6})`,
                  minWidth: 28,
                  cursor: "default",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 11, color: "#fff", whiteSpace: "pre" }}>
                  {tok.text === " " ? "·" : tok.text}
                </span>
                <div
                  style={{
                    width: "100%",
                    height: 2,
                    background: `rgba(0,212,255,${norm})`,
                    borderRadius: 1,
                  }}
                />
                <span style={{ fontSize: 9, color: `rgba(180,220,255,${0.4 + norm * 0.6})` }}>
                  {(norm * 100).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
