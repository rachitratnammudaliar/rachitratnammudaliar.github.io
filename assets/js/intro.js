/* Opening animation: a ring of cursor arrows spins, bursts apart, and the
   arrows fly off to build the page. Plays once per visit.
   External file because the security policy blocks inline scripts.
   If anything here fails, the page is shown normally. */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---- Decide whether to play (runs before first paint) ---- */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("intro-seen") === "1"; } catch (e) { /* storage blocked: just play */ }
  if (reduce || seen || window.top !== window.self || location.hash.length > 1) return;
  root.classList.add("intro-on");

  var done = false;
  var canvas, ctx, skipBtn, raf, timers = [];

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    try { sessionStorage.setItem("intro-seen", "1"); } catch (e) { /* ignore */ }
    var els = document.querySelectorAll(".top, main > section, .foot");
    for (var i = 0; i < els.length; i++) { els[i].style.transitionDelay = ""; els[i].classList.add("intro-in"); }
    root.classList.remove("intro-on");
    if (canvas) {
      canvas.classList.add("intro__canvas--out");
      if (skipBtn) skipBtn.remove();
      setTimeout(function () { canvas.remove(); }, 700);
    }
  }
  /* Safety net: never leave the page hidden */
  timers.push(setTimeout(finish, 9000));

  function start() {
    try { run(); } catch (e) { finish(); }
  }

  function run() {
    var cs = getComputedStyle(root);
    var bg = cs.getPropertyValue("--paper").trim() || "#02070a";
    var c1 = cs.getPropertyValue("--accent").trim() || "#0297de";
    var c2 = cs.getPropertyValue("--orange").trim() || "#fc734d";
    var ink = cs.getPropertyValue("--ink").trim() || "#eef4f7";

    canvas = document.createElement("canvas");
    canvas.className = "intro__canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    if (!ctx) { finish(); return; }

    skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "intro__skip";
    skipBtn.textContent = "Skip intro";
    skipBtn.addEventListener("click", finish);
    document.body.appendChild(skipBtn);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") finish(); });

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H;
    function size() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    size();

    /* Targets: the blocks of the page the arrows will build */
    var blocks = [].slice.call(document.querySelectorAll(".top, main > section, .foot"));
    var rects = blocks.map(function (el) {
      var r = el.getBoundingClientRect();
      var top = Math.max(0, Math.min(r.top, H - 40));
      var bottom = Math.max(top + 30, Math.min(r.bottom, H));
      return { x: Math.max(0, r.left), y: top, w: Math.max(40, Math.min(r.width, W)), h: bottom - top };
    });
    var hero = rects[1] || rects[0];

    var small = W < 640;
    var OUTER = small ? 44 : 72, INNER = small ? 22 : 36;
    var R0 = Math.min(W, H) * (small ? 0.3 : 0.26);
    var cx = W / 2, cy = H / 2;

    var P = [], i, n = OUTER + INNER;
    for (i = 0; i < n; i++) {
      var outer = i < OUTER;
      var k = outer ? i / OUTER : (i - OUTER) / INNER;
      var tgtRect = rects[i % rects.length];
      P.push({
        ring: outer ? 0 : 1,
        a: k * Math.PI * 2,
        r: outer ? R0 : R0 * 0.58,
        from: Math.random() * Math.PI * 2,
        fromD: Math.max(W, H) * (0.7 + Math.random() * 0.5),
        burstA: k * Math.PI * 2 + (Math.random() - 0.5) * 1.2,
        burstD: Math.max(W, H) * (0.18 + Math.random() * 0.34),
        tx: tgtRect.x + Math.random() * tgtRect.w,
        ty: tgtRect.y + Math.random() * tgtRect.h,
        col: Math.random() < 0.28 ? c2 : (outer ? c1 : ink),
        s: (outer ? 1 : 0.8) * (small ? 0.85 : 1.1) * (0.85 + Math.random() * 0.3),
        late: Math.random() * 260
      });
    }

    /* Timeline (ms) */
    var T_GATHER = 900, T_BURST = 2700, T_HOME = 3250, T_END = 4700;
    function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
    function easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }
    function spin(t) { return 0.0006 * t + 3.4e-6 * t * t; }

    function ringPos(p, t) {
      var th = spin(t) * (p.ring ? -1.35 : 1);
      var pulse = 1 + 0.05 * Math.sin(t / 140);
      var a = p.a + th;
      var r = p.r * pulse;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, rot: a + Math.PI * 0.75 + (p.ring ? Math.PI : 0) };
    }

    /* Arrow cursor, tip at the origin, pointing up-left like a real pointer */
    function arrow(x, y, rot, s, col, alpha) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.2, 13.2); ctx.lineTo(7.1, 19.6);
      ctx.lineTo(9.8, 18.4); ctx.lineTo(7, 12.2); ctx.lineTo(12.4, 12.2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = bg; ctx.stroke();
      ctx.restore();
    }

    var revealed = false;
    function reveal() {
      if (revealed) return; revealed = true;
      blocks.forEach(function (el, idx) {
        el.style.transitionDelay = (idx * 110) + "ms";
        el.classList.add("intro-in");
      });
    }

    var t0 = performance.now();
    function frame(now) {
      if (done) return;
      var t = now - t0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Backdrop fades out while the page assembles */
      var veil = 1 - ease((t - T_HOME) / (T_END - T_HOME - 300));
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = veil;
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      /* Glow at the core while spinning */
      if (t < T_BURST + 200) {
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 1.3);
        var gl = ease(t / T_GATHER) * (1 - ease((t - T_BURST) / 300));
        g.addColorStop(0, "rgba(2,151,222," + (0.28 * gl) + ")");
        g.addColorStop(1, "rgba(2,151,222,0)");
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      for (i = 0; i < P.length; i++) {
        var p = P[i], x, y, rot, alpha = 1, s = p.s;
        if (t < T_GATHER) {
          var u = easeOut((t - p.late * 0.5) / (T_GATHER - 260));
          var rp = ringPos(p, t);
          var sx = cx + Math.cos(p.from) * p.fromD, sy = cy + Math.sin(p.from) * p.fromD;
          x = sx + (rp.x - sx) * u; y = sy + (rp.y - sy) * u; rot = rp.rot + (1 - u) * 3;
          alpha = Math.min(1, u * 2);
        } else if (t < T_BURST) {
          var q = ringPos(p, t); x = q.x; y = q.y; rot = q.rot;
        } else {
          var b = ringPos(p, T_BURST);
          var bx = b.x + Math.cos(p.burstA) * p.burstD, by = b.y + Math.sin(p.burstA) * p.burstD;
          if (t < T_HOME + p.late) {
            var ub = easeOut((t - T_BURST) / (T_HOME + p.late - T_BURST));
            x = b.x + (bx - b.x) * ub; y = b.y + (by - b.y) * ub;
            rot = b.rot + ub * 2.2 * (p.ring ? -1 : 1);
            s = p.s * (1 + 0.35 * Math.sin(ub * Math.PI));
          } else {
            var uh = ease((t - T_HOME - p.late) / (T_END - T_HOME - p.late - 500));
            x = bx + (p.tx - bx) * uh; y = by + (p.ty - by) * uh;
            rot = b.rot + 2.2 * (p.ring ? -1 : 1) * (1 - uh);
            alpha = 1 - ease((uh - 0.7) / 0.3);
          }
        }
        if (alpha > 0.01) arrow(x, y, rot, s, p.col, alpha);
      }

      if (t >= T_BURST + 500) reveal();
      if (t >= T_END) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", size);
    raf = requestAnimationFrame(function (now) { t0 = now; frame(now); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
