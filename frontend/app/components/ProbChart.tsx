"use client";
import { motion, AnimatePresence } from "framer-motion";

interface TopToken {
  token: string;
  id: number;
  prob: number;
  log_prob: number;
}

interface Props {
  tokens: TopToken[];
  chosenId: number | null;
}

export default function ProbChart({ tokens, chosenId }: Props) {
  const max = tokens[0]?.prob ?? 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>
          NEXT TOKEN PROBABILITY
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: 10 }}>top 20</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        <AnimatePresence mode="popLayout">
          {tokens.map((tok) => {
            const pct = (tok.prob / max) * 100;
            const chosen = tok.id === chosenId;
            const color = chosen
              ? "var(--accent)"
              : tok.prob > 0.1
              ? "var(--accent3)"
              : tok.prob > 0.02
              ? "var(--accent2)"
              : "var(--muted)";

            return (
              <motion.div
                key={tok.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
                style={{
                  padding: "2px 4px",
                  borderRadius: 3,
                  background: chosen ? "rgba(0,212,255,0.06)" : "transparent",
                  border: chosen ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
                }}
              >
                {/* Token label */}
                <span
                  style={{
                    width: 90,
                    flexShrink: 0,
                    color: chosen ? "var(--accent)" : "var(--text)",
                    fontSize: 11,
                    whiteSpace: "pre",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {chosen && <span style={{ color: "var(--accent)", marginRight: 2 }}>▶</span>}
                  {tok.token === " " ? "·" : tok.token}
                </span>

                {/* Bar */}
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: "var(--border)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: color,
                      borderRadius: 2,
                      boxShadow: chosen ? `0 0 8px ${color}` : undefined,
                    }}
                  />
                </div>

                {/* Prob value */}
                <span style={{ width: 42, textAlign: "right", color: "var(--text-dim)", fontSize: 10, flexShrink: 0 }}>
                  {(tok.prob * 100).toFixed(1)}%
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
