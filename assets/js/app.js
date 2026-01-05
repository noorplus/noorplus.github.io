const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

/* ===============================
   LOAD PAGE
================================ */
function loadPage(page) {
  fetch(`pages/${page}.html`)
    .then(res => res.text())
    .then(html => {
      main.innerHTML = html;

      // Active nav state
      buttons.forEach(btn => btn.classList.remove("active"));
      document
        .querySelector(`[data-page="${page}"]`)
        ?.classList.add("active");

      // 🔥 Re-bind page-specific JS
      initThemeToggle();
      initQuranPage(); // ✅ ADD THIS LINE
    });
}

/* ===============================
   THEME TOGGLE (SAFE)
================================ */
function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");

  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme");

    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);

    localStorage.setItem("theme", nextTheme);
  });
}

/* ===============================
   INITIAL LOAD
================================ */
loadPage("home");

/* ===============================
   NAV CLICK
================================ */
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    loadPage(btn.dataset.page);
  });
});

/* ===============================
   LOAD SAVED THEME (GLOBAL)
================================ */
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

/* ===============================
   QURAN PAGE LOGIC
================================ */
function initQuranPage() {
  const surahListEl = document.getElementById("surah-list");
  const ayahViewEl = document.getElementById("ayah-view");
  const ayahListEl = document.getElementById("ayah-list");
  const backBtn = document.getElementById("back-to-surah");

  if (!surahListEl) return; // not on Quran page

  // Fetch Surah list
  fetch("https://api.alquran.cloud/v1/surah")
    .then(res => res.json())
    .then(data => {
      surahListEl.innerHTML = "";

      data.data.forEach(surah => {
        const btn = document.createElement("button");
        btn.className = "surah-item";
        btn.textContent = `${surah.number}. ${surah.englishName} (${surah.name})`;

        btn.onclick = () => loadSurah(surah.number);
        surahListEl.appendChild(btn);
      });
    });

  // Load Surah with translations
  function loadSurah(number) {
    surahListEl.classList.add("hidden");
    ayahViewEl.classList.remove("hidden");
    ayahListEl.innerHTML = "<p>Loading Ayahs…</p>";

    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${number}/ar`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/en.asad`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/bn.bengali`).then(r => r.json())
    ])
      .then(([ar, en, bn]) => {
        ayahListEl.innerHTML = "";

        ar.data.ayahs.forEach((ayah, i) => {
          const div = document.createElement("div");
          div.className = "ayah";

          div.innerHTML = `
            <p class="ayah-ar">${ayah.text}</p>
            <p class="ayah-bn">${bn.data.ayahs[i].text}</p>
            <p class="ayah-en">${en.data.ayahs[i].text}</p>
          `;

          ayahListEl.appendChild(div);
        });
      });
  }

  // Back button
  backBtn.onclick = () => {
    ayahViewEl.classList.add("hidden");
    surahListEl.classList.remove("hidden");
  };
}
