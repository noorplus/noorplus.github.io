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
   SETTINGS MANAGER
================================ */
const SettingsManager = {
  defaults: {
    theme: 'light',
    location: null,
    coordinates: null, // {lat, lon}
    calculationMethod: 'Karachi',
    asrMethod: 'Shafi',
    hijriAdjustment: 0,
    highLatitudeRule: 0, // 0=None, 1=Midnight, 2=OneSeventh, 3=AngleBased
    timeFormat: '12h'
  },

  get(key) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return this.defaults[key];
      // special handling for objects
      if (key === 'coordinates') return JSON.parse(val);
      return val;
    } catch (e) {
      console.error(`SettingsManager get error for ${key}:`, e);
      return this.defaults[key];
    }
  },

  set(key, value) {
    try {
      if (typeof value === 'object' && value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }

      // Sync legacy userPreferences object for backward compatibility if needed
      this.syncLegacyPrefs();
    } catch (e) {
      console.error(`SettingsManager set error for ${key}:`, e);
    }
  },

  getAll() {
    const all = {};
    Object.keys(this.defaults).forEach(k => all[k] = this.get(k));
    return all;
  },

  syncLegacyPrefs() {
    try {
      const prefs = {
        location: this.get('location'),
        calculationMethod: this.get('calculationMethod'),
        asrMethod: this.get('asrMethod'),
        hijriAdjustment: this.get('hijriAdjustment'),
        highLatitudeRule: this.get('highLatitudeRule'),
        timeFormat: this.get('timeFormat')
      };
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
    } catch (e) { }
  }
};

/* ===============================
   NOTIFICATION MANAGER (ADHAN)
================================ */
const NotificationManager = {
  audio: new Audio('https://www.islamcan.com/audio/adhan/azan1.mp3'), // Placeholder URL, reliable source needed or local file

  defaults: {
    enabled: false,
    prayers: {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true
    }
  },

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('notificationSettings')) || this.defaults;
    } catch {
      return this.defaults;
    }
  },

  saveSettings(settings) {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return false;
    }
    if (Notification.permission === 'granted') return true;

    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  playAdhan() {
    this.audio.currentTime = 0;
    this.audio.play().catch(e => console.log('Audio playback prevented:', e));
  },

  trigger(prayerName) {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.prayers[prayerName]) return;

    // Show Notification
    if (Notification.permission === 'granted') {
      new Notification(`Time for ${prayerName}`, {
        body: 'Hayya alas-salah (Come to prayer)',
        icon: 'assets/icons/icon-192.png' // Ensure this exists or use generic
      });
    }

    // Play Audio
    this.playAdhan();
  }
};
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
        else if (page === "menu") initMenuPage();
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

