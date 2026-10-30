/* =============================================================
   Rachit Ratnam Mudaliar — site behaviour
   No libraries. Every feature works without the others.
   ============================================================= */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme: Auto -> Light -> Dark ---------- */
  var themeBtn = document.getElementById("themeToggle");
  var THEMES = ["auto", "light", "dark"];
  var LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
  var NAMES = { auto: "follow system", light: "light", dark: "dark" };

  function currentTheme() {
    return root.getAttribute("data-theme") || "auto";
  }

  function applyTheme(theme) {
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      if (theme === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", theme);
    } catch (e) { /* storage blocked: theme still applies for this visit */ }
    if (themeBtn) {
      themeBtn.querySelector(".tool__text").textContent = LABELS[theme];
      themeBtn.setAttribute("aria-label", "Colour theme: " + NAMES[theme]);
    }
  }

  if (themeBtn) {
    applyTheme(currentTheme());
    themeBtn.addEventListener("click", function () {
      var next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
      applyTheme(next);
    });
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById("copyEmail");
  var copyStatus = document.getElementById("copyStatus");
  var copyTimer;

  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email");
      navigator.clipboard.writeText(email).then(function () {
        copyBtn.textContent = "Copied";
        copyStatus.textContent = "Email address copied to clipboard.";
      }, function () {
        copyStatus.textContent = "Couldn't copy. Select the address and copy it instead.";
      });
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        copyBtn.textContent = "Copy";
        copyStatus.textContent = "";
      }, 2500);
    });
  } else if (copyBtn) {
    copyBtn.hidden = true; // no Clipboard API (old browser or insecure context)
  }

  /* ---------- Footer: year and Kaunas local time ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var timeEl = document.getElementById("localTime");
  function tick() {
    try {
      var t = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vilnius"
      }).format(new Date());
      timeEl.textContent = t + " local time";
    } catch (e) { /* keep the static fallback text */ }
  }
  if (timeEl) { tick(); setInterval(tick, 30000); }

  /* ---------- Highlight the section in view ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
          link.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---------- Profile card: only stick it if it fits the screen ---------- */
  var card = document.querySelector(".card");
  function fitCard() {
    if (!card) return;
    card.classList.remove("card--tall");
    var header = document.querySelector(".top");
    var room = window.innerHeight - (header ? header.offsetHeight : 0);
    if (card.offsetHeight > room) card.classList.add("card--tall");
  }
  fitCard();
  window.addEventListener("resize", fitCard);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCard);

  /* ---------- Inspect mode ---------- */
  var inspectBtn = document.getElementById("inspectToggle");
  var report = document.getElementById("report");
  var reportClose = document.getElementById("reportClose");

  function kb(bytes) {
    if (!bytes) return "–";
    return bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(1) + " KB";
  }

  function fillReport() {
    var set = function (id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var resources = performance.getEntriesByType ? performance.getEntriesByType("resource") : [];
    var total = nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0;
    resources.forEach(function (r) { total += r.transferSize || r.encodedBodySize || 0; });

    var here = location.host;
    var third = resources.filter(function (r) {
      try { return new URL(r.name).host !== here; } catch (e) { return false; }
    }).length;

    set("rSize", total ? kb(total) : "cached");
    set("rReq", String(resources.length + 1));
    set("rThird", String(third));
    set("rTime", nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) + " ms" : "–");
    set("rDom", String(document.getElementsByTagName("*").length));

    var types = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
      try {
        var data = JSON.parse(s.textContent);
        (data["@graph"] || [data]).forEach(function (node) { if (node["@type"]) types.push(node["@type"]); });
      } catch (e) { types.push("invalid JSON"); }
    });
    set("rSchema", types.length ? types.join(", ") : "none");

    var csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    set("rCsp", csp ? csp.getAttribute("content").split("; ").join(";\n") : "none");
  }

  function setInspect(on) {
    root.classList.toggle("inspecting", on);
    if (inspectBtn) inspectBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (report) {
      report.hidden = !on;
      if (on) fillReport();
    }
  }

  if (inspectBtn) {
    inspectBtn.addEventListener("click", function () {
      setInspect(!root.classList.contains("inspecting"));
    });
  }
  if (reportClose) {
    reportClose.addEventListener("click", function () {
      setInspect(false);
      if (inspectBtn) inspectBtn.focus();
    });
  }

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key === "i" || e.key === "I") setInspect(!root.classList.contains("inspecting"));
    if (e.key === "Escape" && root.classList.contains("inspecting")) setInspect(false);
  });

  // Share a link with #inspect to open the page in inspect mode.
  if (location.hash === "#inspect") setInspect(true);
})();
