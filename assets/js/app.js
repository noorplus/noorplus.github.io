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
  const ayahViewEl = document.getElementById("ayah-view");
  const ayahListEl = document.getElementById("ayah-list");
  const backBtn = document.getElementById("back-to-surah");

  if (!surahListEl) return;

  fetch("https://api.alquran.cloud/v1/surah")
    .then(res => res.json())
    .then(data => {
      surahListEl.innerHTML = "";
      data.data.forEach(surah => {
        const row = document.createElement("div");
        row.className = "surah-row";
        row.innerHTML = `
          <div class="surah-info" onclick="window.loadSurah(${surah.number})">
            <span class="surah-name">${surah.number}. ${surah.englishName}</span>
            <span class="surah-ar">${surah.name}</span>
          </div>
          <button class="surah-play" onclick="playSurahAudio(${surah.number}, this)">
            <i data-lucide="play"></i>
          </button>
        `;
        surahListEl.appendChild(row);
      });
      if (window.lucide) lucide.createIcons();
    });

  window.loadSurah = function (number) {
    surahListEl.classList.add("hidden");
    ayahViewEl.classList.remove("hidden");
    ayahListEl.innerHTML = "<p>Loading Ayahs...</p>";

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
  };

  if (backBtn) {
    backBtn.onclick = () => {
      ayahViewEl.classList.add("hidden");
      surahListEl.classList.remove("hidden");
    };
  }
}

async function playSurahAudio(number, btn) {
  const url = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;
  if (currentAudio) {
    currentAudio.pause();
    currentPlayBtn.innerHTML = `<i data-lucide="play"></i>`;
    if (window.lucide) lucide.createIcons();
  }
  if (currentPlayBtn === btn) {
    currentAudio = null;
    currentPlayBtn = null;
    return;
  }
  const audio = new Audio(url);
  audio.play();
  btn.innerHTML = `<i data-lucide="pause"></i>`;
  if (window.lucide) lucide.createIcons();
  currentAudio = audio;
  currentPlayBtn = btn;
}

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
    const statusLabel = document.getElementById("status-label");
    const statusDot = document.querySelector(".status-dot");
    const fRangeEl = document.getElementById("f-range");
    const fCountdownEl = document.getElementById("f-countdown-text");

    if (currentForbidden) {
      statusLabel.textContent = "Forbidden Time";
      if (statusDot) statusDot.style.display = "block";
      if (fRangeEl) {
        fRangeEl.style.display = "block";
        fRangeEl.textContent = `${formatTo12h(currentForbidden.start)} – ${formatTo12h(currentForbidden.end)}`;
      }
      if (fCountdownEl) {
        fCountdownEl.parentElement.style.display = "flex";

        // Countdown for Forbidden End (Exact Format: 0 hour 2.37 min left (Approx))
        const target = new Date();
        const [eh, em] = currentForbidden.end.split(":").map(Number);
        target.setHours(eh, em, 0, 0);
        const totalSeconds = Math.max(0, (target - now) / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = ((totalSeconds % 3600) / 60).toFixed(2);
        fCountdownEl.textContent = `${h} hour ${m} min left (Approx)`;
      }

      // Circular Sync
      updateCircular(now, currentForbidden.start, currentForbidden.end);

      // Neutralize Timeline
      document.querySelectorAll(".s-item").forEach(item => item.classList.remove("active"));
    } else {
      statusLabel.textContent = "Permissible Time";
      if (statusDot) statusDot.style.display = "none";
      if (fRangeEl) fRangeEl.style.display = "none";
      if (fCountdownEl) fCountdownEl.parentElement.style.display = "none";

      // 2. Identify Current & Next Prayer
      let currentIdx = -1;
      for (let i = 0; i < prayerSchedule.length; i++) {
        if (nowStr >= prayerSchedule[i].time) currentIdx = i;
      }
      if (currentIdx === -1) currentIdx = prayerSchedule.length - 1;

      const currentP = prayerSchedule[currentIdx];
      const nextP = prayerSchedule[(currentIdx + 1) % 5];

      const pNowEl = document.getElementById("adv-p-now");
      if (pNowEl) pNowEl.textContent = currentP.name;

      const pStartEl = document.getElementById("adv-p-start");
      if (pStartEl) pStartEl.textContent = formatTo12h(currentP.time);

      document.querySelectorAll(".s-item").forEach(item => {
        item.classList.toggle("active", item.dataset.prayer === currentP.name);
      });

      // Prayer Countdown
      const target = new Date();
      const [th, tm] = nextP.time.split(":").map(Number);
      target.setHours(th, tm, 0, 0);
      if (target < now) target.setDate(target.getDate() + 1);

      updateCircular(now, currentP.time, nextP.time, true);
    }

    updateTrackerStates(timings, nowStr);
  }

  function updateCircular(now, startTime, endTime, isNextDay = false) {
    const target = new Date();
    const [th, tm] = endTime.split(":").map(Number);
    target.setHours(th, tm, 0, 0);
    if (isNextDay && target < now) target.setDate(target.getDate() + 1);

    const diff = Math.floor((target - now) / 1000);
    if (diff < 0) return;

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    document.getElementById("adv-timer").textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    const ring = document.getElementById("adv-ring-fill");
    const dot = document.getElementById("adv-dot");
    if (ring) {
      const start = new Date();
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
