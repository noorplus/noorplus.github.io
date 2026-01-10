const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

// Cache for active intervals and tracking
const activeIntervals = new Set();
const activeSearchTimeouts = new Set();

/* ===============================
   CACHE & CLEANUP MANAGEMENT
================================ */
function cleanupPage() {
  // Clear all active intervals
  activeIntervals.forEach(intervalId => clearInterval(intervalId));
  activeIntervals.clear();

  // Clear search timeouts
  activeSearchTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  activeSearchTimeouts.clear();

  // Stop audio if playing
  if (window.quranAudio) {
    window.quranAudio.pause();
    window.quranAudio.currentTime = 0;
  }

  // Clear prayer timer
  if (window.prayerTimer) {
    clearInterval(window.prayerTimer);
    window.prayerTimer = null;
  }

  // Clear prayer time interval
  if (window.prayerTimeInterval) {
    clearInterval(window.prayerTimeInterval);
    window.prayerTimeInterval = null;
  }

  console.log("Page cleanup completed");
}

function trackInterval(intervalId) {
  activeIntervals.add(intervalId);
  return intervalId;
}

function trackTimeout(timeoutId) {
  activeSearchTimeouts.add(timeoutId);
  return timeoutId;
}

function initCacheManagement() {
  const cacheVersion = 1;
  const lastCacheVersion = localStorage.getItem('noorplus_cache_version');

  if (!lastCacheVersion || parseInt(lastCacheVersion) !== cacheVersion) {
    console.log('Cache version updated');
    localStorage.setItem('noorplus_cache_version', cacheVersion);
    localStorage.setItem('noorplus_cache_timestamp', Date.now());
  }

  // Clear cache older than 7 days
  const cacheTime = localStorage.getItem('noorplus_cache_timestamp');
  if (cacheTime && Date.now() - parseInt(cacheTime) > 7 * 24 * 60 * 60 * 1000) {
    console.log('Cache expired, clearing...');
    clearAppCache();
  }
}

function clearAppCache() {
  const keysToKeep = ['onboardingCompleted', 'userPreferences', 'theme', 'language', 'calculationMethod', 'hijriOffset', 'noorplus_tracker_strict', 'noorplus_cache_version', 'noorplus_cache_timestamp'];
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key) && key.startsWith('noorplus_')) {
      localStorage.removeItem(key);
    }
  });
}

