/* Runs before React hydration — sets data-theme to avoid flash of wrong theme. */
(function () {
  try {
    var stored = localStorage.getItem("compound-theme");
    var resolved;
    if (stored === "dark") {
      resolved = "dark";
    } else if (stored === "light") {
      resolved = "light";
    } else {
      /* "system" or unset → default to light (design spec: light-first) */
      resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", resolved);
  } catch (e) {
    /* Private browsing or quota error — silently use light default */
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
