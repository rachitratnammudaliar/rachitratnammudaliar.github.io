/* Rachit Ratnam Mudaliar: site behaviour. No libraries; the page works without it. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* Clickjacking guard: GitHub Pages can't send X-Frame-Options. */
  if (window.top !== window.self) {
    try { window.top.location.replace(window.self.location.href); }
    catch (e) { document.body.textContent = "This page can't be shown inside another site."; return; }
  }

  /* Theme: Auto -> Light -> Dark */
  var themeBtn = document.getElementById("themeToggle");
  var THEMES = ["auto", "light", "dark"];
  var LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
  var NAMES = { auto: "follow system", light: "light", dark: "dark" };

  function currentTheme() { return root.getAttribute("data-theme") || "auto"; }

  function applyTheme(theme) {
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      if (theme === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", theme);
    } catch (e) { /* storage blocked: the theme still applies for this visit */ }
    if (themeBtn) {
      themeBtn.querySelector(".tool__text").textContent = LABELS[theme];
      themeBtn.setAttribute("aria-label", "Colour theme: " + NAMES[theme]);
    }
  }

  if (themeBtn) {
    applyTheme(currentTheme());
    themeBtn.addEventListener("click", function () {
      applyTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
    });
  }

  /* Copy email */
  var copyBtn = document.getElementById("copyEmail");
  var copyStatus = document.getElementById("copyStatus");
  var timer;
  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(copyBtn.getAttribute("data-email")).then(function () {
        copyStatus.textContent = "Copied";
        clearTimeout(timer);
        timer = setTimeout(function () { copyStatus.textContent = ""; }, 2500);
      }, function () { copyStatus.textContent = "Couldn't copy. Select the address instead."; });
    });
  } else if (copyBtn) {
    copyBtn.hidden = true;
  }
})();
