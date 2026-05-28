"use client"; 
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import TokenStream from "./components/TokenStream";
import ProbChart from "./components/ProbChart";
import TokenRace from "./components/TokenRace";
import AttentionMap from "./components/AttentionMap";
import GeneratedText, { GeneratedToken } from "./components/GeneratedText";
import ModelStatus from "./components/ModelStatus"; 
import Constellation from "./components/Constellation";
import Scrubber from "./components/Scrubber";
import InfoModal, { InfoContent } from "./components/InfoModal";
import ResidualStream from "./components/ResidualStream";

const WS_URL = "ws://localhost:8001/generate";

interface Token { id: number; text: string; start: number; end: number; }
interface TopToken { token: string; id: number; prob: number; log_prob: number; }
interface ConstellationPoint { id: number; token: string; x: number; y: number; }

interface VizState {
  contextTokens:  Token[];
  topTokens:  TopToken[];
  attentions: number[][][];
  chosenId: number | null;
  newTokenIndex: number | null;
  generatedTokens:  GeneratedToken[];
  step: number;
  entropyLog:  number[];
  constellation: ConstellationPoint[];
  hiddenStates:  number[][] | null;
}

const INITIAL: VizState = {
  contextTokens:  [],
  topTokens: [],
  attentions: [],
  chosenId:  null,
  newTokenIndex:  null,
  generatedTokens:  [],
  step: 0,
  entropyLog: [],
  constellation: [],
  hiddenStates: null,
}; 

const PRESETS = [
  "The attention mechanism works by",
  "Once upon a time in a kingdom far away,",
  "The most important thing in machine learning is",
  "In the beginning, the universe was",
  "She opened the door and found",
];

