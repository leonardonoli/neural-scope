"use client";
import { useRef, useEffect } from "react";
import type { GeneratedToken } from "./GeneratedText";

interface Props { 
  hiddenStates: number[][] | null; // [13][768], tanh-normalized
  step:  number;
  prompt:  string; 
  generatedTokens: GeneratedToken[];
}

const NUM_LAYERS = 13;
const POINTS = 128;

function layerHue(l: number): number {
  return (200 + (l / (NUM_LAYERS - 1)) * 200) % 360;
}

export default function ResidualStream({ hiddenStates, step, prompt, generatedTokens }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const animRef = useRef<number>(0);
  const stateRef = useRef<{ data: number[][] | null; pulse: number; rotation: number }>({
    data: null,
    pulse:  0,
    rotation: 0,
  }); 

  useEffect(() => {
    stateRef.current.data =  hiddenStates;
    stateRef.current.pulse =  1.0; 
  }, [hiddenStates, step]);

  // Resize
  useEffect(() => { 
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      canvas.width =  parent.clientWidth; 
      canvas.height = parent.clientHeight;
    });
    ro.observe(parent);
    canvas.width =  parent.clientWidth;
    canvas.height = parent.clientHeight;
    return () => ro.disconnect(); 
  }, []);

  // Animаtiоn loop
  useEffect(() => { 
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!; 

    const draw = (ts: number) => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) { animRef.current = requestAnimationFrame(draw); return; }

      // Reserve top strip for generаted text (rendered in HTML overlаy)
      const STRIP_H = 0; // canvas doesn't draw the strip — HTML overlay handles it 
      const cx = W / 2;
      const cy = (H + STRIP_H) / 2;
      const maxR = Math.min(W, H - STRIP_H) * 0.43;
      const minR = maxR * 0.07;

      const s = stateRef.current;
      s.rotation += 0.0015;
      if (s.pulse > 0) s.pulse = Math.max(0, s.pulse - 0.018);

      ctx.fillStyle =  "rgba(2,4,8,0.88)";
      ctx.fillRect(0, 0, W, H); 

      for (let l = 0; l < NUM_LAYERS; l++) {
        const t = l / (NUM_LAYERS - 1);
        const baseR = minR + (maxR - minR) * t;
        const amplitude = baseR * 0.18;
        const hue = layerHue(l);
        const layerRot = s.rotation * (1.0 + l * 0.08) * (l % 2 === 0 ? 1 : -1);

        const pts: [number, number][] = [];
        for (let i = 0; i < POINTS; i++) {
          const angle = (i / POINTS) * Math.PI * 2 + layerRot;
          let r = baseR;
          if (s.data && s.data[l]) {
            const stride = Math.floor(768 / POINTS);
            const val = s.data[l][i * stride] ?? 0;
            r =  baseR + val * amplitude;
          } else { 
            r =  baseR + Math.sin(angle * 5 + ts * 0.0008 + l * 0.7) * amplitude * 0.25;
          }
          r += s.pulse * amplitude * 0.55 * t;
          pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
        }

        ctx.beginPath(); 
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.closePath(); 

        const alpha = 0.08 + t * 0.12 + s.pulse * 0.08;
        ctx.fillStyle = `hsla(${hue}, 90%, 55%, ${alpha})`;
        ctx.fill();

        ctx.shadowBlur =  6 + s.pulse * 18;
        ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
        ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + t * 25}%, ${0.4 + t * 0.35 + s.pulse * 0.2})`; 
        ctx.lineWidth =  0.8 + t * 0.8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Center glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, minR * 1.8); 
      coreGrad.addColorStop(0, `rgba(0,212,255,${0.15 + s.pulse * 0.25})`);
      coreGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); 
      ctx.arc(cx, cy, minR * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Layer tick labels
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline =  "middle";
      for (let l = 0; l < NUM_LAYERS; l++) {
        const angle = -Math.PI / 2 + (l / NUM_LAYERS) * Math.PI * 2;
        const r = minR + (maxR - minR) * (l / (NUM_LAYERS - 1)) + 13;
        const hue = layerHue(l);
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.45)`;
        ctx.fillText(`L${l}`, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }

      // Bоttom аttribution
      ctx.font =  "8px monospace";
      ctx.textAlign =  "center";
      ctx.textBaseline = "alphabetic"; 
      ctx.fillStyle =  "rgba(180,80,255,0.25)";
      ctx.fillText("residual stream hypothesis · luca", cx, H - 8);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current =  requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current); 
  }, []);

  // Build the full text string; split off the last token for highlighting
  const bodyText = prompt + generatedTokens.slice(0, -1).map(t => t.text).join(""); 
  const lastTokenText = generatedTokens.length > 0 ? generatedTokens[generatedTokens.length - 1].text : null;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}> 

      {/* Canvas — full bleed */}
      <canvas
        ref={canvasRef} 
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* Floating text box — right side */}
      <div style={{
        position:  "absolute",
        top: 32,
        right: 16,
        bottom: 32,
        width: "clamp(220px, 26%, 320px)", 
        background: "rgba(4,6,12,0.82)",
        border:  "1px solid rgba(180,80,255,0.25)",
        borderRadius: 6, 
        backdropFilter:  "blur(6px)",
        display:  "flex",
        flexDirection:  "column",
        overflow:  "hidden",
        boxShadow: "0 0 24px rgba(0,0,0,0.5)",
        zIndex: 3,
      }}>
        {/* Box header */}
        <div style={{
          padding:  "6px 10px",
          borderBottom:  "1px solid rgba(180,80,255,0.2)",
          background: "rgba(0,0,0,0.3)", 
          flexShrink: 0,
          display: "flex",
          alignItems:  "center",
          justifyContent: "space-between",
        }}>
          <span style={{ color: "rgba(180,80,255,0.7)", fontSize: 8, letterSpacing: "0.12em", fontWeight: 700 }}> 
            GENERATED TEXT
          </span>
          {generatedTokens.length > 0 && (
            <span style={{ color: "rgba(180,80,255,0.4)", fontSize: 8, fontFamily: "monospace" }}>
              {generatedTokens.length} tokens
            </span>
          )}
        </div>

        {/* Scrollable text body */}
        <div style={{
          flex:  1,
          overflowY: "auto",
          padding: "10px 12px",
          fontSize: 12,
          lineHeight: 1.85, 
          wordBreak:  "break-word",
          color:  "var(--text-dim)",
        }}> 
          {generatedTokens.length === 0 ? (
            <span style={{ color: "rgba(180,80,255,0.3)", fontStyle: "italic", fontSize: 11 }}>
              waiting for generation… 
            </span>
          ) : (
            <> 
              <span style={{ color: "var(--muted)" }}>{bodyText}</span>
              {lastTokenText && (
                <span style={{ 
                  color:  "rgba(220,140,255,1)",
                  background:  "rgba(180,80,255,0.18)",
                  borderRadius:  2,
                  padding: "0 1px",
                }}>
                  {lastTokenText}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend — left side */}
      <div style={{
        position: "absolute", top: 36, left: 14,
        display: "flex", flexDirection: "column", gap: 4,
        pointerEvents: "none", zIndex: 2,
      }}>
        {[0, 6, 12].map(l => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 18, height: 2,
              background: `hsl(${layerHue(l)}, 100%, 60%)`,
              borderRadius: 1,
            }} />
            <span style={{ color: "var(--muted)", fontSize: 8 }}>
              {l === 0 ? "L0 · embedding" : l === 6 ? "L6 · mid" : "L12 · pre-output"}
            </span>
          </div>
        ))}
      </div>

      {/* Token counter — bottom left */}
      {generatedTokens.length > 0 && (
        <div style={{
          position: "absolute", bottom: 18, left: 14,
          color: "rgba(180,80,255,0.35)", fontSize: 8,
          fontFamily: "monospace", letterSpacing: "0.1em",
          pointerEvents: "none", zIndex: 2,
        }}>
          token {generatedTokens.length} · layer snapshot
        </div>
      )}

    </div>
  );
}
