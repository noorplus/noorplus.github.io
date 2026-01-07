const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

/* ===============================
   CORE UTILITIES
================================ */
function formatTo12h(time24) {
  if (!time24) return "--:--";
  let [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

function loadPage(page) {
  console.log("Loading Page:", page);
  if (window.prayerTimer) {
    clearInterval(window.prayerTimer);
    window.prayerTimer = null;
  }

  fetch(`pages/${page}.html`)
    .then(res => {
      if (!res.ok) throw new Error("Page not found: " + page);
      return res.text();
    })
    .then(html => {
      main.classList.remove("page-fade-in");
      void main.offsetWidth;
      main.innerHTML = html;
      main.classList.add("page-fade-in");

      // Update active nav button
      buttons.forEach(btn => btn.classList.remove("active"));
      const activeBtn = document.querySelector(`.bottom-nav button[data-page="${page}"]`);
      if (activeBtn) activeBtn.classList.add("active");

      // Re-init modules
      if (window.lucide) lucide.createIcons();
      initThemeToggle();
      initQuranPage();
      initHomePage();
    })
    .catch(err => {
      console.error("Navigation Error:", err);
      main.innerHTML = `<div style="padding:40px; text-align:center; color:var(--alert);">
        <h3>Load Failed</h3>
        <p>${err.message}</p>
        <button onclick="location.reload()" style="margin-top:10px; padding:10px 20px; border-radius:10px; background:var(--primary); color:white; border:none;">Retry</button>
      </div>`;
    });
}

function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;
  toggleBtn.onclick = () => {
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };
}

/* ===============================
   INITIAL LOAD & PREFERENCES
================================ */
function restorePreferences() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

// Global initialization
(function startup() {
  try {
    restorePreferences();
    loadPage("home");

    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-page]");
      if (target) {
        const page = target.getAttribute("data-page");
        loadPage(page);
      }
    });

    console.log("NoorPlus StartUp Complete");
  } catch (err) {
    console.error("Critical Startup Failure:", err);
  }
})();

/* ===============================
   GLOBAL QURAN MODULE
================================ */
let currentAudio = null;
let currentPlayBtn = null;