function initMenuPage() {
  try {
    // Prayer Settings button
    const prayerSettingsBtn = document.getElementById('prayer-settings-btn');
    if (prayerSettingsBtn) {
      prayerSettingsBtn.addEventListener('click', () => {
        openPrayerSettingsModal();
      });
    }

    // Clear Cache button
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        if (confirm('Clear all cached data?')) {
          clearAppCache();
          localStorage.setItem('noorplus_cache_timestamp', Date.now());
          alert('Cache cleared successfully');
        }
      });
    }

    // Close Modal button
    const closeBtn = document.getElementById('close-settings-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePrayerSettingsModal);
    }

    // Modal background click
    const modal = document.getElementById('prayer-settings-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closePrayerSettingsModal();
        }
      });
    }

    // Location detect button in settings
    const detectBtn = document.getElementById('settings-location-detect-btn');
    if (detectBtn) {
      detectBtn.addEventListener('click', detectPrayerSettingsLocation);
    }

    // Save button
    const saveBtn = document.getElementById('save-prayer-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', savePrayerSettings);
    }

    // Dynamic Subtitles
    const prayerDesc = document.getElementById('menu-prayer-settings-desc');
    if (prayerDesc) {
      const settings = SettingsManager.getAll();
      const loc = settings.userLocation || 'Setup Required'; // userLocation is the key we saved
      const method = settings.calculationMethod || 'Karachi';
      prayerDesc.textContent = `${loc} • ${method}`;
    }

    // --- Notifications UI Wiring ---
    const notifBtn = document.getElementById('notifications-btn');
    const notifModal = document.getElementById('notification-settings-modal');
    const closeNotifBtn = document.getElementById('close-notif-modal');
    const saveNotifBtn = document.getElementById('save-notif-settings');
    const masterToggle = document.getElementById('notif-master-toggle');

    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        notifModal.style.display = 'flex'; // Changed to flex for modal centering
        loadNotifModal();
      });
    }

    if (closeNotifBtn) {
      closeNotifBtn.addEventListener('click', () => {
        notifModal.style.display = 'none';
      });
    }

    if (masterToggle) {
      masterToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
          const granted = await NotificationManager.requestPermission();
          if (!granted) {
            e.target.checked = false;
            alert('Permission denied. Please enable notifications in your browser settings.');
          }
        }
      });
    }

    if (saveNotifBtn) {
      saveNotifBtn.addEventListener('click', () => {
        const settings = {
          enabled: masterToggle.checked,
          prayers: {}
        };
        document.querySelectorAll('.notif-checkbox').forEach(cb => {
          settings.prayers[cb.dataset.prayer] = cb.checked;
        });
        NotificationManager.saveSettings(settings);
        alert('Notification settings saved!');
        notifModal.style.display = 'none';
      });
    }

    // Modal background click for notification modal
    if (notifModal) {
      notifModal.addEventListener('click', (e) => {
        if (e.target === notifModal) {
          notifModal.style.display = 'none';
        }
      });
    }

    function loadNotifModal() {
      const settings = NotificationManager.getSettings();
      if (masterToggle) masterToggle.checked = settings.enabled;
      document.querySelectorAll('.notif-checkbox').forEach(cb => {
        cb.checked = settings.prayers[cb.dataset.prayer];
      });
    }

    // Load current settings into modal
    loadPrayerSettingsModal();
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    console.error('initMenuPage error:', e);
  }
}

function openPrayerSettingsModal() {
  try {
    const modal = document.getElementById('prayer-settings-modal');
    if (modal) {
      modal.style.display = 'flex';
      loadPrayerSettingsModal();
    }
  } catch (e) {
    console.error('openPrayerSettingsModal error:', e);
  }
}