/* ===============================
   CORE UTILITIES
================================ */
function formatTo12h(time24) {
  if (!time24 || typeof time24 !== 'string') return "--:--";
  try {
    let [h, m] = time24.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "--:--";
    const period = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${period}`;
  } catch (e) {
    console.error('formatTo12h error:', e);
    return "--:--";
  }
}

function loadPage(page) {
  try {
    console.log("Loading Page:", page);
    
    // Cleanup previous page
    cleanupPage();

    // Validate page name - only lowercase letters and hyphens
    if (!page || typeof page !== 'string' || !/^[a-z-]+$/.test(page)) {
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
        const activeBtn = document.querySelector(`.bottom-nav button[data-page="${page}"]`);
        if (activeBtn) activeBtn.classList.add("active");

        // Re-init modules conditionally
        if (window.lucide) lucide.createIcons();
        initThemeToggle();

        if (page === "home") initHomePage();
        else if (page === "quran") initQuranPage();
        else if (page === "prayer-time") initPrayerTimePage();
      })
      .catch(err => {
        console.error("Navigation Error:", err);
        main.innerHTML = `<div style="padding:40px; text-align:center; color:var(--alert);">
          <h3>Load Failed</h3>
          <p>${err.message}</p>
          <button onclick="location.reload()" style="margin-top:10px; padding:10px 20px; border-radius:10px; background:var(--primary); color:white; border:none;">Retry</button>
        </div>`;
      });
  } catch (err) {
    console.error("Page load error:", err);
  }
}


function initThemeToggle() {
  try {
    const toggleBtn = document.getElementById("theme-toggle");
    if (!toggleBtn) return;

    // Remove old listener if exists
    const oldHandler = toggleBtn._themeHandler;
    if (oldHandler) toggleBtn.removeEventListener('click', oldHandler);

    // Attach new listener
    const handler = () => {
      try {
        const root = document.documentElement;
        const theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
      } catch (e) {
        console.error('Theme toggle error:', e);
      }
    };

    toggleBtn._themeHandler = handler;
    toggleBtn.addEventListener('click', handler);
  } catch (e) {
    console.error('initThemeToggle error:', e);
  }
}

/* ===============================
   INITIAL LOAD & PREFERENCES
================================ */
function restorePreferences() {
  try {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (['light', 'dark'].includes(savedTheme)) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  } catch (e) {
    console.error('restorePreferences error:', e);
  }
}

function checkOnboardingStatus() {
  try {
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    return onboardingCompleted === "true";
  } catch (e) {
    console.error('checkOnboardingStatus error:', e);
    return false;
  }
}

function showOnboarding() {
  try {
    const appShell = document.getElementById("app-shell");
    const container = document.getElementById("onboarding-container");

    if (!appShell || !container) {
      console.error('Required elements not found for onboarding');
      skipOnboarding();
      return;
    }

    // Hide main app
    appShell.style.display = "none";
    
    // Show onboarding container
    container.style.display = "flex";
    
    // Load onboarding HTML
    fetch("pages/onboarding.html")
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch onboarding.html');
        return res.text();
      })
      .then(html => {
        if (!html || html.trim().length === 0) {
          throw new Error('Onboarding HTML is empty');
        }
        container.innerHTML = html;
        
        // Initialize lucide icons
        if (window.lucide) lucide.createIcons();
        
        // Initialize onboarding
        if (window.initOnboarding) initOnboarding();
      })
      .catch(err => {
        console.error("Failed to load onboarding:", err);
        // Skip onboarding if it fails
        skipOnboarding();
      });
  } catch (e) {
    console.error('showOnboarding error:', e);
    skipOnboarding();
  }
}

function skipOnboarding() {
  try {
    localStorage.setItem("onboardingCompleted", "true");
    startMainApp();
  } catch (e) {
    console.error('skipOnboarding error:', e);
    startMainApp();
  }
}

function startMainApp() {
  try {
    const appShell = document.getElementById("app-shell");
    const onboardingContainer = document.getElementById("onboarding-container");
    
    if (appShell) appShell.style.display = "flex";
    if (onboardingContainer) onboardingContainer.style.display = "none";
    
    // Load home page
    loadPage("home");
  } catch (e) {
    console.error('startMainApp error:', e);
    // Fallback: try to reload
    setTimeout(() => location.reload(), 1000);
  }
}

// Global initialization
(function startup() {
  try {
    // Initialize cache management
    initCacheManagement();
    
    // Restore theme preferences
    restorePreferences();
    
    // Check if onboarding is needed
    if (!checkOnboardingStatus()) {
      // Show onboarding
      showOnboarding();
    } else {
      // Start main app
      startMainApp();
    }

    // Setup navigation with event delegation
    document.addEventListener("click", (e) => {
      try {
        const target = e.target.closest("[data-page]");
        if (target) {
          const page = target.getAttribute("data-page");
          loadPage(page);
        }
      } catch (err) {
        console.error("Navigation handler error:", err);
      }
    });

    console.log("NoorPlus StartUp Complete");
  } catch (err) {
    console.error("Critical Startup Failure:", err);
    // Attempt recovery
    skipOnboarding();
  }
})();

/* ===============================
   GLOBAL QURAN MODULE
================================ */
let currentAudio = null;
let currentPlayBtn = null;

function initQuranPage() {
  try {
    const surahListEl = document.getElementById("surah-list");
    const qMainViewEl = document.getElementById("quran-main-view");
    const ayahViewEl = document.getElementById("ayah-view");
    const ayahListEl = document.getElementById("ayah-list");
    const qBackBtn = document.getElementById("q-back-btn");
    const qSearchInput = document.getElementById("q-search-input");
    const qSearchContainer = document.querySelector(".q-search-container");
    const qHeaderAction = document.getElementById("q-header-action");
    const qPlayer = document.getElementById("q-player");
    const qTabs = document.querySelectorAll(".q-tab");

    if (!surahListEl) return;

    // Cache/State
    window.quranSurahs = window.quranSurahs || [];

    // Reset Header state
    if (qSearchContainer) qSearchContainer.style.display = "flex";
    const qHeaderTitle = document.getElementById("q-header-title");
    if (qHeaderTitle) qHeaderTitle.classList.add("hidden");

    // Search Logic (Debounced) - with proper cleanup
    let searchTimeout;
    if (qSearchInput) {
      qSearchInput.value = "";
      qSearchInput.oninput = (e) => {
        // Clear previous timeout
        if (searchTimeout) clearTimeout(searchTimeout);

        searchTimeout = trackTimeout(setTimeout(() => {
          const term = e.target.value.toLowerCase();
          const filtered = window.quranSurahs.filter(s =>
            s.englishName.toLowerCase().includes(term) || s.name.includes(term) || s.number.toString() === term
          );
          renderSurahList(filtered);
        }, 150));
      };
    }

    // Tab Events
    if (qTabs && qTabs.length > 0) {
      qTabs.forEach(tab => {
        tab.onclick = () => {
          qTabs.forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          handleCategorySwitch(tab.dataset.tab);
        };
      });
    }

    // Back Button
    if (qBackBtn) {
      qBackBtn.onclick = () => {
        if (!ayahViewEl.classList.contains("hidden")) {
          ayahViewEl.classList.add("hidden");
          qMainViewEl.classList.remove("hidden");
          qPlayer.classList.add("hidden");
          if (qSearchContainer) qSearchContainer.style.display = "flex";
          if (qHeaderTitle) qHeaderTitle.classList.add("hidden");
        } else {
          loadPage("home");
        }
      };
    }

    function handleCategorySwitch(cat) {
      surahListEl.innerHTML = `<p class="q-loading">Loading ${cat}...</p>`;
      if (cat === "surah") renderSurahList(window.quranSurahs);
      else if (cat === "juz") renderJuzView();
      else if (cat === "page") renderPageView();
      else if (cat === "ruku") renderRukuView();
      else if (cat === "topic") renderTopicView();
      else if (cat === "ayah") renderAyahSearchView();
    }

    function renderSurahList(list) {
      if (list.length === 0) {
        surahListEl.innerHTML = '<p class="q-loading">No results found.</p>';
        return;
      }
      const frag = document.createDocumentFragment();
      list.forEach(s => {
        const item = document.createElement("div");
        item.className = "q-item";
        item.onclick = () => window.loadAyahView(`surah/${s.number}`, s.englishName);
        item.innerHTML = `
          <div class="q-star-badge">${s.number}</div>
          <div class="q-item-info">
            <span class="q-item-name">${s.englishName}</span>
            <span class="q-item-meta">Verses: ${s.numberOfAyahs} | ${s.revelationType}</span>
          </div>
          <span class="q-item-ar">${s.name}</span>
        `;
        frag.appendChild(item);
      });
      surahListEl.innerHTML = "";
      surahListEl.appendChild(frag);
    }

    function renderJuzView() {
      const grid = document.createElement("div");
      grid.className = "q-badge-grid";
      for (let i = 1; i <= 30; i++) {
        const b = document.createElement("div");
        b.className = "q-badge";
        b.onclick = () => window.loadAyahView(`juz/${i}`, `Juz ${i}`);
        b.innerHTML = `<span class="q-badge-num">${i}</span><span class="q-badge-label">Juz</span>`;
        grid.appendChild(b);
      }
      surahListEl.innerHTML = "";
      surahListEl.appendChild(grid);
    }

    function renderPageView() {
      const grid = document.createElement("div");
      grid.className = "q-badge-grid";
      for (let i = 1; i <= 604; i++) {
        const b = document.createElement("div");
        b.className = "q-badge";
        b.onclick = () => window.loadAyahView(`page/${i}`, `Page ${i}`);
        b.innerHTML = `<span class="q-badge-num">${i}</span><span class="q-badge-label">Page</span>`;
        grid.appendChild(b);
      }
      surahListEl.innerHTML = "";
      surahListEl.appendChild(grid);
    }

    function renderRukuView() {
      surahListEl.innerHTML = '<div class="q-badge-grid"></div>';
      const grid = surahListEl.querySelector(".q-badge-grid");
      for (let i = 1; i <= 556; i++) {
        const b = document.createElement("div");
        b.className = "q-badge";
        b.onclick = () => window.loadAyahView(`ruku/${i}`, `Ruku ${i}`);
        b.innerHTML = `<span class="q-badge-num">${i}</span><span class="q-badge-label">Ruku</span>`;
        grid.appendChild(b);
      }
    }

    function renderTopicView() {
      const topics = [
        { name: "Belief (Iman)", icon: "shield-check" },
        { name: "Prayer (Salah)", icon: "hand-metal" },
        { name: "Charity (Zakat)", icon: "heart-handshake" },
        { name: "Stories (Qisas)", icon: "book-open" },
        { name: "Ethics (Akhlaq)", icon: "sparkles" },
        { name: "Hereafter", icon: "cloud" }
      ];
      const grid = document.createElement("div");
      grid.className = "q-topic-grid";
      topics.forEach(t => {
        const card = document.createElement("div");
        card.className = "q-topic-card";
        card.innerHTML = `
          <div class="q-topic-icon"><i data-lucide="${t.icon}"></i></div>
          <span class="q-topic-name">${t.name}</span>
        `;
        card.onclick = () => alert(t.name + " topics coming soon.");
        grid.appendChild(card);
      });
      surahListEl.innerHTML = "";
      surahListEl.appendChild(grid);
      if (window.lucide) lucide.createIcons();
    }

    function renderAyahSearchView() {
      surahListEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          <i data-lucide="search" style="width:48px; height:48px; opacity: 0.3; margin-bottom: 12px;"></i>
          <p>Search for specific Ayahs using the search bar above.</p>
          <p style="font-size: 12px; margin-top: 8px;">Try "Baqarah 255" or "1:1"</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }

    // Load Data
    if (window.quranSurahs.length > 0) renderSurahList(window.quranSurahs);
    else {
      fetch("https://api.alquran.cloud/v1/surah")
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch Surah list');
          return res.json();
        })
        .then(d => {
          if (d.data && d.data.length > 0) {
            window.quranSurahs = d.data;
            renderSurahList(d.data);
          }
        })
        .catch(err => {
          console.error("Failed to load Quran data:", err);
          surahListEl.innerHTML = '<p class="q-loading" style="color:var(--alert);">Failed to load Surahs. Check your connection.</p>';
        });
    }

    // Load Ayah View (Global Helper)
    window.loadAyahView = function (endpoint, title) {
      try {
        if (qSearchContainer) qSearchContainer.style.display = "none";
        if (qHeaderTitle) { qHeaderTitle.textContent = title; qHeaderTitle.classList.remove("hidden"); }

        qMainViewEl.classList.add("hidden");
        ayahViewEl.classList.remove("hidden");
        ayahListEl.innerHTML = '<p class="q-loading">Loading Verses...</p>';

        fetch(`https://api.alquran.cloud/v1/${endpoint}/editions/quran-uthmani,en.transliteration,en.asad`)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch Ayahs');
            return res.json();
          })
          .then(data => {
            if (!data.data || data.data.length === 0) throw new Error('No data received');

            ayahListEl.innerHTML = "";
            const ar = data.data[0];
            const tr = data.data[1];
            const en = data.data[2];

            // Hide detail card for Juz/Page as it's surah-centric
            const detailCard = document.querySelector(".q-detail-card");
            if (endpoint.startsWith("surah")) {
              detailCard.style.display = "flex";
              const meta = window.quranSurahs.find(s => endpoint.includes(s.number));
              if (meta) {
                document.getElementById("det-name").textContent = meta.englishName;
                document.getElementById("det-meaning").textContent = meta.englishNameTranslation;
                document.getElementById("det-revelation").textContent = meta.revelationType;
                document.getElementById("det-ayahs").textContent = meta.numberOfAyahs;
              }
            } else {
              detailCard.style.display = "none";
            }

            const frag = document.createDocumentFragment();
            ar.ayahs.forEach((ayah, i) => {
              const item = document.createElement("div");
              item.className = "ayah-item";
              item.innerHTML = `
                <div class="ayah-header-bar">
                  <span class="ayah-num">${ayah.numberInSurah || ayah.number}</span>
                  <div class="ayah-actions">
                    <i data-lucide="play" onclick="playSurahAudio(${ayah.surah?.number || ayah.number}, this)"></i>
                    <i data-lucide="bookmark"></i>
                    <i data-lucide="share-2"></i>
                  </div>
                </div>
                <div class="ayah-content">
                  <p class="ayah-ar">${ayah.text}</p>
                  <p class="ayah-trans">${tr.ayahs[i].text}</p>
                  <p class="ayah-en">${en.ayahs[i].text}</p>
                </div>
              `;
              frag.appendChild(item);
            });
            ayahListEl.appendChild(frag);
            if (window.lucide) lucide.createIcons();
          })
          .catch(err => {
            console.error("Failed to load Ayahs:", err);
            ayahListEl.innerHTML = '<p class="q-loading" style="color:var(--alert);">Failed to load verses. Check your connection.</p>';
          });
      } catch (e) {
        console.error("loadAyahView error:", e);
      }
    };
  } catch (e) {
    console.error("initQuranPage error:", e);
  }
}
let quranAudio = new Audio();
let isPlaying = false;