function initQuranPage() {
  const surahListEl = document.getElementById("surah-list");
  const qMainViewEl = document.getElementById("quran-main-view");
  const ayahViewEl = document.getElementById("ayah-view");
  const ayahListEl = document.getElementById("ayah-list");
  const qBackBtn = document.getElementById("q-back-btn");
  const qHeaderTitle = document.getElementById("q-header-title");
  const qHeaderAction = document.getElementById("q-header-action");
  const qPlayer = document.getElementById("q-player");

  if (!surahListEl) return;

  // Cache for Surah Metadata
  window.quranSurahs = window.quranSurahs || [];

  // Reset Header to default Al-Quran state
  qHeaderTitle.textContent = "Al-Quran";
  if (window.lucide) {
    qHeaderAction.innerHTML = `<i data-lucide="search"></i>`;
    lucide.createIcons();
  }

  // Handle Unified Header Back Button
  if (qBackBtn) {
    qBackBtn.onclick = () => {
      if (!ayahViewEl.classList.contains("hidden")) {
        ayahViewEl.classList.add("hidden");
        qMainViewEl.classList.remove("hidden");
        qPlayer.classList.add("hidden");
        qHeaderTitle.textContent = "Al-Quran";
        qHeaderAction.innerHTML = `<i data-lucide="search"></i>`;
        if (window.lucide) lucide.createIcons();
      } else {
        loadPage("home");
      }
    };
  }

  fetch("https://api.alquran.cloud/v1/surah")
    .then(res => res.json())
    .then(data => {
      window.quranSurahs = data.data;
      surahListEl.innerHTML = "";
      data.data.forEach(surah => {
        const item = document.createElement("div");
        item.className = "q-item";
        item.onclick = () => window.loadSurah(surah.number);
        item.innerHTML = `
          <div class="q-star-badge">${surah.number}</div>
          <div class="q-item-info">
            <span class="q-item-name">${surah.englishName}</span>
            <span class="q-item-meta">Verses: ${surah.numberOfAyahs} | ${surah.revelationType}</span>
          </div>
          <span class="q-item-ar">${surah.name}</span>
        `;
        surahListEl.appendChild(item);
      });
    });

  window.loadSurah = function (number) {
    const meta = window.quranSurahs.find(s => s.number === number);
    if (!meta) return;

    qHeaderTitle.textContent = meta.englishName;
    qHeaderAction.innerHTML = `<i data-lucide="settings-2"></i>`;
    if (window.lucide) lucide.createIcons();

    qMainViewEl.classList.add("hidden");
    ayahViewEl.classList.remove("hidden");
    ayahListEl.innerHTML = '<p class="q-loading">Loading Surah Details...</p>';

    // Update Detail Card
    document.getElementById("det-name").textContent = meta.englishName;
    document.getElementById("det-meaning").textContent = meta.englishNameTranslation;
    document.getElementById("det-revelation").textContent = meta.revelationType;
    document.getElementById("det-ayahs").textContent = meta.numberOfAyahs;

    // Fetch Ayahs: Arabic, Transliteration, English Translation
    fetch(`https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,en.transliteration,en.asad`)
      .then(res => res.json())
      .then(data => {
        ayahListEl.innerHTML = "";
        const ar = data.data[0];
        const tr = data.data[1];
        const en = data.data[2];

        ar.ayahs.forEach((ayah, i) => {
          const item = document.createElement("div");
          item.className = "ayah-item";
          item.innerHTML = `
            <div class="ayah-header-bar">
              <span class="ayah-num">${ayah.numberInSurah}</span>
              <div class="ayah-actions">
                <i data-lucide="play" onclick="playSurahAudio(${number}, this)"></i>
                <i data-lucide="bookmark"></i>
                <i data-lucide="book-open"></i>
                <i data-lucide="share-2"></i>
              </div>
            </div>
            <div class="ayah-content">
              <p class="ayah-ar">${ayah.text}</p>
              <p class="ayah-trans">${tr.ayahs[i].text}</p>
              <p class="ayah-en">${en.ayahs[i].text}</p>
            </div>
          `;
          ayahListEl.appendChild(item);
        });
        if (window.lucide) lucide.createIcons();
      });
  };
}

let quranAudio = new Audio();
let isPlaying = false;

window.playSurahAudio = function (number, btn) {
  const player = document.getElementById("q-player");
  const playBtn = document.getElementById("p-play");
  const stopBtn = document.getElementById("p-stop");

  player.classList.remove("hidden");

  if (isPlaying && quranAudio.src.includes(`/${number}.mp3`)) {
    quranAudio.pause();
    isPlaying = false;
    playBtn.innerHTML = `<i data-lucide="play"></i>`;
  } else {
    quranAudio.src = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;
    quranAudio.play();
    isPlaying = true;
    playBtn.innerHTML = `<i data-lucide="pause"></i>`;
  }

  if (window.lucide) lucide.createIcons();

  stopBtn.onclick = () => {
    quranAudio.pause();
    quranAudio.currentTime = 0;
    isPlaying = false;
    player.classList.add("hidden");
  };

  playBtn.onclick = () => {
    if (isPlaying) {
      quranAudio.pause();
      isPlaying = false;
      playBtn.innerHTML = `<i data-lucide="play"></i>`;
    } else {
      quranAudio.play();
      isPlaying = true;
      playBtn.innerHTML = `<i data-lucide="pause"></i>`;
    }
    if (window.lucide) lucide.createIcons();
  };

  quranAudio.onended = () => {
    isPlaying = false;
    playBtn.innerHTML = `<i data-lucide="play"></i>`;
    if (window.lucide) lucide.createIcons();
  };
};

