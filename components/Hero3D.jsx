"use client";
// Фон главной: парящие 3D-кашпо с фактурами как у моделей lola.stl
// (рёбра, пузырьки, грани, коралл, ромашки) и переливом шёлкового пластика.
// three.js грузится отдельно после страницы, на сервере ничего не рисуется.
// Сцена засыпает вне экрана и замирает при «уменьшении движения» в системе.

import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;

// Поверхности: радиус в точке (угол a, высота t от 0 до 1).
const SURF = {
  ribs: (a, t, o) => .06 * Math.pow(Math.abs(Math.sin(a * o.n / 2 + o.twist * t * TAU)), .6),
  bubbles: (a, t) => { const v = Math.sin(a * 22) * Math.sin(t * 34 + Math.sin(a * 22) * .6); return .05 * Math.max(0, v) ** 1.6; },
  facets: (a, t) => { const u = (a * 14 / TAU) % 1, w = (t * 11 + ((Math.floor(a * 14 / TAU) % 2) * .5)) % 1; return .07 * (1 - Math.max(Math.abs(u - .5), Math.abs(w - .5)) * 2); },
  coral: (a, t) => .045 * (Math.sin(a * 13 + Math.sin(t * 11 + a * 2) * 2.2) * .5 + .5),
  daisy: (a, t) => { const ca = (a * 9 / TAU) % 1, ct = (t * 7 + (Math.floor(a * 9 / TAU) % 2) * .5) % 1; const dx = ca - .5, dy = (ct - .5) * 1.3; const r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx); return .06 * Math.max(0, 1 - r * 2.2) * (.55 + .45 * Math.cos(ang * 8)); },
  tentacle: (a, t, o) => { const k = Math.sin(a * 7 + Math.sin(t * 5) * .9 + o.twist * t); return .14 * Math.max(0, k) ** 3 + .015 * Math.sin(t * 60) * Math.max(0, k); },
};

const PROF = {
  cyl: () => 1,
  cone: t => .78 + .22 * t,
  bulb: t => .75 + .3 * Math.sin(Math.PI * (.15 + .7 * t)),
  hour: t => 1 - .18 * Math.sin(Math.PI * t),
};

// Шёлковый перелив: 2–3 цвета по окружности, как у многоцветного PLA на фото.
const PALETTES = [
  ["#ff2fb3", "#18d6c4", "#5a2bd6"],
  ["#7aa7ff", "#c64cff", "#f3f0ff"],
  ["#f2b13c", "#ff2f8f", "#2f6cff"],
  ["#9b30ff", "#d25bff", "#5b7bff"],
  ["#1fe0c8", "#7a3cff", "#ff4fd8"],
];

function makePot(THREE, o, quality) {
  const R = quality ? 168 : 96, H = quality ? 120 : 64;
  const pos = [], col = [], idx = [];
  const c = o.palette.map(h => new THREE.Color(h));
  const tmp = new THREE.Color();
  for (let j = 0; j <= H; j++) {
    const t = j / H;
    for (let i = 0; i <= R; i++) {
      const a = (i / R) * TAU;
      const layer = .004 * Math.sin(t * 260); // линии слоёв печати
      const r = o.r * (PROF[o.prof](t) + SURF[o.surf](a, t, o) + layer);
      pos.push(Math.cos(a) * r, (t - .5) * o.h, Math.sin(a) * r);
      const m = (Math.cos(a + o.twist * t * 2 + o.phase) * .5 + .5);
      if (c.length === 2) tmp.copy(c[0]).lerp(c[1], m);
      else tmp.copy(m < .5 ? c[0] : c[1]).lerp(m < .5 ? c[1] : c[2], m < .5 ? m * 2 : (m - .5) * 2);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < R; i++) {
    const a = j * (R + 1) + i, b = a + R + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, side: THREE.DoubleSide, metalness: .55, roughness: .32,
    clearcoat: .5, clearcoatRoughness: .3, iridescence: .3, iridescenceIOR: 1.3,
  });
  const mesh = new THREE.Mesh(g, mat);
  // Донышко, чтобы снизу кашпо не было «пустым».
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(o.r * PROF[o.prof](0) * .98, 48), new THREE.MeshStandardMaterial({ color: c[0], roughness: .5, metalness: .2 }));
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = -o.h / 2;
  const grp = new THREE.Group(); grp.add(mesh, bottom);
  return grp;
}

