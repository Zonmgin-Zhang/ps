/* Cursor trail effect (mouse only): colorful particle trail.
 * - Disabled on touch devices and when prefers-reduced-motion is set
 * - Non-interactive overlay (pointer-events: none)
 */

(() => {
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noHover = window.matchMedia && window.matchMedia("(hover: none)").matches;
  const hasTouch =
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);

  if (prefersReducedMotion || noHover || hasTouch) return;

  const canvas = document.createElement("canvas");
  canvas.id = "cursor-trail-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const state = {
    dpr: 1,
    w: 0,
    h: 0,
    points: [],
    maxPoints: 170,
    last: null,
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function resize() {
    state.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    state.w = Math.floor(window.innerWidth * state.dpr);
    state.h = Math.floor(window.innerHeight * state.dpr);
    canvas.width = state.w;
    canvas.height = state.h;
  }

  function pushPoint(x, y, hue) {
    const now = performance.now();
    state.points.push({
      x: x * state.dpr,
      y: y * state.dpr,
      r: (1.4 + Math.random() * 2.2) * state.dpr,
      born: now,
      ttl: 650 + Math.random() * 350, // ms
      hue,
      vx: (Math.random() - 0.5) * 0.12 * state.dpr,
      vy: (Math.random() - 0.5) * 0.12 * state.dpr,
    });

    if (state.points.length > state.maxPoints) {
      state.points.splice(0, state.points.length - state.maxPoints);
    }
  }

  function spawnAlongLine(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const step = 10; // px
    const n = Math.max(1, Math.min(16, Math.floor(dist / step)));

    const baseHue = (performance.now() * 0.08) % 360;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 1 : (i + 1) / n;
      const hue = (baseHue + i * 10) % 360;
      pushPoint(x0 + dx * t, y0 + dy * t, hue);
    }
  }

  function onPointerMove(e) {
    if (e.pointerType !== "mouse") return;
    const x = e.clientX;
    const y = e.clientY;

    if (state.last) {
      spawnAlongLine(state.last.x, state.last.y, x, y);
    } else {
      const hue = (performance.now() * 0.08) % 360;
      pushPoint(x, y, hue);
    }

    state.last = { x, y };
  }

  function tick(now) {
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.globalCompositeOperation = "lighter";

    const next = [];
    for (const p of state.points) {
      const age = now - p.born;
      const t = clamp(age / p.ttl, 0, 1);
      const alpha = 1 - t;
      if (alpha <= 0.001) continue;

      p.x += p.vx;
      p.y += p.vy;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${0.35 * alpha})`;
      ctx.fill();

      next.push(p);
    }

    state.points = next;
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  requestAnimationFrame(tick);
})();