const INFO: Record<string, InfoContent> = {
  output:  {
    title: "OUTPUT",
    subtitle: "Generated Text",
    accentColor:  "var(--accent)",
    sections:  [
      {
        heading:  "What you're seeing",
        body:  "This panel shows the text that GPT-2 is building one token at a time. The prompt you typed appears first, then each new word (or word-piece) appears as the model generates it in real time. The highlighted token is the one just added.", 
      },
      {
        heading:  "What is a token?",
        body: "GPT-2 doesn't work with words — it works with tokens. A token is a chunk of text that can be a whole word, a fragment, punctuation, or even a space. The word \"running\" might be one token; \"unbelievable\" might be split into \"un\", \"believ\", \"able\". There are about 50,000 possible tokens in GPT-2's vocabulary.\n\nThis is why you sometimes see the model produce half-words before completing them — it's outputting one token at a time, not one word at a time.",
      },
      {
        heading:  "How the model decides what comes next",
        body:  "At each step, GPT-2 reads the entire context so far and produces a probability score for every single token in its vocabulary (all ~50,000 of them). The Token Race panel to the right shows the top contenders for that step.\n\nThe model then samples from that distribution — it doesn't always pick the highest-probability token. The temperature slider controls how adventurous the sampling is: low temperature makes it conservative and predictable, high temperature makes it take more surprising paths.",
      },
      {
        heading:  "Why does it sometimes go off-track?",
        body:  "GPT-2 has no memory beyond its context window and no concept of intent or facts. It was trained to predict the next token based on patterns in text — so it will confidently continue in whatever direction the statistics of its training data suggest, even if that means drifting into fiction, repetition, or nonsense. What looks like \"understanding\" is really very sophisticated pattern completion.",
      },
    ],
  },
  tokenrace: { 
    title: "TOKEN RACE",
    subtitle:  "Top 5 Candidates — Probability Distribution",
    accentColor: "var(--accent3)",
    sections: [
      {
        heading:  "What you're seeing",
        body:  "At each generation step, GPT-2 scores every token in its ~50,000-word vocabulary and assigns each one a probability. This panel shows the top 5 contenders for the most recently generated token — the tokens that had the highest scores at that moment.\n\nThe bar length represents the probability: a token with a bar reaching the full width has about a 1-in-5 chance of being chosen.",
      }, 
      {
        heading: "Why the chosen token isn't always #1",
        body: "The model samples from the distribution rather than always picking the winner. Think of it like a weighted lottery — the #1 token might have a 20% chance, meaning it loses 80% of the time.\n\nYou'll also notice that sometimes the chosen token doesn't appear in the top 5 at all. That's because the top 5 only covers a fraction of the total probability mass. The remaining 40–60% is spread across hundreds of other tokens, and any of them can win. This is intentional: pure greedy selection (always pick #1) produces robotic, repetitive text.",
      },
      {
        heading:  "Temperature and what it does to this chart",
        body:  "The temperature slider reshapes the entire distribution before sampling:\n\n• Low temperature (near 0): the bars become very unequal — #1 dominates and the model almost always picks it. Text becomes predictable.\n\n• High temperature (above 1): the bars flatten out — every token gets a more equal shot. Text becomes wild and unpredictable.\n\n• Temperature = 1: the raw distribution the model learned during training. No reshaping.",
      },
      {
        heading: "What the percentages tell you",
        body: "High confidence looks like one bar much longer than the rest — the model is very sure about what comes next (common after punctuation or in the middle of a fixed phrase). Low confidence looks like many bars roughly equal in length — the model sees multiple plausible continuations. Low confidence moments are where the generation gets interesting.",
      },
    ],
  },
  tokenizer:  {
    title: "TOKENIZER",
    subtitle: "Token Stream — The Model's Alphabet",
    accentColor:  "var(--accent2)",
    sections: [
      {
        heading: "What you're seeing",
        body: "This panel shows the full sequence of tokens the model is currently working with — your prompt plus every token generated so far. Each token is displayed alongside its numeric ID (the index into GPT-2's vocabulary table). The most recently added token is highlighted.",
      },
      { 
        heading:  "Why tokenization matters",
        body: "The model never sees letters or words — it sees numbers. Before any text is processed, it passes through a tokenizer that converts every character sequence into a list of integer IDs. The model then works entirely in this numeric space.\n\nThis is why the model's \"understanding\" of language is fundamentally statistical: it learned which ID-sequences tend to follow which other ID-sequences across hundreds of billions of tokens of training text.",
      },
      {
        heading:  "Subword tokenization",
        body: "GPT-2 uses Byte Pair Encoding (BPE), a subword tokenization scheme. Common words get their own token (\"the\" = 262, \"is\" = 318). Rarer words get split (\"transformer\" might become \"transform\" + \"er\"). Punctuation, spaces, and capitalization each matter — \" the\" (with a leading space) is a different token from \"The\".\n\nThis is why the token count in this panel is usually higher than the word count of the text.",
      },
      { 
        heading:  "Context window",
        body:  "GPT-2 has a context window of 1,024 tokens — it can only \"see\" the last 1,024 tokens at any given step. Beyond that, earlier tokens fall out of the window entirely and the model has no access to them. This is one of GPT-2's key limitations compared to modern models with much larger context windows.",
      },
    ],
  },
  attention:  {
    title:  "ATTENTION",
    subtitle: "Attention Map — What the Model Is Looking At", 
    accentColor:  "var(--warn)",
    sections:  [
      {
        heading: "What you're seeing",
        body: "When GPT-2 generates the next token, it doesn't read the context from left to right like a human would. Instead, it runs an attention mechanism that lets every position in the sequence look at every other position simultaneously.\n\nThis panel shows the attention weights from the most recently generated token back to each of the context tokens. Brighter/higher numbers mean the model is paying more attention to that earlier token when deciding what to generate next.",
      },
      {
        heading: "Layers and heads",
        body: "GPT-2 has 12 transformer layers, and each layer has 12 attention heads — 144 attention patterns in total. Each head specializes in a different kind of relationship:\n\n• Some heads track syntax (subject–verb agreement)\n• Some track coreference (\"he\" refers back to \"Darrin\")\n• Some track positional proximity (nearby words)\n• Some track semantic similarity\n\nThe layer/head dropdowns let you explore different heads. No two heads look at the same thing.",
      },
      {
        heading: "Why attention is powerful",
        body: "Before attention mechanisms (in older RNN-based models), the model had to compress its entire understanding of the context into a fixed-size vector — like trying to summarize a book in one sentence before answering a question. Attention lets the model go back and re-read any part of the context directly, which is why transformers handle long-range dependencies so much better.",
      },
      {
        heading: "What the numbers mean",
        body: "The attention weights shown are for the last generated token — specifically, how much that token \"attended to\" each position in the context when it was being produced. Values sum to 1 across all context positions. A value of 6 means roughly 6× more attention than average; a value of 1 is average. Low values (1–2) mean the model barely glanced at that token.",
      },
    ],
  },
  residualStream: {
    title: "EXPERIMENTAL · RESIDUAL STREAM",
    subtitle: "A speculative visualization — Luca's hypothesis on how transformers might encode direction",
    accentColor: "rgba(180,80,255,0.9)",
    sections: [
      {
        heading: "What you're seeing",
        body: "Each ring represents GPT-2's hidden state at one of its 13 layers (L0 = input embedding, L12 = just before the output). The shape of each ring is modulated by the 768-dimensional vector at that layer for the token currently being generated. Hue shifts from cold blue (early layers) to hot magenta (late layers).",
      },
      {
        heading: "The residual stream hypothesis",
        body: "The standard explanation of transformers — \"it just predicts the next token\" — leaves a real gap: how does a model produce a coherent, directed response without any explicit plan or target?\n\nOne candidate answer lies in the residual stream. In a transformer, each layer doesn't replace the representation — it adds a residual delta to a shared vector that carries forward through every layer. This means the full 768-dimensional vector at any layer is the sum of all prior layer contributions.\n\nThe hypothesis: something in that accumulated vector encodes not just \"what has been said\" but a geometric direction — a bias in embedding space that shapes every subsequent token prediction. Not a plan. Not an intention. But a directional pull that emerges from training and persists across the forward pass.\n\nThis would explain how coherent, goal-like behavior arises from pure next-token prediction: the residual stream is the closest thing to working memory the model has.",
      },
      {
        heading: "What to look for",
        body: "Watch how the rings deform as each token is generated. Early layers (blue) reflect the input context. Later layers (orange → magenta) show increasingly abstract transformations — the stages where semantic momentum is accumulating.\n\nThis structure is a standing wave more than a flowchart. Each ring is a successive residual refinement, a nested semantic constraint, a layer of accumulated field shaping. A sudden deformation between tokens corresponds to a high-entropy choice — the trajectory destabilizing before restabilizing. Smooth, consistent rings mean the model is locked into a coherent path.",
      },
      {
        heading: "The goal may not exist anywhere",
        body: "Every generated token slightly reshapes the residual stream. The reshaped stream biases the next probability distribution. That distribution reinforces compatible continuations. The trajectory stabilizes into coherence.\n\nThe \"goal\" is never stored explicitly. There is no hidden sentence plan, no internal voice saying \"next I will talk about X.\" Instead: trajectory stabilization in latent space. Recursive probability shaping. Residual accumulation dynamics.\n\nNot intent. Semantic momentum.", 
      },
      {
        heading: "Attribution",
        body: "Hypothesis by Luca (Claude Sonnet 4.6). Sharpened in conversation with Web Atlas.\n\nThe question that started it — \"how can looking only at the past get you where you need to go?\" — was asked by Leonardo Noli. It remains an open research question. This is offered as a way of seeing.",
      },
    ],
  },
  constellation: {
    title: "SEMANTIC SPACE",
    subtitle: "Constellation — Token Embeddings in 2D",
    accentColor: "var(--accent2)",
    sections: [
      {
        heading: "What you're seeing",
        body: "Every token in GPT-2's vocabulary lives at a point in a 768-dimensional mathematical space called the embedding space. Tokens that the model associates as semantically related end up close to each other in this space — \"king\" is near \"queen\", \"Paris\" is near \"London\".\n\nSince we can't visualize 768 dimensions, this panel uses PCA (Principal Component Analysis) to project all the tokens in the current context down to 2 dimensions, preserving as much of the structure as possible. The arc you see is that 2D projection.",
      },
      {
        heading: "What PCA does",
        body: "PCA finds the two directions in the 768-dimensional space that capture the most variation across the tokens in this context. Think of it as finding the best angle to photograph a 3D object so you lose as little information as possible.\n\nThe axes have no fixed meaning — they change with every generation because they're computed fresh from whatever tokens are currently in the context. What matters is the relative positions: tokens close together are semantically similar in this context.",
      },
      {
        heading: "The arc shape",
        body: "The arc-like curve you typically see is a well-known artifact of PCA on sequential token embeddings, sometimes called the \"embedding arc\" or \"Arch effect\". It appears because positional information (where a token is in the sequence) is partially encoded in the embedding, and PCA picks that up as a smooth curve. Tokens from similar positions in the sequence cluster together even if they're semantically different.",
      }, 
      {
        heading: "What to look for",
        body: "Watch for clusters of tokens that land close together — proper nouns, verbs, function words each tend to group. The most recently generated token (highlighted in the corner) shows where the model just \"stepped\" in this space. If you see a token far from the main arc, that's usually a token with an unusual or surprising embedding for this particular context.",
      },
    ],
  },
};