window.playSurahAudio = function (number, btn) {
  try {
    const player = document.getElementById("q-player");
    const playBtn = document.getElementById("p-play");
    const stopBtn = document.getElementById("p-stop");

    if (!player || !playBtn || !stopBtn) {
      console.error('Audio player elements not found');
      return;
    }

    player.classList.remove("hidden");

    if (isPlaying && quranAudio.src.includes(`/${number}.mp3`)) {
      quranAudio.pause();
      isPlaying = false;
      playBtn.innerHTML = `<i data-lucide="play"></i>`;
    } else {
      quranAudio.src = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`;
      quranAudio.play().catch(err => {
        console.error('Audio play error:', err);
        alert('Failed to play audio. Check your connection.');
      });
      isPlaying = true;
      playBtn.innerHTML = `<i data-lucide="pause"></i>`;
    }

    if (window.lucide) lucide.createIcons();

    // Reset stop button handler
    stopBtn.onclick = () => {
      quranAudio.pause();
      quranAudio.currentTime = 0;
      isPlaying = false;
      player.classList.add("hidden");
      playBtn.innerHTML = `<i data-lucide="play"></i>`;
      if (window.lucide) lucide.createIcons();
    };

    // Reset play button handler
    playBtn.onclick = () => {
      if (isPlaying) {
        quranAudio.pause();
        isPlaying = false;
        playBtn.innerHTML = `<i data-lucide="play"></i>`;
      } else {
        quranAudio.play().catch(err => console.error('Play error:', err));
        isPlaying = true;
        playBtn.innerHTML = `<i data-lucide="pause"></i>`;
      }
      if (window.lucide) lucide.createIcons();
    };

    // Audio end handler
    quranAudio.onended = () => {
      isPlaying = false;
      playBtn.innerHTML = `<i data-lucide="play"></i>`;
      if (window.lucide) lucide.createIcons();
    };

    // Error handler
    quranAudio.onerror = () => {
      console.error('Audio loading error');
      isPlaying = false;
      playBtn.innerHTML = `<i data-lucide="play"></i>`;
      alert('Failed to load audio. Please check your connection.');
    };
  } catch (e) {
    console.error('playSurahAudio error:', e);
  }
};

/* ===============================
   ADVANCED DASHBOARD MODULE
================================ */
function initHomePage() {
  try {
    const dateEl = document.getElementById("adv-date");
    if (!dateEl) return;

    const now = new Date();
    const d = now.getDate().toString().padStart(2, "0");
    const m = now.toLocaleDateString("en-GB", { month: "short" });
    const y = now.getFullYear();
    dateEl.textContent = `${d} ${m}, ${y}`;
    renderTracker();

    // Get location with fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            fetchAdvPrayerTimes(pos.coords.latitude, pos.coords.longitude);
          } catch (e) {
            console.error('Location fetch error:', e);
            fetchAdvPrayerTimes(23.8103, 90.4125);
          }
        },
        () => {
          console.warn('Geolocation denied, using default');
          fetchAdvPrayerTimes(23.8103, 90.4125);
        }
      );
    } else {
      console.warn('Geolocation not available, using default');
      fetchAdvPrayerTimes(23.8103, 90.4125);
    }

    // Prayer tracker buttons
    document.querySelectorAll(".t-btn").forEach(btn => {
      btn.onclick = (e) => {
        try {
          if (btn.classList.contains("upcoming") || btn.classList.contains("missed")) return;
          toggleTracker(btn.dataset.p);
        } catch (e) {
          console.error('Tracker button error:', e);
        }
      };
    });
  } catch (e) {
    console.error('initHomePage error:', e);
  }
}

async function fetchAdvPrayerTimes(lat, lon) {
  try {
    // Method 1: University of Islamic Sciences, Karachi (Standard for South Asia)
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=1`);
    
    if (!res.ok) throw new Error('Prayer times API error');
    
    const json = await res.json();
    if (!json.data) throw new Error('Invalid API response');

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
      if (el && timings[p]) el.textContent = formatTo12h(timings[p]);
    });

    startAdvCountdown(timings);
  } catch (err) {
    console.error("API Fetch Error:", err);
    // Use mock times as fallback
    useFallbackPrayerTimes();
  }
}

