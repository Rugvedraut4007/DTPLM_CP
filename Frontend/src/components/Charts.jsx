import { useEffect, useState } from "react";
import { fmtDur } from "../lib/format.js";

/* sparkline — inline SVG, same geometry as the vanilla client */
export function Spark({ values, w = 104, h = 30, color = "#4f46e5", fill = false }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  const line = "M" + pts.join(" L");
  const area = line + " L" + w + "," + h + " L0," + h + " Z";
  return (
    <svg className="spark" width={w} height={h} viewBox={"0 0 " + w + " " + h}>
      {fill ? <path d={area} fill={color} opacity="0.14" /> : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* progress ring */
export function Ring({ pctValue, size = 116, stroke = 11, color = "#4f46e5", track = "#e8ebf7" }) {
  const p = Math.max(0, Math.min(100, Number(pctValue) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (c * p) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={dash.toFixed(1) + " " + (c - dash).toFixed(1)}
      />
    </svg>
  );
}

/* donut — one arc per segment, plus a dark track behind them */
export function Donut({ segments = [], size = 170, track = "#101b27" }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const stroke = size * 0.16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const circles = segments.map((seg, i) => {
    const len = (c * seg.value) / total;
    const el = (
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={stroke}
        strokeDasharray={(len - 1.5).toFixed(2) + " " + (c - len + 1.5).toFixed(2)}
        strokeDashoffset={(-offset).toFixed(2)}
      />
    );
    offset += len;
    return el;
  });
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      {circles}
    </svg>
  );
}

/* live HH:MM:SS counter for a running focus session */
export function FocusTimer({ startedAt, className = "timer" }) {
  const [sec, setSec] = useState(() => (Date.now() - Date.parse(startedAt)) / 1000);
  useEffect(() => {
    const id = setInterval(() => setSec((Date.now() - Date.parse(startedAt)) / 1000), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <div className={className}>{fmtDur(sec)}</div>;
}