function closePrayerSettingsModal() {
  try {
    const modal = document.getElementById('prayer-settings-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  } catch (e) {
    console.error('closePrayerSettingsModal error:', e);
  }
}

function loadPrayerSettingsModal() {
  try {
    const settings = SettingsManager.getAll();

    const locationInput = document.getElementById('settings-location-input');
    const currentLocationSpan = document.getElementById('current-location');
    const calcSelect = document.getElementById('settings-calculation-method');
    const asrRadios = document.querySelectorAll('input[name="settings-asr-method"]');
    const hijriInput = document.getElementById('settings-hijri-adj');
    const highLatSelect = document.getElementById('settings-high-lat');

    if (locationInput) locationInput.value = settings.location === 'Not set' || !settings.location ? '' : settings.location;
    if (currentLocationSpan) currentLocationSpan.textContent = settings.location || 'Not set';
    if (calcSelect) calcSelect.value = settings.calculationMethod;
    if (hijriInput) hijriInput.value = settings.hijriAdjustment;
    if (highLatSelect) highLatSelect.value = settings.highLatitudeRule;

    asrRadios.forEach(radio => {
      radio.checked = radio.value === settings.asrMethod;
    });

    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    console.error('loadPrayerSettingsModal error:', e);
  }
}

function detectPrayerSettingsLocation() {
  try {
    const btn = document.getElementById('settings-location-detect-btn');
    if (!btn || !navigator.geolocation) return;

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" style="animation: spin 1s linear infinite;"></i>';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Reverse geocode
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept': 'application/json' } }
          )
            .then(res => res.json())
            .then(data => {
              const city = data.address?.city || data.address?.town || data.address?.village || `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`;
              const input = document.getElementById('settings-location-input');
              if (input) input.value = city;

              // Save coordinates
              SettingsManager.set('userCoordinates', { lat: latitude, lon: longitude });

              // SMART DEFAULT UPDATE FOR UI
              if (data.address?.country_code) {
                const defaults = getDefaultsForCountry(data.address.country_code);

                // Update Calculation Dropdown
                const calcSelect = document.getElementById('settings-calculation-method');
                if (calcSelect) {
                  calcSelect.value = defaults.method;
                  calcSelect.style.borderColor = 'var(--success)';
                  setTimeout(() => calcSelect.style.borderColor = '', 1000);
                }

                // Update Asr Radio
                const asrRadios = document.querySelectorAll('input[name="settings-asr-method"]');
                asrRadios.forEach(r => {
                  if (r.value === defaults.asr) r.checked = true;
                });
              }

              btn.disabled = false;
              btn.innerHTML = '<i data-lucide="navigation" style="width: 20px; height: 20px;"></i>';
              if (window.lucide) lucide.createIcons();
            })
            .catch(() => {
              const input = document.getElementById('settings-location-input');
              if (input) input.value = `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`;
              btn.disabled = false;
              btn.innerHTML = '<i data-lucide="navigation" style="width: 20px; height: 20px;"></i>';
              if (window.lucide) lucide.createIcons();
            });
        } catch (e) {
          console.error('Position handler error:', e);
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="navigation" style="width: 20px; height: 20px;"></i>';
        }
      },
      (error) => {
        alert('Could not detect location. Please enter manually.');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="navigation" style="width: 20px; height: 20px;"></i>';
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  } catch (e) {
    console.error('detectPrayerSettingsLocation error:', e);
  }
}

function savePrayerSettings() {
  try {
    const locationInput = document.getElementById('settings-location-input');
    const calcSelect = document.getElementById('settings-calculation-method');
    const asrRadio = document.querySelector('input[name="settings-asr-method"]:checked');
    const hijriInput = document.getElementById('settings-hijri-adj');
    const highLatSelect = document.getElementById('settings-high-lat');

    const location = locationInput?.value.trim();
    if (!location) {
      alert('Please enter a location');
      return;
    }

    const calcMethod = calcSelect?.value || 'Karachi';
    const asrMethod = asrRadio?.value || 'Shafi';
    const hijriAdj = hijriInput?.value || '0';
    const highLat = highLatSelect?.value || '0';

    // Save via SettingsManager
    SettingsManager.set('userLocation', location);
    SettingsManager.set('calculationMethod', calcMethod);
    SettingsManager.set('asrMethod', asrMethod);
    SettingsManager.set('hijriAdjustment', hijriAdj);
    SettingsManager.set('highLatitudeRule', highLat);

    // Feedback & Reload
    const saveBtn = document.getElementById('save-prayer-settings');
    if (saveBtn) {
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.7';
    }

    setTimeout(() => {
      window.location.reload();
    }, 500);

  } catch (e) {
    console.error('savePrayerSettings error:', e);
    alert('Error saving settings');
    const saveBtn = document.getElementById('save-prayer-settings');
    if (saveBtn) {
      saveBtn.textContent = 'Save Settings';
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
    }
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

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          try {
            // Initialize lucide icons
            if (window.lucide) {
              lucide.createIcons();
            }

            // Initialize onboarding
            if (window.initOnboarding) {
              window.initOnboarding();
            }
          } catch (e) {
            console.error('Onboarding init error:', e);
          }
        }, 50);
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