function useFallbackPrayerTimes() {
  const fallbackTimings = {
    Fajr: '05:30',
    Dhuhr: '12:30',
    Asr: '15:45',
    Maghrib: '17:20',
    Isha: '18:50',
    Sunrise: '07:00'
  };

  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(p => {
    const el = document.getElementById(`s-${p}`);
    if (el) el.textContent = formatTo12h(fallbackTimings[p]);
  });

  startAdvCountdown(fallbackTimings);
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
  try {
    if (window.prayerTimer) clearInterval(window.prayerTimer);

    const prayerSchedule = [
      { name: "Fajr", time: timings.Fajr },
      { name: "Dhuhr", time: timings.Dhuhr },
      { name: "Asr", time: timings.Asr },
      { name: "Maghrib", time: timings.Maghrib },
      { name: "Isha", time: timings.Isha }
    ];

    function update() {
      try {
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
          const fRow = document.getElementById("f-row");
          if (fRow) fRow.style.display = "flex";
          if (fRangeEl) {
            fRangeEl.textContent = `${formatTo12h(currentForbidden.start)} - ${formatTo12h(currentForbidden.end)}`;
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
          const fRow = document.getElementById("f-row");
          if (fRow) fRow.style.display = "none";

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
          const pEndEl = document.getElementById("adv-p-end");
          if (pEndEl) pEndEl.textContent = formatTo12h(nextP.time);

          document.querySelectorAll(".s-item").forEach(item => {
            item.classList.toggle("active", item.dataset.prayer === currentP.name);
          });

          // Prayer Countdown
          const isIshaWindow = currentP.name === "Isha";
          updateCircular(now, currentP.time, nextP.time, isIshaWindow);
        }

        updateTrackerStates(timings, nowStr);
      } catch (e) {
        console.error('Countdown update error:', e);
      }
    }

    function updateCircular(now, startTime, endTime, isNextDay = false) {
      try {
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
      } catch (e) {
        console.error('updateCircular error:', e);
      }
    }

    update();
    window.prayerTimer = trackInterval(setInterval(update, 1000));
  } catch (e) {
    console.error('startAdvCountdown error:', e);
  }
}

