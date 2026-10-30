/* Runs before the page paints so the saved theme never flashes.
   Kept in its own file because the security policy blocks inline scripts. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) { /* storage blocked */ }
  if (saved === "light" || saved === "dark") {
    document.documentElement.setAttribute("data-theme", saved);
  }
})();
