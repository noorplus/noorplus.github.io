/* =========================================================
   Noor Plus – app.js (Refactored + Safe Loader)
   Unified Application Controller
========================================================= */

// Globals
const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");
const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};

/* =========================================================
   CLEANUP FUNCTION
   (Stops intervals, removes listeners, etc. if needed)
========================================================= */
function cleanupPage() {
  // Example: clear intervals or timeouts between pages
  if (window.activeTimer) {
    clearInterval(window.activeTimer);
    window.activeTimer = null;
  }
}

/* =========================================================
   PAGE LOADER (Your Version – Preserved)
========================================================= */
function loadPage(page) {
  try {
    console.log("Loading Page:", page);

    // Cleanup previous page
    cleanupPage();

    // Validate page name - only lowercase letters and hyphens
    if (!page || typeof page !== "string" || !/^[a-z-]+$/.test(page)) {
      throw new Error("Invalid page name");
    }

    fetch(`pages/${page}.html`)
      .then(res => {
        if (!res.ok) throw new Error("Page not found: " + page);
        return res.text();
      })
      .then(html => {
        if (!html || html.trim().length === 0) {
          throw new Error("Page content is empty");
        }

        main.classList.remove("page-fade-in");
        void main.offsetWidth;
        main.innerHTML = html;
        main.classList.add("page-fade-in");

        // Update active nav button
        buttons.forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.querySelector(
          `.bottom-nav button[data-page="${page}"]`
        );
        if (activeBtn) activeBtn.classList.add("active");

        // Re-init modules conditionally
        if (window.lucide) lucide.createIcons();
        if (typeof initThemeToggle === "function") initThemeToggle();

        if (page === "home") initHomePage();
        else if (page === "quran") initQuranPage();
        else if (page === "menu") initSettingsPage();
      })
      .catch(err => {
        console.error("Navigation Error:", err);
        main.innerHTML = `
          <div style="padding:40px; text-align:center; color:var(--text-secondary);">
            <h3>Load Failed</h3>
            <p>${err.message}</p>
            <button onclick="location.reload()" style="margin-top:10px; padding:10px 20px; border-radius:10px; background:var(--accent); color:white; border:none;">Retry</button>
          </div>`;
      });
  } catch (err) {
    console.error("Page load error:", err);
  }
}

/* =========================================================
   INITIAL NAVIGATION EVENTS
========================================================= */
buttons.forEach(btn => {
  btn.addEventListener("click", () => loadPage(btn.dataset.page));
});

// Default
loadPage("home");

/* =========================================================
   HOME PAGE – TODAY'S PRAYER TIMES
========================================================= */
function initHomePage() {
  const prefs = JSON.parse(localStorage.getItem("noorPreferences"));
  if (!prefs || !prefs.location || !prefs.prayer) return;

  const { latitude, longitude, city, country } = prefs.location;
  const { method, asr } = prefs.prayer;
  const hijri = prefs.hijriOffset || 0;

  const locationEl = document.getElementById("home-location");
  const listEl = document.getElementById("prayer-list");
  const nextEl = document.getElementById("next-prayer");

  if (locationEl) locationEl.textContent = `${city}, ${country}`;
  if (listEl) listEl.innerHTML = "Loading prayer times…";

  const today = new Date().toISOString().split("T")[0];

  fetch(
    `https://api.aladhan.com/v1/timings/${today}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${asr}&adjustment=${hijri}`
  )
    .then(res => res.json())
    .then(data => {
      const t = data.data.timings;
      const prayers = [
        { key: "Fajr", label: "Fajr", time: t.Fajr },
        { key: "Sunrise", label: "Sunrise", time: t.Sunrise },
        { key: "Dhuhr", label: "Dhuhr", time: t.Dhuhr },
        { key: "Asr", label: "Asr", time: t.Asr },
        { key: "Maghrib", label: "Maghrib", time: t.Maghrib },
        { key: "Isha", label: "Isha", time: t.Isha }
      ];

      if (listEl) listEl.innerHTML = "";
      const now = new Date();
      let nextPrayer = null;

      prayers.forEach(p => {
        const row = document.createElement("div");
        row.className = "prayer-row";

        const timeDate = toTodayDate(p.time);
        if (!nextPrayer && timeDate > now) {
          row.classList.add("active");
          nextPrayer = { name: p.label, time: p.time };
        }

        row.innerHTML = `<span>${p.label}</span><strong>${p.time}</strong>`;
        listEl.appendChild(row);
      });

      if (nextEl) {
        if (nextPrayer)
          nextEl.textContent = `Next prayer: ${nextPrayer.name} at ${nextPrayer.time}`;
        else nextEl.textContent = "All prayers for today are completed.";
      }
    })
    .catch(() => {
      if (listEl) listEl.innerHTML = "Unable to load prayer times.";
    });
}

function toTodayDate(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/* =========================================================
   QURAN PAGE LOGIC (MERGED)
========================================================= */
function initQuranPage() {
  const surahList = document.getElementById("surah-list");
  const ayahView = document.getElementById("ayah-view");
  const ayahList = document.getElementById("ayah-list");
  const backBtn = document.getElementById("back-to-surah");

  if (!surahList) return;

  fetch("https://api.alquran.cloud/v1/surah")
    .then(res => res.json())
    .then(data => {
      surahList.innerHTML = "";
      data.data.forEach(surah => {
        const btn = document.createElement("button");
        btn.className = "surah-item";
        btn.textContent = `${surah.number}. ${surah.englishName}`;
        btn.onclick = () => loadSurah(surah.number);
        surahList.appendChild(btn);
      });
    });

  function loadSurah(number) {
    surahList.classList.add("hidden");
    ayahView.classList.remove("hidden");
    ayahList.innerHTML = "Loading…";

    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${number}/ar`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/en.asad`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${number}/bn.bengali`).then(r => r.json())
    ])
      .then(([ar, en, bn]) => {
        ayahList.innerHTML = "";
        ar.data.ayahs.forEach((ayah, i) => {
          const div = document.createElement("div");
          div.className = "ayah";
          div.innerHTML = `
            <p class="ayah-ar">${ayah.text}</p>
            <p class="ayah-bn">${bn.data.ayahs[i].text}</p>
            <p class="ayah-en">${en.data.ayahs[i].text}</p>
          `;
          ayahList.appendChild(div);
        });
      });
  }

  backBtn.onclick = () => {
    ayahView.classList.add("hidden");
    surahList.classList.remove("hidden");
  };
}

/* =========================================================
   SETTINGS PAGE (MENU)
========================================================= */
function initSettingsPage() {
  const prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};

  const langEn = document.getElementById("lang-en");
  const langBn = document.getElementById("lang-bn");

  if (langEn && langBn) {
    langEn.classList.toggle("active", prefs.language === "en");
    langBn.classList.toggle("active", prefs.language === "bn");
  }

  const hijriButtons = document.querySelectorAll(".hijri-option");
  hijriButtons.forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.value) === prefs.hijriOffset);
  });
}

/* =========================================================
   SETTINGS ACTIONS (GLOBAL)
========================================================= */
function updateLanguage(lang) {
  prefs.language = lang;
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
  initSettingsPage();
}

function updateHijri(offset) {
  prefs.hijriOffset = offset;
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
  initSettingsPage();
}

function updateTheme() {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}
