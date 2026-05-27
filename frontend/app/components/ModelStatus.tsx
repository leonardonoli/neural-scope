"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Status {
  status: string;
  model_ready: boolean;
  model_loading: boolean;
}

export default function ModelStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const res = await fetch("http://localhost:8001/health");
        const data: Status = await res.json();
        setStatus(data);
        if (data.model_ready) {
          // fade out after a moment once ready
          setTimeout(() => setVisible(false), 2500);
          clearInterval(interval);
        }
      } catch {
        setStatus(null);
      }
    };

    check();
    interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const show = visible && status !== null && !status.model_ready;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "var(--panel)",
            border: "1px solid var(--border-bright)",
            borderTop: "2px solid var(--warn)",
            borderRadius: 6,
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            minWidth: 280,
          }}
        >
          {/* Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid var(--border-bright)",
              borderTopColor: "var(--warn)",
              flexShrink: 0,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "var(--warn)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
              {status === null ? "BACKEND OFFLINE" : "LOADING MODEL"}
            </span>
            <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
              {status === null
                ? "cannot reach localhost:8001"
                : "GPT-2 weights loading into memory — one moment…"}
            </span>
          </div>

          {/* Pulse bar */}
          <div style={{ width: 60, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "50%", height: "100%", background: "var(--warn)", borderRadius: 2 }}
            />
          </div>
        </motion.div>
      )}

      {/* Ready flash */}
      {visible && status?.model_ready && (
        <motion.div
          key="ready"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "var(--panel)",
            border: "1px solid var(--border-bright)",
            borderTop: "2px solid var(--accent3)",
            borderRadius: 6,
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ color: "var(--accent3)", fontSize: 13 }}>✦</span>
          <span style={{ color: "var(--accent3)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
            MODEL READY
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: 10 }}>hit Generate</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
