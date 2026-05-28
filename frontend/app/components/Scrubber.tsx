"use client"; 
import { motion } from "framer-motion";

interface Props { 
  total:  number; 
  current: number;        // index into history (or total-1 if live) 
  isLive:  boolean; 
  onScrub:  (index: number) => void;
  onResumeLive:  () => void;
} 

export default function Scrubber({ total, current, isLive, onScrub, onResumeLive }: Props) {
  if (total === 0) return null; 

  return (
    <div style={{
      display:  "flex", 
      alignItems: "center",
      gap: 10,
      padding:  "6px 14px",
      borderTop: "1px solid var(--border)", 
      background:  "rgba(0,0,0,0.35)", 
      flexShrink: 0,
    }}>
      <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
        STEP HISTORY
      </span>

      <input
        type="range"
        min={0} 
        max={total - 1} 
        value={current} 
        onChange={e => onScrub(Number(e.target.value))} 
        style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} 
      /> 

      <span style={{ color: "var(--accent)", fontSize: 11, minWidth: 48, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {current + 1} / {total}
      </span> 

      {!isLive && (
        <motion.button 
          onClick={onResumeLive} 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }} 
          style={{
            padding: "3px 10px",
            background:  "rgba(0,212,255,0.1)",
            border: "1px solid var(--accent)",
            borderRadius: 4,
            color: "var(--accent)",
            fontSize:  10, 
            fontWeight:  700,
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "inherit", 
            whiteSpace: "nowrap",
          }} 
        >
          ▶ LIVE 
        </motion.button> 
      )} 

      {isLive && (
        <div style={{
          padding: "3px 10px",
          border: "1px solid var(--border)", 
          borderRadius: 4, 
          color:  "var(--text-dim)", 
          fontSize:  10, 
          letterSpacing:  "0.08em",
          whiteSpace:  "nowrap",
        }}>
          LIVE
        </div>
      )}
    </div>
  );
}
