/* ===============================
   THEME MANAGEMENT
================================ */

/*
  Read saved theme from localStorage.
  Possible values:
  - "light"
  - "dark"
*/
const savedTheme = localStorage.getItem("theme");

/*
  If a theme was saved earlier,
  apply it to the document root (<html>).
*/
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

/*
  Toggle between light and dark theme.
  This function can be called from:
  - a button click
  - a menu option
*/
function toggleTheme() {
  /*
    Get current theme from <html>.
    If not set, assume light theme.
  */
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";

  /*
    Decide the next theme.
  */
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  /*
    Apply the new theme.
  */
  document.documentElement.setAttribute("data-theme", nextTheme);

  /*
    Persist theme choice so it survives reloads.
  */
  localStorage.setItem("theme", nextTheme);
}
