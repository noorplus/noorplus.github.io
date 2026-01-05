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

let currentAudio = null;
let currentPlayBtn = null;

function initQuranPage() {
  const surahListEl = document.getElementById("surah-list");
  const ayahViewEl = document.getElementById("ayah-view");
  const ayahListEl = document.getElementById("ayah-list");
  const backBtn = document.getElementById("back-to-surah");

  if (!surahListEl) return; // not on Quran page

  /* ===============================
     FETCH SURAH LIST
  ================================ */
  fetch("https://api.alquran.cloud/v1/surah")
    .then(res => res.json())
    .then(data => {
      surahListEl.innerHTML = "";

      data.data.forEach(surah => {
        const row = document.createElement("div");
        row.className = "surah-row";

        /* Surah info (LEFT) */
        const info = document.createElement("div");
        info.className = "surah-info";
        info.innerHTML = `
          <span class="surah-name">
            ${surah.number}. ${surah.englishName}
          </span>
          <span class="surah-ar">${surah.name}</span>
        `;
        info.onclick = () => loadSurah(surah.number);

        /* Play button (RIGHT) */
        const playBtn = document.createElement("button");
        playBtn.className = "surah-play";
        playBtn.textContent = "▶";

        playBtn.onclick = async (e) => {
          e.stopPropagation();
          await playSurahAudio(surah.number, playBtn);
        };

        row.appendChild(info);
        row.appendChild(playBtn);
        surahListEl.appendChild(row);
      });
    });

  /* ===============================
     LOAD SURAH AYAH
  ================================ */
  function loadSurah(number) {
    surahListEl.classList.add("hidden");
    ayahViewEl.classList.remove("hidden");
    ayahListEl.innerHTML = "<p>Loading Ayahs…</p>";

    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${number}/ar`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/bn.bengali`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/en.asad`).then(r => r.json())
    ]).then(([ar, bn, en]) => {
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

  /* ===============================
     BACK BUTTON
  ================================ */
  backBtn.onclick = () => {
    ayahViewEl.classList.add("hidden");
    surahListEl.classList.remove("hidden");
  };
}

/* ===============================
   SURAH AUDIO (OFFLINE CACHED)
================================ */
async function playSurahAudio(number, btn) {
  const url =
    `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;

  // Stop previous audio
  if (currentAudio) {
    currentAudio.pause();
    currentPlayBtn.textContent = "▶";
  }

  // Toggle same button
  if (currentPlayBtn === btn) {
    currentAudio = null;
    currentPlayBtn = null;
    return;
  }

  const audio = new Audio();
  const cache = await caches.open("quran-audio-v1");
  const cached = await cache.match(url);

  if (cached) {
    const blob = await cached.blob();
    audio.src = URL.createObjectURL(blob);
  } else {
    audio.src = url;
    fetch(url).then(res => cache.put(url, res.clone()));
  }

  audio.play();
  btn.textContent = "⏸";

  currentAudio = audio;
  currentPlayBtn = btn;

  audio.onended = () => {
    btn.textContent = "▶";
    currentAudio = null;
    currentPlayBtn = null;
  };
}