/* ===============================
   SMART DEFAULTS UTILS
================================ */
function getDefaultsForCountry(countryCode) {
  if (!countryCode) return { method: 'MWL', asr: 'Shafi' };

  const code = countryCode.toUpperCase();

  // South Asia (Karachi)
  if (['PK', 'BD', 'IN', 'AF', 'LK'].includes(code)) {
    return { method: 'Karachi', asr: 'Hanafi' };
  }

  // North America (ISNA)
  if (['US', 'CA'].includes(code)) {
    return { method: 'ISNA', asr: 'Shafi' };
  }

  // Europe (Muslim World League)
  // GB, FR, DE, ES, IT, NL, BE, CH, SE, NO, DK, FI, AT, IE, PT, GR
  if (['GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'FI', 'AT', 'IE', 'PT', 'GR', 'RU'].includes(code)) {
    return { method: 'MWL', asr: 'Shafi' };
  }

  // Gulf Region
  if (code === 'SA') return { method: 'Makkah', asr: 'Shafi' }; // Saudi -> Umm Al-Qura
  if (code === 'AE') return { method: 'Dubai', asr: 'Shafi' };  // UAE -> Dubai
  if (code === 'KW') return { method: 'Kuwait', asr: 'Shafi' }; // Kuwait
  if (code === 'QA') return { method: 'Qatar', asr: 'Shafi' };  // Qatar
  if (['BH', 'OM', 'YE'].includes(code)) return { method: 'Makkah', asr: 'Shafi' }; // Others -> Umm Al-Qura

  // Arab World / Africa (Egyptian General Authority)
  if (['EG', 'SD', 'LY', 'DZ', 'MA', 'TN', 'SY', 'LB', 'JO', 'PS', 'IQ'].includes(code)) {
    return { method: 'Egypt', asr: 'Shafi' };
  }

  // Turkey
  if (code === 'TR') return { method: 'Turkey', asr: 'Hanafi' };

  // Iran
  if (code === 'IR') return { method: 'Tehran', asr: 'Shafi' };

  // SE Asia (Singapore/Makkah)
  if (code === 'SG') return { method: 'Singapore', asr: 'Shafi' };
  if (['ID', 'MY', 'BN'].includes(code)) return { method: 'Singapore', asr: 'Shafi' }; // often mapped to Singapore or Makkah

  return { method: 'MWL', asr: 'Shafi' };
}

async function autoConfigureSettings(lat, lon) {
  try {
    // Only configure if NOT fully set yet
    if (localStorage.getItem('calculationMethod') && localStorage.getItem('asrMethod')) {
      return;
    }

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    const countryCode = data.address?.country_code;

    if (countryCode) {
      const defaults = getDefaultsForCountry(countryCode);

      if (!localStorage.getItem('calculationMethod')) {
        localStorage.setItem('calculationMethod', defaults.method);
        console.log(`Auto-set Method to ${defaults.method} for ${countryCode}`);
      }

      if (!localStorage.getItem('asrMethod')) {
        localStorage.setItem('asrMethod', defaults.asr);
        console.log(`Auto-set Asr to ${defaults.asr} for ${countryCode}`);
      }

      // Update userPreferences object too
      const prefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      prefs.calculationMethod = localStorage.getItem('calculationMethod');
      prefs.asrMethod = localStorage.getItem('asrMethod');
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
    }
  } catch (e) {
    console.error('Auto-config error:', e);
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
        async (pos) => {
          try {
            // Save detected location coordinates for reuse
            const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            localStorage.setItem('userCoordinates', JSON.stringify(coords));

            // Auto-configure based on location
            await autoConfigureSettings(pos.coords.latitude, pos.coords.longitude);

            fetchAdvPrayerTimes(pos.coords.latitude, pos.coords.longitude);
          } catch (e) {
            console.error('Location fetch error:', e);
            fetchAdvPrayerTimes(23.8103, 90.4125);
          }
        },
        () => {
          console.warn('Geolocation denied, trying saved or default');
          const saved = JSON.parse(localStorage.getItem('userCoordinates') || 'null');
          if (saved) {
            fetchAdvPrayerTimes(saved.lat, saved.lon);
          } else {
            fetchAdvPrayerTimes(23.8103, 90.4125);
          }
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


const CALCULATION_METHODS = {
  'Karachi': 1,
  'ISNA': 2,
  'MWL': 3,
  'Makkah': 4,
  'Egypt': 5,
  'Tehran': 7,
  'Dubai': 8,
  'Kuwait': 9,
  'Qatar': 10,
  'Singapore': 11,
  'France': 12,
  'Turkey': 13,
  'Russia': 14,
  'Moonsighting': 15
};

const ASR_METHODS = {
  'Shafi': 0, // Standard
  'Hanafi': 1
};

async function fetchAdvPrayerTimes(lat, lon) {
  try {
    const settings = SettingsManager.getAll();
    const savedCalc = settings.calculationMethod;
    const savedAsr = settings.asrMethod;
    const hijriAdj = settings.hijriAdjustment;
    const highLat = settings.highLatitudeRule || 0; // New Setting

    // Map to API values
    const methodId = CALCULATION_METHODS[savedCalc] || 1;
    const schoolId = ASR_METHODS[savedAsr] || 0;

    console.log(`Fetching prayer times for Lat: ${lat}, Lon: ${lon}, Method: ${methodId}, School: ${schoolId}, Adj: ${hijriAdj}, HighLat: ${highLat}`);

    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${methodId}&school=${schoolId}&adjustment=${hijriAdj}&latitudeAdjustmentMethod=${highLat}`);

    if (!res.ok) throw new Error('Prayer times API error');

    const json = await res.json();
    if (!json.data) throw new Error('Invalid API response');

    const timings = json.data.timings;
    const meta = json.data.meta;
    const dateData = json.data.date;

    // Cache the latest timings
    window.latestPrayerData = { timings, meta, date: new Date() };

    // Update Home Page Elements
    const locEl = document.getElementById("adv-location");
    // Use saved location name if available, else timezone
    if (locEl) locEl.textContent = settings.userLocation || meta.timezone.split("/")[1]?.replace(/_/g, " ") || "Location Detected";

    // Update Date with Hijri
    const dateEl = document.getElementById("adv-date");
    if (dateEl && dateData && dateData.hijri) {
      const h = dateData.hijri;
      const g = dateData.gregorian;
      dateEl.innerHTML = `${h.day} ${h.month.en} ${h.year} <span style="opacity:0.6; margin: 0 6px;">•</span> ${g.day} ${g.month.en} ${g.year}`;
    }

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

// Global state to track notifications
let lastNotified = { date: null, prayer: null };

function startAdvCountdown(timings) {
  try {
    if (window.advInterval) clearInterval(window.advInterval);

    function update() {
      // Update UI
      updateCurrentPrayerDisplay(timings);

      // Notification Check
      try {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dateStr = now.toDateString();

        // Reset notification state if new day
        if (lastNotified.date !== dateStr) {
          lastNotified = { date: dateStr, prayer: null };
        }

        ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(prayer => {
          // Check if timings[prayer] exists and matches current time
          // timing string format "HH:MM" or "HH:MM (EST)"
          if (!timings[prayer]) return;
          const pTime = timings[prayer].split(' ')[0];

          if (timeStr === pTime && lastNotified.prayer !== prayer) {
            lastNotified.prayer = prayer; // latch
            NotificationManager.trigger(prayer);
          }
        });
      } catch (e) {
        console.error('Notification check error:', e);
      }
    }

    update();
    window.advInterval = setInterval(update, 1000);
  } catch (e) {
    console.error('startAdvCountdown error:', e);
  }
}

function updateCurrentPrayerDisplay(timings) {
  try {
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
    // Use cached data if available, otherwise we wait for the fetch in background
    // If you came from Home page, latestPrayerData should be set.
    const timings = window.latestPrayerData ? window.latestPrayerData.timings : null;

    if (!timings) {
      // Fallback or trigger fetch if coords exist
      const saved = JSON.parse(localStorage.getItem('userCoordinates') || 'null');
      if (saved) {
        fetchAdvPrayerTimes(saved.lat, saved.lon).then(() => {
          if (window.latestPrayerData) updatePrayerTimes();
        });
      }
      return;
    }

    const times = {
      'Fajr': formatTo12h(timings.Fajr),
      'Sunrise': formatTo12h(timings.Sunrise),
      'Forbidden1': `${formatTo12h(timings.Sunrise)} - ${addMinutes(timings.Sunrise, 15)}`,
      'Duha': `${addMinutes(timings.Sunrise, 20)} - ${addMinutes(timings.Dhuhr, -45)}`,
      'Forbidden2': `${addMinutes(timings.Dhuhr, -10)} - ${formatTo12h(timings.Dhuhr)}`,
      'Dhuhr': formatTo12h(timings.Dhuhr),
      'Asr': formatTo12h(timings.Asr),
      'Forbidden3': `${addMinutes(timings.Maghrib, -15)} - ${formatTo12h(timings.Maghrib)}`,
      'Sunset': formatTo12h(timings.Maghrib), // Maghrib starts at Sunset
      'Maghrib': formatTo12h(timings.Maghrib),
      'Isha': formatTo12h(timings.Isha),
      'Tahajjud': `${addMinutes(timings.Isha, 60)} - ${addMinutes(timings.Fajr, -45)}`
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

// Helper to add minutes to HH:MM time
function addMinutes(timeStr, minsToAdd) {
  if (!timeStr) return "--:--";
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minsToAdd, 0);
    const newH = date.getHours();
    const newM = date.getMinutes();
    const period = newH >= 12 ? "pm" : "am";
    const showH = newH % 12 || 12;
    return `${showH}:${String(newM).padStart(2, '0')} ${period}`;
  } catch (e) { return "--:--"; }
}

function updateCurrentPrayer() {
  try {
    // Determine current prayer based on time

    // START DYNAMIC CALCULATION
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    let currentPrayer = '--';
    let timeRemaining = '--:--';

    if (window.latestPrayerData && window.latestPrayerData.timings) {
      const t = window.latestPrayerData.timings;

      const getMins = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      // Define ranges dynamically
      // Note: This logic can be made more sophisticated to handle next day Fajr, etc.
      // For simplicity, we use gaps between prayers.

      const f = getMins(t.Fajr);
      const s = getMins(t.Sunrise);
      const d = getMins(t.Dhuhr);
      const a = getMins(t.Asr);
      const m = getMins(t.Maghrib);
      const i = getMins(t.Isha);

      const prayerRanges = [
        { name: 'Fajr', start: f, end: s, next: d }, // Fajr ends at Sunrise visually for this app context? Or until Dhuhr? Usually Fajr time is short. Let's use start times.
        { name: 'Dhuhr', start: d, end: a, next: a },
        { name: 'Asr', start: a, end: m, next: m },
        { name: 'Maghrib', start: m, end: i, next: i },
        { name: 'Isha', start: i, end: 24 * 60, next: f } // Isha until midnight/fajr
      ];

      // Special check for after midnight before Fajr (part of Isha usually)
      if (timeInMinutes < f) {
        currentPrayer = 'Isha';
        const remaining = f - timeInMinutes;
        const remH = Math.floor(remaining / 60);
        const remM = remaining % 60;
        timeRemaining = `${remH}:${String(remM).padStart(2, '0')}`;
      } else {
        for (const p of prayerRanges) {
          if (timeInMinutes >= p.start && timeInMinutes < p.end) {
            currentPrayer = p.name;
            // Time remaining to NEXT prayer start? or end of this one? 
            // "Prayer Progress Circle - Animated ring showing remaining time for active prayer" 
            // typically means time left until the NEXT prayer comes in.

            let endTime = p.next;
            // If next is Fajr (tomorrow), we need to handle wrapping
            if (p.name === 'Isha' && endTime < timeInMinutes) {
              // This is complex for simplified logic, let's treat end of day
              endTime = 24 * 60 + getMins(t.Fajr);
            }

            let remaining = endTime - timeInMinutes;
            if (remaining < 0) remaining += 24 * 60;

            const remH = Math.floor(remaining / 60);
            const remM = remaining % 60;
            timeRemaining = `${remH}:${String(remM).padStart(2, '0')}`;
            break;
          }
        }
      }
    } else {
      // Fallback or loading state
      timeRemaining = 'Loading...';
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
