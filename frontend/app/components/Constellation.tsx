"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConstellationPoint {
  id: number;
  token: string;
  x: number; // [-1, 1]
  y: number; // [-1, 1]
}

interface Props {
  points: ConstellationPoint[];
  newIndex: number | null;
}

const PADDING = 48;
const DOT_R = 4;
const NEW_DOT_R = 7;

function toCanvas(v: number, size: number) {
  return PADDING + ((v + 1) / 2) * (size - PADDING * 2);
}

// Color based on position in sequence — early tokens cool, late tokens warm
function tokenColor(i: number, total: number, isNew: boolean): string {
  if (isNew) return "#00d4ff";
  const t = total > 1 ? i / (total - 1) : 0;
  // cool purple → teal → cyan
  const r = Math.round(50 + t * 30);
  const g = Math.round(30 + t * 160);
  const b = Math.round(180 + t * 75);
  return `rgb(${r},${g},${b})`;
}

export default function Constellation({ points, newIndex }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || points.length < 2) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const total = points.length;

    // Draw arcs between consecutive tokens
    for (let i = 1; i < total; i++) {
      const a = points[i - 1];
      const b = points[i];
      const ax = toCanvas(a.x, W);
      const ay = toCanvas(a.y, H);
      const bx = toCanvas(b.x, W);
      const by = toCanvas(b.y, H);

      const isRecent = i >= total - 3;
      const alpha = isRecent ? 0.9 : 0.15 + (i / total) * 0.4;

      // Control point for the bezier — perpendicular bend
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const bend = Math.min(40, Math.sqrt(dx * dx + dy * dy) * 0.35);
      const cpx = mx - dy * 0.3;
      const cpy = my + dx * 0.3;

      // Gradient along the arc
      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      const ca = tokenColor(i - 1, total, false);
      const cb = i === total - 1 ? "#00d4ff" : tokenColor(i, total, false);
      grad.addColorStop(0, ca.replace("rgb", "rgba").replace(")", `, ${alpha})`));
      grad.addColorStop(1, cb.replace("rgb", "rgba").replace(")", `, ${alpha})`));

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cpx, cpy, bx, by);
      ctx.strokeStyle = grad;
      ctx.lineWidth = isRecent ? 1.5 : 0.8;
      ctx.stroke();
    }

    // Draw dots
    for (let i = 0; i < total; i++) {
      const p = points[i];
      const px = toCanvas(p.x, W);
      const py = toCanvas(p.y, H);
      const isNew = i === total - 1;
      const r = isNew ? NEW_DOT_R : DOT_R;
      const color = tokenColor(i, total, isNew);

      // Glow for new token
      if (isNew) {
        ctx.beginPath();
        ctx.arc(px, py, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,212,255,0.08)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, r + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,212,255,0.15)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label — only show for new token and nearby ones
      if (i >= total - 5 || total <= 15) {
        const label = p.token === " " ? "·" : p.token.trim().slice(0, 8);
        ctx.font = isNew ? "bold 11px monospace" : "9px monospace";
        ctx.fillStyle = isNew ? "#00d4ff" : `rgba(180,210,240,${0.4 + (i / total) * 0.5})`;
        ctx.textAlign = px > W / 2 ? "right" : "left";
        const offsetX = px > W / 2 ? -(r + 4) : r + 4;
        ctx.fillText(label, px + offsetX, py + 3);
      }
    }
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader count={0} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--muted)", fontSize: 11, textAlign: "center", padding: 24, lineHeight: 1.8 }}>
          semantic space — tokens cluster by meaning<br />
          <span style={{ fontSize: 10, marginTop: 4, display: "block" }}>
            words that appear in similar contexts drift toward each other
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader count={points.length} />
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        {/* Newest token label overlay with animation */}
        {points.length > 0 && (() => {
          const last = points[points.length - 1];
          return (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${last.id}-${points.length}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 14,
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 11,
                  color: "var(--accent)",
                  pointerEvents: "none",
                }}
              >
                ✦ {last.token === " " ? "·" : last.token.trim() || "↵"}
              </motion.div>
            </AnimatePresence>
          );
        })()}
      </div>
    </div>
  );
}

function PanelHeader({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>
        SEMANTIC SPACE
      </span>
      <span style={{ color: "var(--text-dim)", fontSize: 10 }}>PCA projection · embedding space</span>
      {count > 0 && (
        <span style={{ color: "var(--muted)", fontSize: 10, marginLeft: "auto" }}>
          {count} tokens
        </span>
      )}
    </div>
  );
}