/* ===============================
   ADVANCED DASHBOARD MODULE
================================ */
function initHomePage() {
  const dateEl = document.getElementById("adv-date");
  if (!dateEl) return;

  const now = new Date();
  const d = now.getDate().toString().padStart(2, "0");
  const m = now.toLocaleDateString("en-GB", { month: "short" });
  const y = now.getFullYear();
  dateEl.textContent = `${d} ${m}, ${y}`;
  renderTracker();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchAdvPrayerTimes(pos.coords.latitude, pos.coords.longitude),
      () => fetchAdvPrayerTimes(23.8103, 90.4125)
    );
  } else {
    fetchAdvPrayerTimes(23.8103, 90.4125);
  }

  document.querySelectorAll(".t-btn").forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains("upcoming") || btn.classList.contains("missed")) return;
      toggleTracker(btn.dataset.p);
    };
  });
}

async function fetchAdvPrayerTimes(lat, lon) {
  try {
    // Method 1: University of Islamic Sciences, Karachi (Standard for South Asia)
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=1`);
    const json = await res.json();
    const timings = json.data.timings;
    const meta = json.data.meta;

    const locEl = document.getElementById("adv-location");
    if (locEl) locEl.textContent = meta.timezone.split("/")[1]?.replace(/_/g, " ") || "Dhaka";

    const suhurEl = document.getElementById("adv-suhur");
    const iftarEl = document.getElementById("adv-iftar");
    if (suhurEl) suhurEl.textContent = formatTo12h(timings.Fajr);
    if (iftarEl) iftarEl.textContent = formatTo12h(timings.Maghrib);

    ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(p => {
      const el = document.getElementById(`s-${p}`);
      if (el) el.textContent = formatTo12h(timings[p]);
    });

    startAdvCountdown(timings);
  } catch (err) {
    console.error("API Fetch Error:", err);
  }
}

function getForbiddenTimes(timings) {
  const sunrise = timings.Sunrise;
  const dhuhr = timings.Dhuhr;
  const maghrib = timings.Maghrib;

  const addMins = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m + mins, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (!sunrise || !dhuhr || !maghrib) return [];

  return [
    { name: "Sunrise Forbidden", start: sunrise, end: addMins(sunrise, 15) },
    { name: "Zawal Forbidden", start: addMins(dhuhr, -15), end: dhuhr },
    { name: "Sunset Forbidden", start: addMins(maghrib, -15), end: maghrib }
  ];
}

function startAdvCountdown(timings) {
  if (window.prayerTimer) clearInterval(window.prayerTimer);

  const prayerSchedule = [
    { name: "Fajr", time: timings.Fajr },
    { name: "Dhuhr", time: timings.Dhuhr },
    { name: "Asr", time: timings.Asr },
    { name: "Maghrib", time: timings.Maghrib },
    { name: "Isha", time: timings.Isha }
  ];

  function update() {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const forbiddenList = getForbiddenTimes(timings);

    // 1. Detect Forbidden Time
    const currentForbidden = forbiddenList.find(f => nowStr >= f.start && nowStr < f.end);
    const statusDot = document.getElementById("adv-status-dot");
    const pNowEl = document.getElementById("adv-p-now");
    const pStartEl = document.getElementById("adv-p-start");
    const fRangeEl = document.getElementById("f-range");
    const fCountdownEl = document.getElementById("f-countdown-text");

    if (currentForbidden) {
      if (pNowEl) pNowEl.textContent = "Forbidden";
      if (statusDot) {
        statusDot.className = "h-status-dot forbidden";
      }
      if (fRangeEl) {
        fRangeEl.style.display = "block";
        fRangeEl.textContent = `${formatTo12h(currentForbidden.start)} – ${formatTo12h(currentForbidden.end)}`;
      }
      if (pStartEl) pStartEl.textContent = formatTo12h(currentForbidden.start);

      // Circular Sync
      updateCircular(now, currentForbidden.start, currentForbidden.end);

      // Neutralize Timeline
      document.querySelectorAll(".s-item").forEach(item => item.classList.remove("active"));
    } else {
      if (statusDot) {
        statusDot.className = "h-status-dot permissible";
      }
      if (fRangeEl) fRangeEl.style.display = "none";

      // 2. Identify Current & Next Prayer
      let currentIdx = -1;
      for (let i = 0; i < prayerSchedule.length; i++) {
        if (nowStr >= prayerSchedule[i].time) currentIdx = i;
      }
      if (currentIdx === -1) currentIdx = prayerSchedule.length - 1;

      const currentP = prayerSchedule[currentIdx];
      const nextP = prayerSchedule[(currentIdx + 1) % 5];

      if (pNowEl) pNowEl.textContent = currentP.name;
      if (pStartEl) pStartEl.textContent = formatTo12h(currentP.time);

      document.querySelectorAll(".s-item").forEach(item => {
        item.classList.toggle("active", item.dataset.prayer === currentP.name);
      });

      // Prayer Countdown
      const isIshaWindow = currentP.name === "Isha";
      updateCircular(now, currentP.time, nextP.time, isIshaWindow);
    }

    updateTrackerStates(timings, nowStr);
  }

  function updateCircular(now, startTime, endTime, isNextDay = false) {
    const today = new Date(now);
    const target = new Date(now);
    const [th, tm] = endTime.split(":").map(Number);
    target.setHours(th, tm, 0, 0);
    if (isNextDay && target < now) target.setDate(target.getDate() + 1);

    const diff = Math.floor((target - now) / 1000);
    if (diff < 0) return;

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    const timerEl = document.getElementById("adv-timer");
    if (timerEl) {
      timerEl.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    const ring = document.getElementById("adv-ring-fill");
    const dot = document.getElementById("adv-dot");
    if (ring) {
      const start = new Date(now);
      const [sh, sm] = startTime.split(":").map(Number);
      start.setHours(sh, sm, 0, 0);
      if (isNextDay && start > now) start.setDate(start.getDate() - 1);

      const total = (target - start) / 1000;
      const progress = Math.min(Math.max((now - start) / 1000 / total, 0), 1);
      const circ = 54 * 2 * Math.PI;
      ring.style.strokeDashoffset = circ - (progress * circ);
      ring.style.strokeDasharray = `${circ} ${circ}`;

      if (dot) {
        const angle = (progress * 360) - 90;
        const rad = (angle * Math.PI) / 180;
        const x = 60 + 54 * Math.cos(rad);
        const y = 60 + 54 * Math.sin(rad);
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
      }
    }
  }

  update();
  window.prayerTimer = setInterval(update, 1000);
}

function renderTracker() {
  const data = JSON.parse(localStorage.getItem("noorplus_tracker_strict") || "{}");
  const today = new Date().toISOString().split("T")[0];
  const todayData = data[today] || {};

  document.querySelectorAll(".t-btn").forEach(btn => {
    btn.classList.remove("done", "missed", "upcoming");
    if (todayData[btn.dataset.p] === "done") btn.classList.add("done");
  });
}

function toggleTracker(pName) {
  const data = JSON.parse(localStorage.getItem("noorplus_tracker_strict") || "{}");
  const today = new Date().toISOString().split("T")[0];
  if (!data[today]) data[today] = {};
  data[today][pName] = (data[today][pName] === "done") ? "" : "done";
  localStorage.setItem("noorplus_tracker_strict", JSON.stringify(data));
  renderTracker();
}

function updateTrackerStates(timings, nowStr) {
  const data = JSON.parse(localStorage.getItem("noorplus_tracker_strict") || "{}");
  const today = new Date().toISOString().split("T")[0];
  const todayData = data[today] || {};

  document.querySelectorAll(".t-btn").forEach(btn => {
    const p = btn.dataset.p;
    btn.classList.remove("missed", "upcoming", "done");

    // Reset icon to warning/exclamation for pending state
    const icon = btn.querySelector("i");
    if (icon) icon.setAttribute("data-lucide", "alert-triangle");

    if (todayData[p] === "done") {
      btn.classList.add("done");
      if (icon) icon.setAttribute("data-lucide", "check-circle");
    } else if (nowStr < timings[p]) {
      btn.classList.add("upcoming");
    } else {
      btn.classList.add("missed");
    }
  });
  if (window.lucide) lucide.createIcons();
}