// x, y — доля от половины видимой ширины/высоты; объекты держатся у краёв и в просветах.
const LAYOUT = [
  { surf: "tentacle", prof: "bulb", r: .66, h: 1.6, twist: 1.2, x: -.95, y: .86, z: -.5, tilt: -.25, spin: .18 },
  { surf: "daisy", prof: "cone", r: .62, h: 1.45, twist: 0, x: .04, y: .78, z: -2.4, tilt: .35, spin: -.16 },
  { surf: "facets", prof: "cyl", r: .58, h: 1.55, twist: 0, x: 1.0, y: .5, z: -1.6, tilt: .3, spin: .2 },
  { surf: "coral", prof: "hour", r: .62, h: 1.3, twist: 0, x: -.78, y: -.78, z: -1.4, tilt: .4, spin: .12 },
  { surf: "bubbles", prof: "cyl", r: .6, h: 1.25, twist: 0, x: .96, y: -.72, z: -.8, tilt: -.35, spin: -.14 },
  { surf: "ribs", prof: "bulb", r: .5, h: 1.2, twist: .8, n: 18, x: .1, y: -.86, z: -3.4, tilt: .3, spin: .22 },
];

export default function Hero3D() {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let stop = false, cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (stop) return;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
      catch { return; } // нет WebGL — фон просто не показывается
      const small = window.matchMedia("(max-width: 640px)").matches;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog("#090713", 13, 24);
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
      scene.environmentIntensity = .45;
      const cam = new THREE.PerspectiveCamera(35, 1, .1, 50);
      cam.position.set(0, 0, 10);
      scene.add(new THREE.AmbientLight("#5a3a7a", .5));
      const key = new THREE.DirectionalLight("#ffffff", 1.4); key.position.set(3, 5, 6); scene.add(key);
      const pink = new THREE.PointLight("#ff36cf", 40, 20); pink.position.set(-5, 2, 3); scene.add(pink);
      const cyan = new THREE.PointLight("#26f1dc", 34, 20); cyan.position.set(5, -3, 2); scene.add(cyan);

      const list = (small ? LAYOUT.slice(0, 4) : LAYOUT).map((L, i) => {
        const g = makePot(THREE, { ...L, n: L.n || 12, palette: PALETTES[i % PALETTES.length], phase: i * 1.7 }, !small);
        g.rotation.z = L.tilt; g.rotation.x = .25;
        scene.add(g);
        return { g, L, seed: i * 1.37 };
      });

      let W = 1, Hh = 1;
      const place = () => {
        W = el.clientWidth || 1; Hh = el.clientHeight || 1;
        renderer.setSize(W, Hh, false);
        cam.aspect = W / Hh; cam.updateProjectionMatrix();
        const halfH = Math.tan((cam.fov / 2) * Math.PI / 180) * cam.position.z, halfW = halfH * cam.aspect;
        list.forEach(({ g, L }) => {
          const k = (cam.position.z - L.z) / cam.position.z; // дальше — шире разброс
          const sx = small ? .82 : 1;
          g.userData.base = new THREE.Vector3(L.x * halfW * Math.min(k, 1) * .94 * sx, L.y * halfH * Math.min(k, 1), L.z);
          g.scale.setScalar(small ? .72 : Math.min(1.15, Math.max(.8, W / 1300)));
        });
      };
      place();

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = e => { mouse.tx = (e.clientX / window.innerWidth - .5); mouse.ty = (e.clientY / window.innerHeight - .5); };
      window.addEventListener("pointermove", onMove, { passive: true });

      let visible = true, raf = 0, last = performance.now(), time = 0;
      const frame = now => {
        raf = 0;
        const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
        mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
        list.forEach(({ g, L, seed }) => {
          const b = g.userData.base;
          g.position.set(b.x + mouse.x * (1.2 - L.z * .15), b.y + Math.sin(time * .6 + seed) * .12 - mouse.y * .6, b.z);
          g.rotation.y += L.spin * dt;
          g.rotation.z = L.tilt + Math.sin(time * .4 + seed) * .06;
        });
        renderer.render(scene, cam);
        if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame);
      };
      const kick = () => { if (!raf && !still && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
      io.observe(el);
      const onVis = () => kick();
      document.addEventListener("visibilitychange", onVis);
      // setSize очищает холст, поэтому после изменения размера кадр рисуется сразу.
      const ro = new ResizeObserver(() => { place(); renderer.render(scene, cam); kick(); });
      ro.observe(el);
      requestAnimationFrame(t => { frame(t); el.classList.add("on"); });

      cleanup = () => {
        cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
        window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis);
        scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
        pm.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    })();
    return () => { stop = true; cleanup(); };
  }, []);
  return <div ref={box} className="hero-3d" aria-hidden="true" />;
}
