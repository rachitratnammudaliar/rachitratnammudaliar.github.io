/* Opening animation: on a blank black page a few cursors work like robots,
   sweeping each part of the page into place, bit by bit. Plays once per visit.
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
    var els = document.querySelectorAll(".top, main > section, .foot, .hero *");
    for (var i = 0; i < els.length; i++) { els[i].style.transitionDelay = ""; els[i].style.clipPath = ""; els[i].style.opacity = ""; els[i].classList.add("intro-in"); }
    root.classList.remove("intro-on");
    if (canvas) {
      canvas.classList.add("intro__canvas--out");
      if (skipBtn) skipBtn.remove();
      setTimeout(function () { canvas.remove(); }, 700);
    }
  }
  /* Safety net: never leave the page hidden */
  timers.push(setTimeout(finish, 16000));

  function start() {
    try { run(); } catch (e) { finish(); }
  }

  function run() {
    var cs = getComputedStyle(root);
    var ink = cs.getPropertyValue("--ink").trim() || "#eef4f7";
    var c1 = cs.getPropertyValue("--eblue").trim() || "#0297de";
    var c2 = cs.getPropertyValue("--orange").trim() || "#fc734d";
    var COLS = [c1, c2, "#5cc3f2", "#ffb08f", "#eef4f7"];

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
    var W = window.innerWidth, H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    /* Blocks of the page. Those on screen get built by a cursor; the
       rest of the page is placed by the last cursor at the end. */
    var blocks = [].slice.call(document.querySelectorAll(".top, main > section, .foot"));
    var jobs = [], rest = [];
    function addJob(el, part) {
      var r = el.getBoundingClientRect();
      if (r.height < 8 || r.width < 8) return;
      var vis = Math.min(r.bottom, H) - r.top;
      jobs.push({ el: el, x: r.left, y: r.top, w: r.width, h: r.height, vis: Math.max(40, vis), part: part });
      if (part) el.style.clipPath = "inset(0 0 100% 0)";
    }
    /* The hero is built in pieces: backdrop first, then each part */
    var PARTS = ".hero__tags, .hero__name, .hero__lead, .orb, .hero__stats--left, .hero__stats--right, .hero__arrow, .hero__cards > *";
    blocks.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top >= H - 60) { rest.push(el); return; }
      addJob(el, false);
      if (el.classList.contains("hero")) {
        [].slice.call(el.querySelectorAll(PARTS)).forEach(function (c) {
          var cr = c.getBoundingClientRect();
          if (cr.top < H - 30) addJob(c, true);
        });
      }
    });

    var N = small() ? 4 : 5;
    function small() { return W < 640; }
    function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

    /* Robots: each has a queue of timed steps */
    var bots = [], i;
    for (i = 0; i < N; i++) {
      var sx = W / 2 + (i - (N - 1) / 2) * Math.min(90, W / (N + 1));
      bots.push({ col: COLS[i], x: sx, y: H / 2, steps: [], trail: [], vis: 0 });
    }
    var BASE = 500;
    jobs.forEach(function (j, k) { bots[k % N].steps.push({ type: "build", job: j }); });
    bots[N - 1].steps.push({ type: "rest" });
    bots.forEach(function (bt, idx) { bt.steps.push({ type: "leave" }); bt.start = BASE + idx * 260; });

    /* Expand each bot's steps into a timeline of segments */
    bots.forEach(function (bt) {
      var t = bt.start, px = bt.x, py = bt.y, seg = [];
      seg.push({ k: "pop", t0: bt.start - 350, t1: bt.start });
      bt.steps.forEach(function (st) {
        var tx, ty, dur;
        if (st.type === "build") { tx = st.job.x + 12; ty = st.job.y + 4; }
        else if (st.type === "rest") { tx = W / 2; ty = H - 30; }
        else { tx = W + 60; ty = H * 0.15 + Math.random() * H * 0.2; }
        var d = Math.hypot(tx - px, ty - py);
        dur = 600 + Math.min(1000, d * 1.0);
        seg.push({ k: "move", t0: t, t1: t + dur, x0: px, y0: py, x1: tx, y1: ty });
        t += dur; px = tx; py = ty;
        if (st.type === "build") {
          seg.push({ k: "click", t0: t, t1: t + 260, x: px, y: py });
          t += 260;
          var sd = 900 + Math.min(1100, st.job.vis * 1.2);
          seg.push({ k: "sweep", t0: t, t1: t + sd, job: st.job });
          t += sd; py = st.job.y + st.job.vis; px = st.job.x + st.job.w * 0.5;
          t += 120;
        } else if (st.type === "rest") {
          seg.push({ k: "click", t0: t, t1: t + 260, x: px, y: py });
          seg.push({ k: "place", t0: t + 120, t1: t + 1100 });
          t += 1300;
        }
      });
      bt.seg = seg; bt.end = t;
    });
    var T_END = Math.max.apply(null, bots.map(function (b) { return b.end; })) + 200;

    function arrow(x, y, rot, s, col, alpha) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.2, 13.2); ctx.lineTo(7.1, 19.6);
      ctx.lineTo(9.8, 18.4); ctx.lineTo(7, 12.2); ctx.lineTo(12.4, 12.2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 1.2; ctx.strokeStyle = "#000"; ctx.stroke();
      ctx.restore();
    }

    var placed = false;
    function placeRest() {
      if (placed) return; placed = true;
      rest.forEach(function (el, idx) {
        el.style.transitionDelay = (idx * 140) + "ms";
        el.classList.add("intro-in");
      });
    }

    var t0 = performance.now();
    function frame(now) {
      if (done) return;
      var t = now - t0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      for (var b = 0; b < bots.length; b++) {
        var bt = bots[b], x = bt.x, y = bt.y, alpha = 0, scale = 1, wobble = 0;
        for (var s = 0; s < bt.seg.length; s++) {
          var g = bt.seg[s];
          if (t < g.t0) break;
          var u = (t - g.t0) / (g.t1 - g.t0);
          if (g.k === "pop") { alpha = ease(u); scale = 0.4 + 0.6 * ease(u); }
          else if (g.k === "move") {
            var e = ease(u);
            x = g.x0 + (g.x1 - g.x0) * e; y = g.y0 + (g.y1 - g.y0) * e;
            alpha = 1; if (u >= 1) { x = g.x1; y = g.y1; }
          } else if (g.k === "click") {
            x = g.x; y = g.y; alpha = 1;
            if (u >= 0 && u <= 1) {
              ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = bt.col; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(g.x, g.y, 6 + 34 * u, 0, 7); ctx.stroke(); ctx.restore();
              scale = 1 - 0.18 * Math.sin(u * Math.PI);
            }
          } else if (g.k === "sweep") {
            var j = g.job, p = ease(u);
            var ry = j.y + p * j.vis;
            if (u < 1) {
              if (!j.part) j.el.style.opacity = "1";
              j.el.style.clipPath = "inset(0 0 " + Math.max(0, j.h - (ry - j.y)) + "px 0)";
              /* scan line + dashed frame, like a robot laying out the block */
              ctx.save();
              ctx.strokeStyle = bt.col; ctx.lineWidth = 1;
              ctx.globalAlpha = 0.35; ctx.setLineDash([6, 6]);
              ctx.strokeRect(j.x + 0.5, j.y + 0.5, j.w - 1, Math.min(j.h, H - j.y) - 1);
              ctx.globalAlpha = 0.9; ctx.setLineDash([]); ctx.shadowColor = bt.col; ctx.shadowBlur = 10;
              ctx.beginPath(); ctx.moveTo(j.x, ry); ctx.lineTo(j.x + j.w, ry); ctx.stroke();
              ctx.restore();
            } else { if (!j.part) j.el.style.opacity = "1"; j.el.style.clipPath = ""; }
            /* zig-zag across the block, always at the scan line */
            x = j.x + j.w * (0.5 + 0.42 * Math.sin(Math.min(u, 1) * Math.PI * (3 + j.vis / 300)));
            y = Math.min(ry, H - 8); alpha = 1;
          } else if (g.k === "place") {
            placeRest(); alpha = 1; x = W / 2 + Math.sin(u * 6) * W * 0.3; y = H - 30;
          }
        }
        if (alpha > 0) {
          /* trail */
          bt.trail.push([x, y]); if (bt.trail.length > 14) bt.trail.shift();
          ctx.save(); ctx.lineCap = "round";
          for (var q = 1; q < bt.trail.length; q++) {
            ctx.globalAlpha = (q / bt.trail.length) * 0.35 * alpha;
            ctx.strokeStyle = bt.col; ctx.lineWidth = 1 + q * 0.15;
            ctx.beginPath(); ctx.moveTo(bt.trail[q - 1][0], bt.trail[q - 1][1]);
            ctx.lineTo(bt.trail[q][0], bt.trail[q][1]); ctx.stroke();
          }
          ctx.restore();
          arrow(x, y, 0, 1.25 * scale, bt.col, alpha);
        }
      }

      if (t >= T_END) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(function (now) { t0 = now; frame(now); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
