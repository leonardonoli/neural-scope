"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TopToken {
  token: string;
  id: number;
  prob: number;
  log_prob: number;
}

interface RacerState {
  token: string;
  id: number;
  prob: number;
  won: boolean;
  ghost: boolean;
}

interface Props {
  tokens: TopToken[];   // full top-20 from backend
  chosenId: number | null;
  step: number;
}

const RACER_COUNT = 5;

// Distinct colors per lane — consistent across steps
const LANE_COLORS = [
  "#00d4ff", // cyan
  "#10b981", // green
  "#7c3aed", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
];

export default function TokenRace({ tokens, chosenId, step }: Props) {
  const top5 = tokens.slice(0, RACER_COUNT);
  const maxProb = top5[0]?.prob ?? 1;

  // Track previous step's racers so we can ghost them
  const prevRef = useRef<RacerState[]>([]);
  const [ghosts, setGhosts] = useState<RacerState[]>([]);

  useEffect(() => {
    if (!top5.length) return;
    // Mark previous non-winners as ghosts briefly
    const prev = prevRef.current;
    if (prev.length) {
      const newGhosts = prev
        .filter(r => r.id !== chosenId)
        .map(r => ({ ...r, ghost: true, won: false }));
      setGhosts(newGhosts);
      const t = setTimeout(() => setGhosts([]), 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!top5.length) return;
    prevRef.current = top5.map(t => ({
      token: t.token,
      id: t.id,
      prob: t.prob,
      won: t.id === chosenId,
      ghost: false,
    }));
  }, [top5, chosenId]);

  if (!top5.length) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader step={null} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--muted)", fontSize: 11, textAlign: "center", padding: 24, lineHeight: 1.8 }}>
          watch 5 candidates race to become the next token — only one wins
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader step={step} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
                    padding: "8px 14px", gap: 6, position: "relative" }}>

        {/* Ghost layer — previous losers fading out */}
        <AnimatePresence>
          {ghosts.map((g, i) => (
            <motion.div
              key={`ghost-${g.id}-${step}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                top: `calc(${i * (100 / RACER_COUNT)}% + 8px)`,
                pointerEvents: "none",
              }}
            >
              <RacerRow
                token={g.token}
                prob={g.prob}
                maxProb={maxProb}
                color={LANE_COLORS[i]}
                won={false}
                ghost
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live racers */}
        {top5.map((tok, i) => {
          const won = tok.id === chosenId;
          return (
            <motion.div
              key={`${tok.id}-${i}`}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <RacerRow
                token={tok.token}
                prob={tok.prob}
                maxProb={maxProb}
                color={LANE_COLORS[i]}
                won={won}
                ghost={false}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function RacerRow({
  token, prob, maxProb, color, won, ghost,
}: {
  token: string;
  prob: number;
  maxProb: number;
  color: string;
  won: boolean;
  ghost: boolean;
}) {
  const pct = (prob / maxProb) * 100;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      opacity: ghost ? 0.35 : 1,
      filter: ghost ? "blur(0.5px)" : "none",
    }}>
      {/* Token label */}
      <div style={{
        width: 100,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}>
        {won && !ghost && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color, fontSize: 10, flexShrink: 0 }}
          >
            ✦
          </motion.span>
        )}
        <span style={{
          color: won && !ghost ? color : "var(--text-dim)",
          fontSize: 12,
          fontWeight: won ? 700 : 400,
          whiteSpace: "pre",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 84,
          textShadow: won && !ghost ? `0 0 12px ${color}` : "none",
        }}>
          {token === " " ? "·" : token === "\n" ? "↵" : token}
        </span>
      </div>

      {/* Track */}
      <div style={{
        flex: 1,
        height: 12,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${won && !ghost ? color : "var(--border)"}`,
        boxShadow: won && !ghost ? `0 0 10px ${color}40` : "none",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            height: "100%",
            background: won && !ghost
              ? `linear-gradient(90deg, ${color}88, ${color})`
              : `${color}44`,
            borderRadius: 2,
            position: "relative",
          }}
        >
          {/* Winning flash */}
          {won && !ghost && (
            <motion.div
              initial={{ opacity: 0.8, x: "-100%" }}
              animate={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Prob % */}
      <span style={{
        width: 38,
        textAlign: "right",
        fontSize: 10,
        color: won && !ghost ? color : "var(--muted)",
        flexShrink: 0,
        fontWeight: won ? 600 : 400,
      }}>
        {(prob * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function PanelHeader({ step }: { step: number | null }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 14px",
      borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>
        TOKEN RACE
      </span>
      <span style={{ color: "var(--text-dim)", fontSize: 10 }}>top 5 candidates</span>
      {step !== null && (
        <span style={{ color: "var(--muted)", fontSize: 10, marginLeft: "auto" }}>
          step {step}
        </span>
      )}
    </div>
  );
}