function renderTracker() {
  try {
    const data = JSON.parse(localStorage.getItem("noorplus_tracker_strict") || "{}");
    const today = new Date().toISOString().split("T")[0];
    const todayData = data[today] || {};

    document.querySelectorAll(".t-btn").forEach(btn => {
      btn.classList.remove("done", "missed", "upcoming");
      if (todayData[btn.dataset.p] === "done") btn.classList.add("done");
    });
  } catch (e) {
    console.error('renderTracker error:', e);
  }
}

function toggleTracker(pName) {
  try {
    const data = JSON.parse(localStorage.getItem("noorplus_tracker_strict") || "{}");
    const today = new Date().toISOString().split("T")[0];
    if (!data[today]) data[today] = {};
    data[today][pName] = (data[today][pName] === "done") ? "" : "done";
    localStorage.setItem("noorplus_tracker_strict", JSON.stringify(data));
    renderTracker();
  } catch (e) {
    console.error('toggleTracker error:', e);
  }
}

function updateTrackerStates(timings, nowStr) {
  try {
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
  } catch (e) {
    console.error('updateTrackerStates error:', e);
  }
}

/* ===============================
   PRAYER TIME PAGE
================================ */
function initPrayerTimePage() {
  try {
    // Back button
    const backBtn = document.getElementById('pt-back-btn');
    if (backBtn) {
      backBtn.onclick = () => loadPage('home');
    }

    // Update prayer times
    updatePrayerTimes();

    // Update current prayer status
    updateCurrentPrayer();

    // Refresh every minute - with cleanup tracking
    window.prayerTimeInterval = trackInterval(setInterval(updateCurrentPrayer, 60000));
  } catch (e) {
    console.error('initPrayerTimePage error:', e);
  }
}

