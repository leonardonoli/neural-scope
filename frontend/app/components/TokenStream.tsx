"use client";
import { useEffect, useRef } from "react";

interface Token {
  id:  number;
  text: string;
  start:  number;
  end:  number;
}

interface Props {
  tokens:  Token[];
  newTokenIndex:  number | null;
}

export default function TokenStream({ tokens, newTokenIndex }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [tokens.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>
          TOKENIZER
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
          {tokens.length} tokens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-wrap content-start">
        {tokens.map((tok, i) => (
          <span
            key={i}
            className={`token-chip ${i === newTokenIndex ? "new" : ""}`}
            title={`id: ${tok.id}`}
          >
            <span style={{ color: "var(--text-dim)", fontSize: 9, marginRight: 3 }}>
              {tok.id}
            </span>
            <span style={{ color: i === newTokenIndex ? "var(--accent)" : "var(--text)" }}>
              {tok.text === " " ? "·" : tok.text}
            </span>
          </span>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
