"use client";
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import TokenStream from "./components/TokenStream";
import ProbChart from "./components/ProbChart";
import AttentionMap from "./components/AttentionMap";
import GeneratedText from "./components/GeneratedText";

const WS_URL = "ws://localhost:8001/generate";

interface Token { id: number; text: string; start: number; end: number; }
interface TopToken { token: string; id: number; prob: number; log_prob: number; }

interface VizState {
  contextTokens: Token[];
  topTokens: TopToken[];
  attentions: number[][][];
  chosenId: number | null;
  newTokenIndex: number | null;
  generated: string;
  step: number;
}

const INITIAL: VizState = {
  contextTokens: [],
  topTokens: [],
  attentions: [],
  chosenId: null,
  newTokenIndex: null,
  generated: "",
  step: 0,
};

const PRESETS = [
  "The attention mechanism works by",
  "Once upon a time in a kingdom far away,",
  "The most important thing in machine learning is",
  "In the beginning, the universe was",
  "She opened the door and found",
];

export default function Home() {
  const [prompt, setPrompt] = useState(PRESETS[0]);
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<VizState>(INITIAL);
  const [stepCount, setStepCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsRunning(false);
  }, []);

  const generate = useCallback(() => {
    if (isRunning) { stop(); return; }
    setState(INITIAL);
    setStepCount(0);
    setIsRunning(true);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ prompt, temperature, max_new_tokens: maxTokens, top_k: 50, top_p: 0.95 }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "done") { stop(); return; }
      if (msg.type === "error") { console.error(msg.message); stop(); return; }
      if (msg.type === "token") {
        setStepCount(msg.step + 1);
        setState(prev => ({
          ...prev,
          contextTokens: msg.context_tokens,
          topTokens: msg.top_tokens,
          attentions: msg.attentions,
          chosenId: msg.token.id,
          newTokenIndex: msg.context_tokens.length - 1,
          generated: prev.generated + msg.token.text,
          step: msg.step,
        }));
      }
    };

    ws.onclose = () => setIsRunning(false);
    ws.onerror = () => { stop(); };
  }, [isRunning, prompt, temperature, maxTokens, stop]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "8px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "rgba(0,0,0,0.5)",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ color: "var(--accent)", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em" }}>
            NEURAL SCOPE
          </div>
          <div style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}>
            TRANSFORMER INTERNALS VISUALIZER · GPT-2 (117M)
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className={`pulse-dot ${isRunning ? "" : "off"}`} />
          <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
            {isRunning ? `step ${stepCount}` : state.step > 0 ? `done · ${stepCount} tokens generated` : "idle"}
          </span>
        </div>

        {/* Preset buttons */}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { if (!isRunning) setPrompt(p); }}
              style={{
                padding: "2px 8px",
                background: prompt === p ? "rgba(0,212,255,0.08)" : "transparent",
                border: `1px solid ${prompt === p ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 3,
                color: prompt === p ? "var(--accent)" : "var(--text-dim)",
                fontSize: 10,
                cursor: isRunning ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {p.slice(0, 20)}…
            </button>
          ))}
        </div>
      </div>

      {/* ── Prompt bar ── */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(0,0,0,0.25)",
        flexShrink: 0,
        alignItems: "center",
      }}>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && generate()}
          disabled={isRunning}
          placeholder="Enter a prompt and press Generate…"
          style={{
            flex: 1,
            background: "var(--panel)",
            border: "1px solid var(--border-bright)",
            borderRadius: 5,
            padding: "6px 12px",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
          }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-dim)", fontSize: 10, whiteSpace: "nowrap" }}>
          temp
          <input type="range" min={0.1} max={2} step={0.05}
            value={temperature} onChange={e => setTemperature(Number(e.target.value))}
            style={{ width: 70, accentColor: "var(--accent)" }} />
          <span style={{ color: "var(--accent)", minWidth: 28, textAlign: "right" }}>{temperature.toFixed(2)}</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-dim)", fontSize: 10, whiteSpace: "nowrap" }}>
          tokens
          <input type="range" min={10} max={200} step={10}
            value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
            style={{ width: 70, accentColor: "var(--accent)" }} />
          <span style={{ color: "var(--accent)", minWidth: 28, textAlign: "right" }}>{maxTokens}</span>
        </label>

        <motion.button
          onClick={generate}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{
            padding: "7px 22px",
            background: isRunning ? "rgba(239,68,68,0.12)" : "rgba(0,212,255,0.1)",
            border: `1px solid ${isRunning ? "rgba(239,68,68,0.6)" : "var(--accent)"}`,
            borderRadius: 5,
            color: isRunning ? "#ef4444" : "var(--accent)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "inherit",
            boxShadow: isRunning ? "0 0 12px rgba(239,68,68,0.2)" : "0 0 12px rgba(0,212,255,0.15)",
          }}
        >
          {isRunning ? "■  STOP" : "▶  GENERATE"}
        </motion.button>
      </div>

      {/* ── Main 2×2 grid ── */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 6,
        padding: 8,
        overflow: "hidden",
        minHeight: 0,
      }}>

        {/* TL: Generated text */}
        <Panel accentColor="var(--accent)">
          <GeneratedText prompt={prompt} generated={state.generated} isRunning={isRunning} />
        </Panel>

        {/* TR: Token probability chart */}
        <Panel accentColor="var(--accent3)">
          {state.topTokens.length > 0
            ? <ProbChart tokens={state.topTokens} chosenId={state.chosenId} />
            : <Empty label="NEXT TOKEN PROBABILITY" hint="watch the model choose its next word — every token, every step" />
          }
        </Panel>

        {/* BL: Token stream */}
        <Panel accentColor="var(--accent2)">
          {state.contextTokens.length > 0
            ? <TokenStream tokens={state.contextTokens} newTokenIndex={state.newTokenIndex} />
            : <Empty label="TOKENIZER" hint="text is split into sub-word tokens — the atoms the model actually sees" />
          }
        </Panel>

        {/* BR: Attention map */}
        <Panel accentColor="var(--warn)">
          {state.attentions.length > 0
            ? <AttentionMap attentions={state.attentions} contextTokens={state.contextTokens} />
            : <Empty label="ATTENTION" hint="12 layers × 12 heads — each head learns a different relationship between words" />
          }
        </Panel>

      </div>
    </div>
  );
}

function Panel({ children, accentColor }: { children: React.ReactNode; accentColor: string }) {
  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderTop: `2px solid ${accentColor}`,
      borderRadius: 6,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: `0 0 0 0 ${accentColor}`,
    }}>
      {children}
    </div>
  );
}

function Empty({ label, hint }: { label: string; hint: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
        <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--muted)", fontSize: 11, textAlign: "center", padding: 24, lineHeight: 1.8 }}>
        {hint}
      </div>
    </div>
  );
}