function updatePrayerTimes() {
  try {
    // Mock prayer times - Replace with actual API call
    const times = {
      'Fajr': '05:30 am',
      'Sunrise': '07:00 am',
      'Forbidden1': '07:00 am - 09:00 am',
      'Duha': '09:00 am - 11:30 am',
      'Forbidden2': '11:30 am - 12:00 pm',
      'Dhuhr': '12:30 pm',
      'Asr': '03:45 pm',
      'Forbidden3': '03:45 pm - 05:15 pm',
      'Sunset': '05:15 pm',
      'Maghrib': '05:20 pm',
      'Isha': '06:50 pm',
      'Tahajjud': '02:00 am - 04:00 am'
    };

    Object.keys(times).forEach(key => {
      const el = document.getElementById(`pt-${key}`);
      if (el) el.textContent = times[key];
    });

    // Update date
    const dateEl = document.getElementById('pt-date');
    if (dateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
  } catch (e) {
    console.error('updatePrayerTimes error:', e);
  }
}

function updateCurrentPrayer() {
  try {
    // Determine current prayer based on time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    let currentPrayer = '--';
    let timeRemaining = '--:--';

    // Prayer time ranges (in 24-hour format, minutes from midnight)
    const prayerRanges = {
      'Fajr': { start: 5 * 60 + 30, end: 7 * 60 }, // 05:30 - 07:00
      'Dhuhr': { start: 12 * 60 + 30, end: 15 * 60 }, // 12:30 - 15:00
      'Asr': { start: 15 * 60 + 45, end: 17 * 60 + 15 }, // 15:45 - 17:15
      'Maghrib': { start: 17 * 60 + 20, end: 19 * 60 }, // 17:20 - 19:00
      'Isha': { start: 18 * 60 + 50, end: 22 * 60 } // 18:50 - 22:00
    };

    // Find current prayer
    for (const [prayer, range] of Object.entries(prayerRanges)) {
      if (timeInMinutes >= range.start && timeInMinutes < range.end) {
        currentPrayer = prayer;
        const endTime = range.end;
        const remaining = endTime - timeInMinutes;
        const remHours = Math.floor(remaining / 60);
        const remMins = remaining % 60;
        timeRemaining = `${remHours}:${String(remMins).padStart(2, '0')}`;
        break;
      }
    }

    // Update current prayer display
    const prayerEl = document.getElementById('pt-current-prayer');
    if (prayerEl) prayerEl.textContent = currentPrayer;

    const timeEl = document.getElementById('pt-time-remaining');
    if (timeEl) timeEl.textContent = timeRemaining;

    // Highlight current prayer row
    document.querySelectorAll('.pt-time-row').forEach(row => {
      row.classList.remove('pt-current-prayer');
      if (row.getAttribute('data-prayer') === currentPrayer) {
        row.classList.add('pt-current-prayer');
      }
    });
  } catch (e) {
    console.error('updateCurrentPrayer error:', e);
  }
}
