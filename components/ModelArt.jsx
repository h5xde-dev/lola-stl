// Схематичный рендер модели «слой за слоем», как идёт печать.
// Это SVG без браузерных API, поэтому он рисуется на сервере и сразу есть в HTML.
// Когда у модели есть фото, вместо схемы показывается первое фото.

const PROF = {
  cyl: () => 1,
  cone: t => .72 + .28 * t,
  bulb: t => .62 + .42 * Math.sin(Math.PI * (.12 + .76 * t)),
  bowl: t => .5 + .5 * Math.sqrt(t),
  hour: t => 1 - .28 * Math.sin(Math.PI * t),
  wave: t => .84 + .16 * Math.sin(Math.PI * 3 * t),
};
const r1 = v => Math.round(v * 10) / 10;
function hex2rgb(h) { const v = parseInt(String(h || "#999999").slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
function shade(rgb, f) { return "rgb(" + rgb.map(c => Math.max(0, Math.min(255, Math.round(f <= 1 ? c * f : c + (255 - c) * (f - 1))))).join(",") + ")"; }

export function artGeometry(m) {
  const S = 200, cx = 100, base = 168;
  const height = S * m.h, R = S * m.r, isBox = m.cat === "box";
  const L = Math.max(18, Math.min(64, Math.round(height / 2.6)));
  const lh = height / L, prof = PROF[m.prof] || PROF.cyl;
  const layers = [], edges = [];
  let prev = null, last = null;
  for (let i = 0; i < L; i++) {
    const t = i / (L - 1), y = base - i * lh, r = R * prof(t) * (isBox && t > .76 ? 1.03 : 1);
    if (isBox && t > .72 && t < .76) { prev = null; continue; }
    const phi = (m.twist || 0) * t + (m.phase || 0);
    let left = -r, right = r;
    const verts = [];
    if (m.n > 0) {
      for (let k = 0; k < m.n; k++) { const a = phi + 2 * Math.PI * k / m.n; verts.push({ x: r * Math.cos(a), z: Math.sin(a), a }); }
      if (!m.round) { left = Math.min(...verts.map(v => v.x)); right = Math.max(...verts.map(v => v.x)); }
    }
    const hw = lh * .48;
    layers.push({ x: r1(cx + left - hw), y: r1(y - hw), w: r1(right - left + 2 * hw), h: r1(2 * hw), alt: i % 2 });
    if (verts.length && prev) verts.forEach((v, k) => { const p = prev[k]; if (v.z > .05 && p.z > .05) edges.push(`M${r1(cx + p.x)} ${r1(y + lh)}L${r1(cx + v.x)} ${r1(y)}`); });
    prev = verts; last = { y, r, verts };
  }
  const topY = last.y - lh * .4, k = .17;
  const top = last.verts.length && !m.round
    ? { poly: last.verts.map(v => `${r1(cx + v.x)},${r1(topY + last.r * Math.sin(v.a) * k)}`).join(" ") }
    : { cx, cy: r1(topY), rx: r1(last.r), ry: r1(last.r * k) };
  return { cx, base, R, lh, isBox, layers, edges: edges.join(""), top, topY, lastR: last.r };
}

export default function ModelArt({ m, uid, photo = true, size }) {
  if (photo && m.photos && m.photos.length) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.photos[0]} alt={m.name} loading="lazy" />;
  }
  const g = artGeometry(m), rgb = hex2rgb(m.color), id = "a-" + (uid || m.id);
  const stops = alt => [[0, .6], [.3, 1.1], [.5, 1], [.85, .74], [1, .56]].map(([o, f]) => <stop key={o} offset={o} stopColor={shade(rgb, f * alt)} />);
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Модель «${m.name}»`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={id + "-0"}>{stops(.955)}</linearGradient>
        <linearGradient id={id + "-1"}>{stops(1)}</linearGradient>
      </defs>
      <ellipse cx={g.cx} cy={r1(g.base + g.lh)} rx={r1(g.R * 1.12)} ry={r1(g.R * .2)} fill="rgba(0,0,0,.16)" />
      {g.layers.map((l, i) => <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h} rx={l.h / 2} fill={`url(#${id}-${l.alt})`} />)}
      {g.edges && <path d={g.edges} fill="none" stroke={shade(rgb, m.round ? .82 : .68)} strokeOpacity={m.round ? .45 : .75} strokeWidth={r1(Math.max(.8, g.lh * .35))} strokeLinecap="round" />}
      {g.top.poly
        ? <polygon points={g.top.poly} fill={shade(rgb, g.isBox ? 1.18 : .34)} stroke={shade(rgb, g.isBox ? .8 : 1.15)} strokeWidth="1.4" />
        : <ellipse cx={g.top.cx} cy={g.top.cy} rx={g.top.rx} ry={g.top.ry} fill={shade(rgb, g.isBox ? 1.18 : .34)} stroke={shade(rgb, g.isBox ? .8 : 1.15)} strokeWidth="1.4" />}
      {g.isBox && <ellipse cx={g.cx} cy={r1(g.topY - 1)} rx={r1(g.lastR * .16)} ry={r1(g.lastR * .05)} fill={shade(rgb, .9)} />}
    </svg>
  );
}
