"use client"; 
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface InfoSection {
  heading:  string;
  body: string;
}

export interface InfoContent {
  title: string; 
  subtitle: string;
  accentColor:  string; 
  sections:  InfoSection[];
} 

interface Props {
  open:  boolean;
  onClose: () => void;
  content: InfoContent;
}

export default function InfoModal({ open, onClose, content }: Props) { 
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence> 
      {open && (
        <>
          {/* Backdrop + centering container */}
          <motion.div 
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.18 }}
            onClick={onClose} 
            style={{
              position:  "fixed", inset: 0, 
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              display:  "flex", 
              alignItems: "center",
              justifyContent:  "center",
            }}
          >
          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }} 
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={e => e.stopPropagation()} 
            style={{
              width: "min(680px, 92vw)", 
              maxHeight:  "82vh",
              background:  "var(--panel)", 
              border:  `1px solid var(--border)`,
              borderTop: `3px solid ${content.accentColor}`, 
              borderRadius:  8,
              display: "flex",
              flexDirection: "column",
              zIndex: 1001, 
              boxShadow:  `0 0 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
              overflow:  "hidden",
              position:  "relative",
            }}
          >
            {/* Header */}
            <div style={{
              padding:  "18px 22px 14px",
              borderBottom:  "1px solid var(--border)",
              background:  "rgba(0,0,0,0.3)", 
              flexShrink: 0,
            }}> 
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{
                    color:  content.accentColor,
                    fontSize: 11,
                    letterSpacing: "0.14em", 
                    fontWeight: 700,
                    marginBottom: 4, 
                  }}>
                    {content.title}
                  </div>
                  <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}> 
                    {content.subtitle}
                  </div> 
                </div>
                <button 
                  onClick={onClose}
                  style={{ 
                    background:  "rgba(255,255,255,0.05)",
                    border:  "1px solid var(--border)", 
                    borderRadius: 4,
                    color: "var(--muted)", 
                    fontSize:  14,
                    cursor:  "pointer",
                    padding: "2px 9px",
                    fontFamily:  "inherit",
                    flexShrink:  0,
                    lineHeight:  1.6,
                  }}
                > 
                  ✕
                </button> 
              </div>
            </div>

            {/* Body */}
            <div style={{
              overflowY:  "auto",
              padding:  "20px 22px 24px", 
              display:  "flex",
              flexDirection: "column",
              gap: 22,
            }}>
              {content.sections.map((s, i) => (
                <div key={i}>
                  <div style={{
                    color: content.accentColor,
                    fontSize:  10,
                    letterSpacing:  "0.12em", 
                    fontWeight: 700,
                    marginBottom: 8, 
                    textTransform:  "uppercase",
                  }}>
                    {s.heading}
                  </div>
                  <div style={{
                    color: "var(--text-dim)",
                    fontSize: 12.5,
                    lineHeight: 1.85,
                    whiteSpace: "pre-line",
                  }}>
                    {s.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding:  "10px 22px",
              borderTop:  "1px solid var(--border)",
              background: "rgba(0,0,0,0.2)",
              color: "var(--muted)",
              fontSize: 10,
              flexShrink: 0,
            }}>
              Press <span style={{ color: "var(--text-dim)" }}>Esc</span> or click outside to close
            </div>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