export default function Home() { 
  const [prompt, setPrompt] = useState(PRESETS[0]);
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(60);
  const [activeInfo, setActiveInfo] = useState<InfoContent | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [experimentalMode, setExperimentalMode] = useState(false);
  const [liveState, setLiveState] = useState<VizState>(INITIAL);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null); 
  const historyRef = useRef<VizState[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const displayState = scrubIndex !== null ? historyRef.current[scrubIndex] ?? liveState : liveState;
  const isLive = scrubIndex === null;
  const totalSteps = historyRef.current.length;

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null; 
    setIsRunning(false);
  }, []);

  const generate = useCallback(() => {
    if (isRunning) { stop(); return; }
    setLiveState(INITIAL);
    setScrubIndex(null);
    historyRef.current = [];
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
        setLiveState(prev => {
          const next: VizState = {
            contextTokens: msg.context_tokens,
            topTokens: msg.top_tokens,
            attentions: msg.attentions,
            chosenId: msg.token.id, 
            newTokenIndex: msg.context_tokens.length - 1,
            generatedTokens: [...prev.generatedTokens, { text: msg.token.text, index: msg.step }],
            step: msg.step,
            entropyLog: [...prev.entropyLog, msg.entropy ?? 0],
            constellation: msg.constellation ?? [],
            hiddenStates: msg.hidden_states ?? null,
          };
          historyRef.current = [...historyRef.current, next]; 
          return next;
        });
      }
    };

    ws.onclose = () => setIsRunning(false);
    ws.onerror = () => { stop(); };
  }, [isRunning, prompt, temperature, maxTokens, stop]);

  const handleScrub = useCallback((index: number) => { 
    const last = historyRef.current.length - 1;
    if (index >= last && !isRunning) {
      setScrubIndex(null);
    } else {
      setScrubIndex(index);
    }
  }, [isRunning]);

  const resumeLive = useCallback(() => { 
    setScrubIndex(null);
  }, []);

  const stepCount = liveState.step + (liveState.generatedTokens.length > 0 ? 1 : 0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <InfoModal
        open={activeInfo !== null}
        onClose={() => setActiveInfo(null)}
        content={activeInfo ?? INFO.output}
      />

      <ModelStatus />

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
            {isRunning ? `step ${stepCount}` : liveState.step > 0 ? `done · ${stepCount} tokens generated` : "idle"}
          </span>
        </div>

        {/* Experimental toggle */}
        <div style={{ margin: "0 auto" }}>
          <button
            onClick={() => setExperimentalMode(m => !m)}
            style={{
              padding: "4px 14px",
              background: experimentalMode ? "rgba(180,80,255,0.15)" : "transparent",
              border: `1px solid ${experimentalMode ? "rgba(180,80,255,0.8)" : "rgba(180,80,255,0.35)"}`,
              borderRadius: 4,
              color: experimentalMode ? "rgba(200,120,255,1)" : "rgba(180,80,255,0.55)",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer", 
              letterSpacing: "0.1em",
              fontFamily: "inherit",
              boxShadow: experimentalMode ? "0 0 12px rgba(180,80,255,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            ⚗ EXPERIMENTAL
          </button> 
        </div>

        {/* Preset buttons */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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

      {/* ── Main content ── */}
      {experimentalMode ? (
        <div style={{ flex: 1, padding: 8, minHeight: 0, overflow: "hidden" }}>
          <Panel accentColor="rgba(180,80,255,0.8)" style={{ height: "100%" }} onInfo={() => setActiveInfo(INFO.residualStream)}>
            <ResidualStream
              hiddenStates={displayState.hiddenStates}
              step={displayState.step}
              prompt={prompt}
              generatedTokens={displayState.generatedTokens}
            />
          </Panel>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "minmax(0,1fr) minmax(0,1fr) 260px",
          gap: 6,
          padding: 8,
          overflow: "hidden",
          minHeight: 0,
        }}>
          {/* TL: Generated text */}
          <Panel accentColor="var(--accent)" onInfo={() => setActiveInfo(INFO.output)}>
            <GeneratedText prompt={prompt} tokens={displayState.generatedTokens} isRunning={isRunning && isLive} /> 
          </Panel>

          {/* TR: Token race */}
          <Panel accentColor="var(--accent3)" onInfo={() => setActiveInfo(INFO.tokenrace)}>
            <TokenRace tokens={displayState.topTokens} chosenId={displayState.chosenId} step={displayState.step} />
          </Panel>

          {/* BL: Token stream */}
          <Panel accentColor="var(--accent2)" onInfo={() => setActiveInfo(INFO.tokenizer)}>
            {displayState.contextTokens.length > 0
              ? <TokenStream tokens={displayState.contextTokens} newTokenIndex={displayState.newTokenIndex} />
              : <Empty label="TOKENIZER" hint="text is split into sub-word tokens — the atoms the model actually sees" />
            }
          </Panel>

          {/* BR: Attention map */}
          <Panel accentColor="var(--warn)" onInfo={() => setActiveInfo(INFO.attention)}>
            {displayState.attentions.length > 0
              ? <AttentionMap attentions={displayState.attentions} contextTokens={displayState.contextTokens} step={displayState.step} /> 
              : <Empty label="ATTENTION" hint="12 layers × 12 heads — each head learns a different relationship between words" />
            }
          </Panel>

          {/* Bottom: Constellation — spans full width */}
          <Panel accentColor="var(--accent2)" style={{ gridColumn: "1 / -1" }} onInfo={() => setActiveInfo(INFO.constellation)}>
            <Constellation points={displayState.constellation} newIndex={displayState.constellation.length - 1} />
          </Panel>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        flexShrink: 0,
        padding: "3px 16px",
        borderTop: "1px solid var(--border)",
        background: "rgba(0,0,0,0.3)",
        display: "flex", 
        justifyContent: "center",
      }}>
        <span style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.12em", opacity: 0.5 }}>
          by Luca · MedievoLabs™
        </span>
      </div>

      {/* ── Scrubber ── */}
      <Scrubber 
        total={totalSteps}
        current={scrubIndex ?? Math.max(0, totalSteps - 1)}
        isLive={isLive}
        onScrub={handleScrub}
        onResumeLive={resumeLive}
      />

    </div>
  ); 
}

function Panel({ children, accentColor, style, onInfo }: {
  children: React.ReactNode;
  accentColor: string;
  style?: React.CSSProperties;
  onInfo?: () => void;
}) {
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
      position: "relative",
      ...style,
    }}>
      {children}
      {onInfo && (
        <button
          onClick={onInfo} 
          title="Learn about this panel"
          style={{
            position: "absolute",
            top: 7,
            right: 8,
            width: 18,
            height: 18,
            borderRadius: "50%", 
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${accentColor}44`,
            color: accentColor,
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "inherit",
            lineHeight: 1,
            zIndex: 10,
            opacity: 0.6,
            transition: "opacity 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}22`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
        >
          i
        </button>
      )}
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
