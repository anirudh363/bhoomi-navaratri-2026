import { useLayoutEffect, useRef, useState } from "react";

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function useTip() {
  const [tip, setTip] = useState(null);
  const show = (e, content) => setTip({ x: e.clientX, y: e.clientY, content });
  const hide = () => setTip(null);
  const node = tip && (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.content}
    </div>
  );
  return { show, hide, node, active: tip };
}

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const s = Math.max(1, step);
  const top = Math.ceil(max / s) * s;
  const ticks = [];
  for (let v = 0; v <= top; v += s) ticks.push(v);
  return ticks;
}

// Column with a 4px rounded data-end, square at the baseline.
function colPath(x, y, w, h, r = 4) {
  if (h <= 0) return "";
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function barPath(x, y, w, h, r = 4) {
  if (w <= 0) return "";
  r = Math.min(r, w, h / 2);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

/** Vertical columns. data: [{ key, label, value, tip }] */
export function ColumnChart({ data, color = "var(--c2)", height = 220, labelEvery = 1, ariaLabel }) {
  const [ref, width] = useWidth();
  const tip = useTip();
  const [hover, setHover] = useState(null);
  const m = { l: 36, r: 8, t: 20, b: 26 };
  const iw = Math.max(0, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const band = data.length ? iw / data.length : 0;
  const bw = Math.min(24, Math.max(2, band - 2));
  const y = (v) => m.t + ih - (v / top) * ih;
  const maxIdx = data.findIndex((d) => d.value === max && max > 0);

  return (
    <div ref={ref}>
      {width > 0 && (
        <svg className="chart" width={width} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? "axis-l" : "grid-l"} x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
              <text x={m.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, k) => {
            const cx = m.l + band * k + band / 2;
            const h = ih - (y(d.value) - m.t);
            return (
              <g
                key={d.key ?? k}
                className={hover === k ? "hov" : ""}
                onPointerMove={(e) => {
                  setHover(k);
                  tip.show(e, d.tip ?? `${d.label}: ${d.value}`);
                }}
                onPointerLeave={() => {
                  setHover(null);
                  tip.hide();
                }}
              >
                <rect className="hit" x={m.l + band * k} y={m.t} width={band} height={ih} />
                <path className="bar" d={colPath(cx - bw / 2, y(d.value), bw, h)} fill={color} />
                {k === maxIdx && (
                  <text className="val" x={cx} y={y(d.value) - 6} textAnchor="middle">
                    {d.value}
                  </text>
                )}
                {k % labelEvery === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {tip.node}
    </div>
  );
}

/** Horizontal bars, values 0..1 shown as percentages. data: [{ key, label, value, tip }] */
export function PercentBars({ data, color = "var(--c1)", ariaLabel }) {
  const [ref, width] = useWidth();
  const tip = useTip();
  const [hover, setHover] = useState(null);
  const row = 28;
  const bh = 16;
  const labelW = Math.min(230, Math.max(110, width * 0.38));
  const valW = 44;
  const iw = Math.max(0, width - labelW - valW - 8);
  const height = data.length * row + 4;

  return (
    <div ref={ref}>
      {width > 0 && (
        <svg className="chart" width={width} height={height} role="img" aria-label={ariaLabel}>
          <line className="axis-l" x1={labelW} x2={labelW} y1={0} y2={height} />
          {data.map((d, k) => {
            const yy = k * row + 2;
            const w = iw * Math.max(0, Math.min(1, d.value));
            return (
              <g
                key={d.key ?? k}
                className={hover === k ? "hov" : ""}
                onPointerMove={(e) => {
                  setHover(k);
                  tip.show(e, d.tip ?? `${d.label}: ${Math.round(d.value * 100)}%`);
                }}
                onPointerLeave={() => {
                  setHover(null);
                  tip.hide();
                }}
              >
                <rect className="hit" x={0} y={yy} width={width} height={row} />
                <text x={labelW - 8} y={yy + row / 2} dy="0.32em" textAnchor="end">
                  {d.label}
                </text>
                <path className="bar" d={barPath(labelW + 1, yy + (row - bh) / 2, w, bh)} fill={color} />
                <text className="val" x={labelW + w + 6} y={yy + row / 2} dy="0.32em">
                  {Math.round(d.value * 100)}%
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {tip.node}
    </div>
  );
}

function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0},${y0}A${r1},${r1} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${large} 0 ${x3},${y3}Z`;
}

/** Donut with legend. data: [{ key, label, value, color }] */
export function Donut({ data, size = 190, centerLabel = "total", ariaLabel }) {
  const tip = useTip();
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r1 = size / 2 - 4;
  const r0 = r1 * 0.62;
  let a = 0;
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, margin: "0 auto" }} role="img" aria-label={ariaLabel}>
        {total === 0 && <circle cx={size / 2} cy={size / 2} r={(r0 + r1) / 2} fill="none" stroke="#EADFC5" strokeWidth={r1 - r0} />}
        {data.map((d, k) => {
          if (!d.value) return null;
          const a0 = a;
          const a1 = a + (d.value / total) * Math.PI * 2;
          a = a1;
          const full = d.value === total;
          return (
            <g
              key={d.key}
              className={hover === k ? "hov" : ""}
              onPointerMove={(e) => {
                setHover(k);
                tip.show(e, `${d.label}: ${d.value} (${pct(d.value)}%)`);
              }}
              onPointerLeave={() => {
                setHover(null);
                tip.hide();
              }}
            >
              {full ? (
                <circle className="bar" cx={size / 2} cy={size / 2} r={(r0 + r1) / 2} fill="none" stroke={d.color} strokeWidth={r1 - r0} />
              ) : (
                <path className="bar" d={arc(size / 2, size / 2, r0, r1, a0, a1)} fill={d.color} stroke="var(--surface)" strokeWidth="2" />
              )}
            </g>
          );
        })}
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" style={{ fontSize: 30, fontWeight: 800, fill: "var(--ink)" }}>
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle">
          {centerLabel}
        </text>
      </svg>
      <div className="legend" style={{ justifyContent: "center" }}>
        {data.map((d) => (
          <span key={d.key}>
            <i style={{ "--sw": d.color }} />
            {d.label} <b>{d.value}</b> <small className="muted">({pct(d.value)}%)</small>
          </span>
        ))}
      </div>
      {tip.node}
    </div>
  );
}
