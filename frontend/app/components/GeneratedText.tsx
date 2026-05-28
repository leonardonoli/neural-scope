"use client";
import { motion } from "framer-motion";

export interface GeneratedToken { text: string; index: number; }

interface Props {
  prompt:  string;
  tokens:  GeneratedToken[];
  isRunning:  boolean;
}

export default function GeneratedText({ prompt, tokens, isRunning }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>OUTPUT</span>
        {isRunning && (
          <motion.span
            style={{ color: "var(--accent)", fontSize: 10 }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            generating...
          </motion.span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ lineHeight: 1.8, fontSize: 13 }}>
        <span style={{ color: "var(--text-dim)" }}>{prompt}</span>
        {tokens.map((tok) => (
          <motion.span
            key={tok.index}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={{ color: "var(--text)", display: "inline" }}
          >
            {tok.text}
          </motion.span>
        ))}
        {isRunning && (
          <motion.span
            style={{
              display: "inline-block",
              width:  8,
              height:  15,
              background:  "var(--accent)",
              marginLeft: 2,
              verticalAlign: "middle",
              borderRadius: 1,
            }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}
