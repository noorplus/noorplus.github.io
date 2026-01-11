const root = document.getElementById("app-root");

const completed = localStorage.getItem("onboardingCompleted") === "true";

if (!completed) {
  loadOnboarding();
} else {
  loadHome();
}

function loadOnboarding() {
  fetch("pages/onboarding.html")
    .then(r => r.text())
    .then(html => {
      root.innerHTML = html;
      const s = document.createElement("script");
      s.src = "assets/js/onboarding.js";
      document.body.appendChild(s);
    });
}

function loadHome() {
  fetch("pages/home.html")
    .then(r => r.text())
    .then(html => {
      root.innerHTML = html;
      const s = document.createElement("script");
      s.src = "assets/js/home.js";
      document.body.appendChild(s);
    });
}
