
const appMain = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

function loadPage(page) {
  fetch(`pages/${page}.html`)
    .then(r => r.text())
    .then(html => {
      appMain.innerHTML = html;
      if (page === "home") initHome();
    });
}

buttons.forEach(btn =>
  btn.addEventListener("click", () => loadPage(btn.dataset.page))
);

loadPage("home");

function initHome() {
  const prefs = JSON.parse(localStorage.getItem("noorPreferences"));
  if (!prefs) return;
}
