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


/* ===============================
   ROUTER & APP INIT
================================ */

const APP = {
  container: document.querySelector(".app .page"),

  init: async () => {
    const isOnboarded = localStorage.getItem("onboardingCompleted");

    if (!isOnboarded) {
      await APP.loadPage("pages/onboarding.html");
      // Initialize onboarding logic
      if (window.startOnboarding) {
        window.startOnboarding();
      }
    } else {
      await APP.loadPage("pages/home.html");
      // Add home initialization here if needed
    }
  },

  loadPage: async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();

      // Inject content
      APP.container.innerHTML = html;

    } catch (error) {
      console.error("Failed to load page:", error);
      APP.container.innerHTML = "<p>Error loading content.</p>";
    }
  }
};

// Start App when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", APP.init);
} else {
  APP.init();
}
