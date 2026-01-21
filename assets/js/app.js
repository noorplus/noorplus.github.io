const main = document.getElementById("app-main");
const buttons = document.querySelectorAll(".bottom-nav button");

/* Service Worker Registration */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('NoorPlus SW Registered'))
      .catch(err => console.log('NoorPlus SW Error:', err));
  });
}

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
  const keysToKeep = [
    'onboardingCompleted', 'userPreferences', 'theme', 'language',
    'calculationMethod', 'hijriOffset', 'noorplus_tracker_strict',
    'noorplus_cache_version', 'noorplus_cache_timestamp', 'noorplus_latest_prayer_times'
  ];
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
        if (!res.ok) {
          // Fallback to construction page if not found
          console.warn(`Page ${page} not found, loading construction.`);
          return fetch("pages/construction.html").then(r => r.text());
        }
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
        else if (page === "quran") initQuranReadPage();
        else if (page === "audio-quran") initAudioQuranPage();
        else if (page === "prayer-time") initPrayerTimePage();
        else if (page === "tasbih") initTasbihPage();
        else if (page === "hadith") initHadithPage();
        else if (page === "dua") initDuaPage();
        else if (page === "library") initLibraryPage();
        else if (page === "kitab") initKitabPage();
        else if (page === "qibla") initQiblaPage();
        else if (page === "zakat") initZakatPage();
        else if (page === "hijri") initHijriPage();
        else if (page === "mosque") initMosquePage();
        else if (page === "donate") initDonatePage();
        else if (page === "community") initCommunityPage();
        else if (page === "menu") initMenuPage();
      })
      .catch(err => {
        console.error("Navigation Error:", err);
        // Last resort error UI
        main.innerHTML = `<div style="padding:40px; text-align:center; color:var(--alert);">
          <h3>Something went wrong</h3>
          <p>Could not load content.</p>
          <button onclick="location.reload()" class="action-btn" style="margin-top:16px;">Reload App</button>
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

// ==========================================
// MENU & SETTINGS (Rebuild)
// ==========================================

function initMenuPage() {
  console.log("Initializing Menu Page (Rebuild)...");

  // 1. Prayer Settings Modal & Wizard
  const prayerBtn = document.getElementById('prayer-settings-btn');
  const prayerModal = document.getElementById('prayer-settings-modal');
  const closePrayer = document.getElementById('close-settings-modal');

  if (prayerBtn && prayerModal) {
    prayerBtn.onclick = () => {
      loadPrayerSettingsModal();
      prayerModal.classList.remove('hidden');
    };
  }
  if (closePrayer && prayerModal) {
    closePrayer.onclick = () => prayerModal.classList.add('hidden');
  }

  // Modal Background Click (Prayer)
  if (prayerModal) {
    prayerModal.onclick = (e) => {
      if (e.target === prayerModal) prayerModal.classList.add('hidden');
    };
  }

  // Wizard Nav
  const nextBtn = document.getElementById('wizard-next-btn');
  const backBtn = document.getElementById('wizard-back-btn');
  const saveBtn = document.getElementById('wizard-save-btn');

  if (nextBtn) {
    nextBtn.onclick = () => {
      document.getElementById('wizard-step-1').classList.remove('active');
      document.getElementById('wizard-step-2').classList.add('active');
    };
  }
  if (backBtn) {
    backBtn.onclick = () => {
      document.getElementById('wizard-step-2').classList.remove('active');
      document.getElementById('wizard-step-1').classList.add('active');
    };
  }
  if (saveBtn) {
    saveBtn.onclick = savePrayerSettings;
  }

  // 2. Notifications Modal
  const notifBtn = document.getElementById('notifications-btn');
  const notifModal = document.getElementById('notification-settings-modal');
  const closeNotif = document.getElementById('close-notif-modal');
  const saveNotif = document.getElementById('save-notif-settings');

  if (notifBtn && notifModal) {
    notifBtn.onclick = () => {
      loadNotificationSettings();
      notifModal.classList.remove('hidden');
    };
  }
  if (closeNotif && notifModal) {
    closeNotif.onclick = () => notifModal.classList.add('hidden');
  }

  // Modal Background Click (Notif)
  if (notifModal) {
    notifModal.onclick = (e) => {
      if (e.target === notifModal) notifModal.classList.add('hidden');
    };
  }

  if (saveNotif) {
    saveNotif.onclick = async () => {
      // Gather settings
      const settings = {
        enabled: document.getElementById('notif-master-toggle')?.checked || false,
        prayers: {}
      };
      document.querySelectorAll('.notif-checkbox').forEach(cb => {
        settings.prayers[cb.dataset.prayer] = cb.checked;
      });

      NotificationManager.saveSettings(settings); // Assume exists

      saveNotif.textContent = "Saved";
      setTimeout(() => {
        notifModal.classList.add('hidden');
        saveNotif.textContent = "Save Preferences";
      }, 800);
    };
  }

  // Notification Master Toggle Logic
  const masterToggle = document.getElementById('notif-master-toggle');
  if (masterToggle) {
    masterToggle.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const granted = await NotificationManager.requestPermission();
        if (!granted) {
          e.target.checked = false;
          alert("Notifications permission denied. Please enable in browser settings.");
        }
      }
    });
  }

  // 3. System
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.onclick = () => {
      if (confirm('Reset all app data? This cannot be undone.')) {
        localStorage.clear();
        window.location.reload();
      }
    };
  }

  // 4. Dynamic Description
  const prayerDesc = document.getElementById('menu-prayer-settings-desc');
  if (prayerDesc) {
    const s = SettingsManager.getAll();
    prayerDesc.textContent = `${s.userLocation || 'Location'} • ${s.calculationMethod || 'Karachi'}`;
  }

  // 5. Select & Pill Logic (Wizard)
  const calcSelect = document.getElementById('settings-calculation-method');
  if (calcSelect) {
    calcSelect.addEventListener('change', (e) => {
      document.getElementById('disp-calc-method').textContent = e.target.options[e.target.selectedIndex].text.split('(')[0].trim();
    });
  }
  const asrSelect = document.getElementById('settings-asr-method-select');
  if (asrSelect) {
    asrSelect.addEventListener('change', (e) => {
      document.getElementById('disp-asr-method').textContent = e.target.options[e.target.selectedIndex].text;
    });
  }

  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const val = parseInt(e.currentTarget.dataset.val);
      document.getElementById('settings-hijri-adj').value = val;
      updateHijriDescription(val);
    };
  });

  if (window.lucide) window.lucide.createIcons();
  initThemeToggle();
}

function loadPrayerSettingsModal() {
  console.log("Loading Prayer Settings...");
  const s = SettingsManager.getAll();

  // Step 1 Reset
  document.getElementById('wizard-step-1').classList.add('active');
  document.getElementById('wizard-step-2').classList.remove('active');

  // Location
  document.getElementById('wizard-location-text').textContent = s.userLocation || "Auto Detected";
  try {
    document.getElementById('wizard-timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { }

  // Calc Method
  const calcSelect = document.getElementById('settings-calculation-method');
  if (calcSelect) {
    calcSelect.value = s.calculationMethod;
    const selText = calcSelect.options[calcSelect.selectedIndex]?.text.split('(')[0].trim();
    document.getElementById('disp-calc-method').textContent = selText || s.calculationMethod;
  }

  // Asr Method
  const asrSelect = document.getElementById('settings-asr-method-select');
  if (asrSelect) {
    asrSelect.value = s.asrMethod;
    const selText = asrSelect.options[asrSelect.selectedIndex]?.text;
    document.getElementById('disp-asr-method').textContent = selText || s.asrMethod;
  }

  // Hijri
  const hAdj = parseInt(s.hijriAdjustment || 0);
  document.getElementById('settings-hijri-adj').value = hAdj;
  document.querySelectorAll('.pill-btn').forEach(btn => {
    if (parseInt(btn.dataset.val) === hAdj) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  updateHijriDescription(hAdj);

  // Save Btn Reset
  const btn = document.getElementById('wizard-save-btn');
  if (btn) {
    btn.classList.remove('success'); // Reset state
    btn.innerHTML = '<i data-lucide="check"></i>';
    btn.disabled = false;
  }
  if (window.lucide) window.lucide.createIcons();
}

function updateHijriDescription(val) {
  const el = document.getElementById('hijri-desc-text');
  if (el) {
    if (val === 0) el.textContent = "Matches Saudi Arabia";
    else if (val > 0) el.textContent = `${val} days ahead of Saudi Arabia`;
    else el.textContent = `${Math.abs(val)} days behind Saudi Arabia`;
  }
}

async function savePrayerSettings() {
  const saveBtn = document.getElementById('wizard-save-btn');
  if (saveBtn) {
    saveBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i>';
    saveBtn.disabled = true;
  }

  try {
    const calc = document.getElementById('settings-calculation-method').value;
    const asr = document.getElementById('settings-asr-method-select').value;
    const hijri = document.getElementById('settings-hijri-adj').value;

    SettingsManager.set('calculationMethod', calc);
    SettingsManager.set('asrMethod', asr);
    SettingsManager.set('hijriAdjustment', hijri);

    // Simulate save delay
    await new Promise(r => setTimeout(r, 600));

    // Save location if not set (Auto-detect logic elsewhere, but ensure we keep it)
    // Note: We aren't changing loc here, just keeping it.

    window.location.reload(); // Hard reload to apply calculation changes to schedule

  } catch (e) {
    console.error("Save error", e);
    if (saveBtn) {
      saveBtn.textContent = "Error";
      saveBtn.disabled = false;
    }
  }
}

function loadNotificationSettings() {
  const config = NotificationManager.getSettings(); // Assume returns {enabled: bool, prayers: {Fajr: bool...}}

  // Master
  const master = document.getElementById('notif-master-toggle');
  if (master) master.checked = (config.enabled !== false);

  // Individual
  document.querySelectorAll('.notif-checkbox').forEach(cb => {
    const p = cb.dataset.prayer;
    if (config.prayers && typeof config.prayers[p] !== 'undefined') {
      cb.checked = config.prayers[p];
    } else {
      cb.checked = true; // Default true
    }
  });
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


// (Duplicate savePrayerSettings removed)



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

// ==========================================
// GLOBAL QURAN MODULE (3-Layer Architecture)
// ==========================================

// --- 1. DATA LAYER ---
const QuranDataService = {
  cache: {},

  async getSurahList() {
    if (this.cache.list) return this.cache.list;
    const local = localStorage.getItem('quran_surah_list');
    if (local) {
      this.cache.list = JSON.parse(local);
      return this.cache.list;
    }

    const res = await fetch("https://api.alquran.cloud/v1/surah");
    const data = await res.json();
    this.cache.list = data.data;
    localStorage.setItem('quran_surah_list', JSON.stringify(data.data));
    return data.data;
  },

  async getSurahDetails(number, reciterId) {
    const key = `surah_${number}_${reciterId}`;
    if (this.cache[key]) return this.cache[key];

    const apiUrl = `https://api.alquran.cloud/v1/surah/${number}/editions/${reciterId},en.sahih`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    // Normalize: json.data[0] = Audio/Arabic, json.data[1] = Translation
    const audioData = json.data[0];
    const textData = json.data[1];

    const ayahs = audioData.ayahs.map((ayah, index) => ({
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      text: ayah.text,
      audio: ayah.audio,
      translation: textData.ayahs[index] ? textData.ayahs[index].text : ""
    }));

    const result = {
      meta: {
        name: audioData.name,
        englishName: audioData.englishName,
        englishNameTranslation: audioData.englishNameTranslation,
        revelationType: audioData.revelationType,
        numberOfAyahs: audioData.numberOfAyahs,
        number: audioData.number
      },
      ayahs: ayahs
    };

    this.cache[key] = result;
    return result;
  }
};

// --- 2. STATE LAYER ---
class QuranState {
  constructor() {
    this.state = {
      currentSurah: null,
      currentAyahIndex: 0,
      isPlaying: false,
      reciter: localStorage.getItem('quran_reciter') || 'ar.alafasy',
      playbackSpeed: parseFloat(localStorage.getItem('quran_speed') || '1.0')
    };
    this.listeners = [];
  }

  get() { return this.state; }

  setSurah(surahData) {
    this.state.currentSurah = surahData;
    this.state.currentAyahIndex = 0;
    this.notify();
  }

  setAyah(index) {
    if (!this.state.currentSurah) return;
    if (index >= 0 && index < this.state.currentSurah.ayahs.length) {
      this.state.currentAyahIndex = index;
      this.notify();
    }
  }

  setPlaying(bool) {
    this.state.isPlaying = bool;
    this.notify();
  }

  setReciter(id) {
    this.state.reciter = id;
    localStorage.setItem('quran_reciter', id);
  }

  setSpeed(speed) {
    this.state.playbackSpeed = speed;
    localStorage.setItem('quran_speed', speed);
    this.notify();
  }

  subscribe(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach(fn => fn(this.state)); }
}

// --- 3. AUDIO ENGINE ---
class AyahPlayer {
  constructor(stateManager) {
    this.audio = new Audio();
    this.stateManager = stateManager;

    this.audio.onended = () => this.onTrackEnd();
    this.audio.onerror = (e) => console.error("Audio Error", e);
    this.audio.onplay = () => stateManager.setPlaying(true);
    this.audio.onpause = () => stateManager.setPlaying(false);
    this.audio.ontimeupdate = () => this.emitProgress();
  }

  loadAndPlay(url) {
    if (!url) return;
    this.audio.src = url;
    this.audio.playbackRate = this.stateManager.get().playbackSpeed;
    this.audio.play().catch(e => console.warn("Autoplay blocked", e));
  }

  play() { this.audio.play(); }
  pause() { this.audio.pause(); }

  onTrackEnd() {
    const s = this.stateManager.get();
    const nextIdx = s.currentAyahIndex + 1;
    if (s.currentSurah && nextIdx < s.currentSurah.ayahs.length) {
      this.stateManager.setAyah(nextIdx);
    } else {
      this.stateManager.setPlaying(false);
    }
  }

  emitProgress() {
    const pct = (this.audio.currentTime / this.audio.duration) * 100 || 0;
    document.dispatchEvent(new CustomEvent('quran-progress', {
      detail: {
        current: this.audio.currentTime,
        total: this.audio.duration || 0,
        percent: pct
      }
    }));
  }

  seek(pct) {
    if (this.audio.duration) {
      this.audio.currentTime = (pct / 100) * this.audio.duration;
    }
  }

  updateSpeed() {
    this.audio.playbackRate = this.stateManager.get().playbackSpeed;
  }
}

// --- 4. UI LAYER ---
const QuranUI = {
  renderList(list, onSelect) {
    const container = document.getElementById('surah-list');
    if (!container) return;
    container.innerHTML = '';

    list.forEach(surah => {
      const el = document.createElement('div');
      el.className = 'q-item';
      el.innerHTML = `
                <div class="q-item-num">${surah.number}</div>
                <div class="q-item-info">
                   <h4>${surah.englishName}</h4>
                   <p>${surah.englishNameTranslation} • ${surah.numberOfAyahs} Ayahs</p>
                </div>
                <div class="q-item-ar">${surah.name.replace('سُورَةُ ', '')}</div>
            `;
      el.onclick = () => onSelect(surah);
      container.appendChild(el);
    });
  },

  showReader(meta) {
    document.getElementById('quran-main-view').classList.add('hidden');
    document.getElementById('ayah-view').classList.remove('hidden');

    // Header
    const hTitle = document.getElementById('q-header-title');
    if (hTitle) {
      hTitle.textContent = meta.englishName;
      hTitle.classList.remove('hidden');
    }
    document.getElementById('q-header-subtitle').textContent = meta.englishNameTranslation;

    // Card
    document.getElementById('det-name-ar').textContent = meta.name;
    document.getElementById('det-name-en').textContent = meta.englishName;
    document.getElementById('det-place').textContent = meta.revelationType;
    document.getElementById('det-ayahs-count').textContent = meta.numberOfAyahs;
  },

  renderAyahs(ayahs, onPlay) {
    const container = document.getElementById('ayah-list');
    if (!container) return;
    container.innerHTML = '';

    ayahs.forEach((ayah, idx) => {
      const el = document.createElement('div');
      el.className = 'ayah-item';
      el.id = `ayah-row-${idx}`;
      el.innerHTML = `
               <div class="ayah-top"> <!-- Changed class from top to header-bar if needed, but css uses .ayah-top -->
                  <div style="font-size:12px;width:24px;height:24px;background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center;">${ayah.numberInSurah}</div>
                  <button class="icon-btn-sm btn-play-ayah"><i data-lucide="play" style="width:14px"></i></button>
               </div>
               <div class="ayah-text-ar">${ayah.text}</div>
               <div class="ayah-text-en">${ayah.translation}</div>
            `;

      el.querySelector('.btn-play-ayah').onclick = (e) => {
        e.stopPropagation();
        onPlay(idx);
      };

      container.appendChild(el);
    });
    if (window.lucide) lucide.createIcons();
  },

  highlightAyah(index) {
    document.querySelectorAll('.ayah-item.active').forEach(e => e.classList.remove('active'));
    const el = document.getElementById(`ayah-row-${index}`);
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  updatePlayer(state) {
    const icon = state.isPlaying ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';

    // Mini Player
    const mb = document.getElementById('q-mp-play');
    if (mb) { mb.innerHTML = icon; mb.setAttribute('fill', 'currentColor'); }

    // Full Player
    const fb = document.getElementById('q-fp-play');
    if (fb) { fb.innerHTML = icon; fb.setAttribute('fill', 'currentColor'); }

    // Info
    if (state.currentSurah) {
      const curAyah = state.currentSurah.ayahs[state.currentAyahIndex];
      const title = `${state.currentSurah.meta.englishName} : ${curAyah.numberInSurah}`;

      const miniTitle = document.getElementById('q-mp-title');
      if (miniTitle) miniTitle.textContent = title;

      const fullAr = document.getElementById('q-fp-title-ar');
      if (fullAr) fullAr.textContent = state.currentSurah.meta.name;

      const fullTitle = document.getElementById('q-fp-title');
      if (fullTitle) fullTitle.textContent = title;
    }

    // Show Mini Player if playing or surah loaded
    if (state.currentSurah) {
      document.getElementById('q-mini-player').classList.remove('hidden');
    }

    if (window.lucide) lucide.createIcons();
  }
};

// --- CONTROLLER ---
// --- READ CONTROLLER (Text Only) ---
async function initQuranReadPage() {
  console.log("Quran Reader Init");

  if (!window.quranState) {
    window.quranState = new QuranState();
    // We don't init player here if not needed, or we share state
  }
  const qs = window.quranState;

  // 1. Initial Render
  const listContainer = document.getElementById('surah-list');
  if (listContainer) {
    listContainer.innerHTML = '<p class="q-loading">Loading Surahs...</p>';
    try {
      const list = await QuranDataService.getSurahList();
      QuranUI.renderList(list, async (surah) => {
        // Handle Surah Selection for Reading
        document.getElementById('quran-main-view').classList.add('hidden');
        document.getElementById('ayah-view').classList.remove('hidden');

        const hTitle = document.getElementById('q-header-title');
        if (hTitle) {
          hTitle.classList.remove('hidden');
          hTitle.textContent = surah.englishName;
        }
        document.getElementById('q-header-subtitle').textContent = "Reading Mode";

        // Load Content
        const ayahsContainer = document.getElementById('ayahs-container');
        ayahsContainer.innerHTML = '<div class="q-loading">Loading Text...</div>';

        try {
          // Fetch text only if possible, or minimal data
          const details = await QuranDataService.getSurahDetails(surah.number, qs.get().reciter);
          qs.setSurah(details);

          // Render Text Only (Simplified View)
          QuranUI.renderAyahs(details.ayahs, (idx) => {
            // On click ayah -> maybe play audio in future? 
            // For now, just highlight or focus
            qs.setAyah(idx);
            QuranUI.highlightAyah(idx);
          });
        } catch (e) {
          console.error("Read fetch error", e);
          ayahsContainer.innerHTML = '<p class="q-error">Failed to load text.</p>';
        }
      });
    } catch (e) {
      console.error(e);
      listContainer.innerHTML = '<p class="q-error">Failed to load list.</p>';
    }
  }

  // Bind Back Button
  const backBtn = document.getElementById('q-back-btn');
  if (backBtn) {
    backBtn.onclick = () => {
      const ayahView = document.getElementById('ayah-view');
      if (!ayahView.classList.contains('hidden')) {
        ayahView.classList.add('hidden');
        document.getElementById('quran-main-view').classList.remove('hidden');

        const hTitle = document.getElementById('q-header-title');
        if (hTitle) hTitle.classList.add('hidden');
        document.getElementById('q-header-subtitle').textContent = "Select Surah";
      } else {
        loadPage('home');
      }
    };
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- AUDIO CONTROLLER (Player Focus) ---
async function initAudioQuranPage() {
  console.log("Quran 3.0 Audio Init");

  // Globals check
  if (!window.quranState) {
    window.quranState = new QuranState();
    window.quranPlayer = new AyahPlayer(window.quranState);

    // Subscribe once
    window.quranState.subscribe(state => {
      QuranUI.updatePlayer(state);
      // Highlighting optional in audio page if looking at list
      QuranUI.highlightAyah(state.currentAyahIndex);

      // Speed sync
      window.quranPlayer.updateSpeed();
    });

    // Play Hook
    const originalSetAyah = window.quranState.setAyah.bind(window.quranState);
    window.quranState.setAyah = (index) => {
      originalSetAyah(index);
      const s = window.quranState.get();
      if (s.currentSurah && s.currentSurah.ayahs[index]) {
        window.quranPlayer.loadAndPlay(s.currentSurah.ayahs[index].audio);
      }
    };
  }

  const qs = window.quranState;
  const player = window.quranPlayer;

  // 1. Initial Render
  try {
    const listContainer = document.getElementById('surah-list');
    if (listContainer) {
      listContainer.innerHTML = '<p class="q-loading">Loading Surahs...</p>';
      const list = await QuranDataService.getSurahList();
      QuranUI.renderList(list, async (surah) => {
        // Select Surah
        listContainer.innerHTML = '<p class="q-loading">Loading Details...</p>';
        try {
          const details = await QuranDataService.getSurahDetails(surah.number, qs.get().reciter);
          qs.setSurah(details);
          QuranUI.showReader(details.meta); // This handles view switching
          QuranUI.renderAyahs(details.ayahs, (idx) => {
            qs.setAyah(idx);
            player.loadAndPlay(details.ayahs[idx].audio);
          });
        } catch (e) {
          console.warn("Details Fetch Failed", e);
          listContainer.innerHTML = '<p class="q-error">Failed to load details.</p>';
        }
      });
    }
  } catch (e) {
    console.error("Init Error", e);
  }

  // 2. Event Binding (Re-binds on every init is okay if elements are replaced, 
  // but typically initQuranPage is called on nav. We should be careful not to duplicate listeners if elements persist.)
  // Note: in loadPage, main.innerHTML is replaced, so elements are fresh. Listeners need re-binding.

  const togglePlay = () => {
    const s = qs.get();
    s.isPlaying ? player.pause() : player.play();
  };

  // Bind Controls
  const bindClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  bindClick('q-mp-play', togglePlay);
  bindClick('q-fp-play', togglePlay);

  const doNext = () => qs.setAyah(qs.get().currentAyahIndex + 1);
  const doPrev = () => qs.setAyah(qs.get().currentAyahIndex - 1);

  bindClick('q-mp-next', doNext);
  bindClick('q-fp-next', doNext);
  bindClick('q-mp-prev', doPrev);
  bindClick('q-fp-prev', doPrev);

  // Expand
  const expandArea = document.getElementById('q-mp-expand-area');
  if (expandArea) expandArea.onclick = () => {
    document.getElementById('q-full-player').style.display = 'flex';
  };
  bindClick('q-fp-close', () => document.getElementById('q-full-player').style.display = 'none');

  // Seek
  const onSeek = (e) => player.seek(e.target.value);
  const miniSeek = document.getElementById('q-mini-seek');
  if (miniSeek) miniSeek.oninput = onSeek;
  const fullSeek = document.getElementById('q-fp-seek');
  if (fullSeek) fullSeek.oninput = onSeek;

  // Progress Listener (Global)
  if (!window.qProgressBound) {
    document.addEventListener('quran-progress', (e) => {
      const { percent, current, total } = e.detail;
      const mb = document.getElementById('q-mini-progress-bar');
      if (mb) mb.style.width = `${percent}%`;

      const ms = document.getElementById('q-mini-seek');
      if (ms) ms.value = percent;

      const fs = document.getElementById('q-fp-seek');
      if (fs) fs.value = percent;

      const fmt = (t) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };
      const currEl = document.getElementById('q-fp-current');
      if (currEl) currEl.textContent = fmt(current);
      const durEl = document.getElementById('q-fp-duration');
      if (durEl) durEl.textContent = fmt(total);
    });
    window.qProgressBound = true;
  }

  // Back Btn
  bindClick('q-back-btn', () => {
    const ayahView = document.getElementById('ayah-view');
    if (!ayahView.classList.contains('hidden')) {
      ayahView.classList.add('hidden');
      document.getElementById('quran-main-view').classList.remove('hidden');
      const hTitle = document.getElementById('q-header-title');
      if (hTitle) hTitle.classList.add('hidden');
      document.getElementById('q-header-subtitle').textContent = "Select Surah";
    } else {
      // Home
      loadPage('home'); // Use internal loadPage
    }
  });

  if (window.lucide) window.lucide.createIcons();
}


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

    // Optimized Location Logic: Cache First
    const savedCoords = JSON.parse(localStorage.getItem('userCoordinates') || 'null');

    // Load from cache for instant display
    const cached = JSON.parse(localStorage.getItem('noorplus_latest_prayer_times') || 'null');
    if (cached && cached.timings) {
      window.latestPrayerData = cached;
      // Populate basic list immediately
      ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(p => {
        const el = document.getElementById(`s-${p}`);
        if (el && cached.timings[p]) el.textContent = formatTo12h(cached.timings[p]);
      });
      startAdvCountdown(cached.timings);
    }

    if (savedCoords) {
      console.log('Using saved location:', savedCoords);
      fetchAdvPrayerTimes(savedCoords.lat, savedCoords.lon);

      // Optional: Background refresh (only if older than 24h, for example)
      // For now, we rely on manual "Datect Location" in settings for updates
    } else {
      console.log('No saved location, detecting...');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
              localStorage.setItem('userCoordinates', JSON.stringify(coords));
              await autoConfigureSettings(pos.coords.latitude, pos.coords.longitude);
              fetchAdvPrayerTimes(pos.coords.latitude, pos.coords.longitude);
            } catch (e) {
              console.error('Location init error:', e);
              fetchAdvPrayerTimes(23.8103, 90.4125); // Default (Dhaka/Mecca)
            }
          },
          () => {
            console.warn('Geolocation denied/failed, using default');
            fetchAdvPrayerTimes(23.8103, 90.4125);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        fetchAdvPrayerTimes(23.8103, 90.4125);
      }
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
    window.latestPrayerData = { timings, meta, date: new Date().toISOString() };
    localStorage.setItem('noorplus_latest_prayer_times', JSON.stringify(window.latestPrayerData));

    // Update Home Page Elements
    const locEl = document.getElementById("adv-location");
    // Use saved location name if available, else timezone
    if (locEl) locEl.textContent = settings.userLocation || meta.timezone.split("/")[1]?.replace(/_/g, " ") || "Location Detected";

    // Update Date with Hijri
    const dateEl = document.getElementById("adv-date");
    let dateHijriEl = document.getElementById("date-hijri");
    let dateGregEl = document.getElementById("date-gregorian");

    if (dateData && dateData.hijri) {
      const h = dateData.hijri;
      const g = dateData.gregorian;

      // Self-healing: If slider structure invalid, inject it
      if (dateEl && (!dateHijriEl || !dateGregEl)) {
        dateEl.innerHTML = `
            <div class="h-date-slider">
                <div class="h-date-item" id="date-hijri"></div>
                <div class="h-date-item" id="date-gregorian"></div>
            </div>
          `;
        dateHijriEl = document.getElementById("date-hijri");
        dateGregEl = document.getElementById("date-gregorian");
      }

      if (dateHijriEl && dateGregEl) {
        dateHijriEl.textContent = `${h.day} ${h.month.en} ${h.year}`;
        dateGregEl.textContent = `${g.day} ${g.month.en} ${g.year}`;
      }
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

        const pNowEl = document.getElementById("adv-p-now");
        const pStartEl = document.getElementById("adv-p-start");
        const statusDot = document.getElementById("adv-status-dot");
        const fRangeEl = document.getElementById("f-range");
        const sunriseEl = document.getElementById("adv-sunrise");
        const sunsetEl = document.getElementById("adv-sunset");

        if (sunriseEl && timings.Sunrise) sunriseEl.textContent = formatTo12h(timings.Sunrise);
        if (sunsetEl && timings.Sunset) sunsetEl.textContent = formatTo12h(timings.Sunset);

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
          if (statusDot) {
            statusDot.className = "h-status-dot permissible";
          }
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

/* ===============================
   TASBIH MODULE
================================ */
function initTasbihPage() {
  try {
    const tapArea = document.getElementById('t-tap-area');
    const currentEl = document.getElementById('t-current-count');
    const totalEl = document.getElementById('t-total-count');
    const lapEl = document.getElementById('t-lap-count');
    const resetBtn = document.getElementById('t-reset-btn');
    const targetChips = document.querySelectorAll('.t-chip');
    const vibrateToggle = document.getElementById('t-vibrate-toggle');
    const soundToggle = document.getElementById('t-sound-toggle');
    const ringCircle = document.querySelector('.t-ring-circle');

    if (!tapArea) return;

    // State Management
    let current = parseInt(localStorage.getItem('tasbih_current') || '0');
    let total = parseInt(localStorage.getItem('tasbih_total') || '0');
    let lap = parseInt(localStorage.getItem('tasbih_lap') || '0');
    let target = localStorage.getItem('tasbih_target') || '33';
    let vibrateEnabled = localStorage.getItem('tasbih_vibrate') !== 'false';
    let soundEnabled = localStorage.getItem('tasbih_sound') !== 'false';

    const radius = 130;
    const circumference = radius * 2 * Math.PI;

    // Initial UI Update
    updateUI();
    updateToggles();

    // Event Listeners
    tapArea.addEventListener('click', () => {
      increment();
      triggerRipple();
    });

    resetBtn.onclick = () => {
      if (confirm('Reset session and lap counts?')) {
        current = 0;
        lap = 0;
        saveState();
        updateUI();
      }
    };

    targetChips.forEach(chip => {
      chip.onclick = () => {
        target = chip.dataset.target;
        targetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        localStorage.setItem('tasbih_target', target);
        updateProgress();
      };
    });

    vibrateToggle.onclick = () => {
      vibrateEnabled = !vibrateEnabled;
      localStorage.setItem('tasbih_vibrate', vibrateEnabled);
      updateToggles();
    };

    soundToggle.onclick = () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('tasbih_sound', soundEnabled);
      updateToggles();
    };

    function increment() {
      current++;
      total++;

      const targetVal = target === 'infinity' ? Infinity : parseInt(target);

      if (current >= targetVal) {
        lap++;
        current = 0;
        triggerFeedback(true); // Strong feedback for target hit
      } else {
        triggerFeedback(false); // Normal feedback for tap
      }

      saveState();
      updateUI();
    }

    function updateUI() {
      if (currentEl) currentEl.textContent = current;
      if (totalEl) totalEl.textContent = total;
      if (lapEl) lapEl.textContent = lap;
      updateProgress();
    }

    function updateProgress() {
      if (!ringCircle) return;
      const targetVal = target === 'infinity' ? 100 : parseInt(target);
      const progress = target === 'infinity' ? 1 : Math.min(current / targetVal, 1);
      const offset = circumference - (progress * circumference);
      ringCircle.style.strokeDasharray = `${circumference} ${circumference}`;
      ringCircle.style.strokeDashoffset = offset;
    }

    function updateToggles() {
      if (vibrateToggle) {
        vibrateToggle.classList.toggle('active', vibrateEnabled);
        vibrateToggle.querySelector('i').setAttribute('data-lucide', vibrateEnabled ? 'vibrate' : 'vibrate-off');
      }
      if (soundToggle) {
        soundToggle.classList.toggle('active', soundEnabled);
        soundToggle.querySelector('i').setAttribute('data-lucide', soundEnabled ? 'volume-2' : 'volume-x');
      }
      if (window.lucide) lucide.createIcons();
    }

    function triggerRipple() {
      tapArea.classList.remove('pulsing');
      void tapArea.offsetWidth; // Trigger reflow
      tapArea.classList.add('pulsing');
    }

    function triggerFeedback(isTargetHit) {
      if (vibrateEnabled && navigator.vibrate) {
        navigator.vibrate(isTargetHit ? [100, 50, 100] : 40);
      }
      if (soundEnabled) {
        const audio = new Audio('https://www.soundjay.com/buttons/button-16.mp3');
        audio.volume = isTargetHit ? 0.8 : 0.4;
        audio.play().catch(() => { });
      }
    }

    function saveState() {
      localStorage.setItem('tasbih_current', current);
      localStorage.setItem('tasbih_total', total);
      localStorage.setItem('tasbih_lap', lap);
    }

    // Set active target chip based on saved state
    targetChips.forEach(chip => {
      if (chip.dataset.target === target) chip.classList.add('active');
      else chip.classList.remove('active');
    });

  } catch (e) {
    console.error('initTasbihPage error:', e);
  }
}

/* ===============================
   HADITH MODULE
================================ */
const HadithDataService = {
  async getHadithOfTheDay() {
    const cached = JSON.parse(localStorage.getItem('noorplus_hadith_day') || 'null');
    const today = new Date().toISOString().split('T')[0];
    if (cached && cached.date === today) return cached.data;

    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari.json');
      const data = await res.json();
      const hadiths = data.hadiths;
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      const selection = hadiths[dayOfYear % hadiths.length];

      const result = {
        text: selection.text,
        reference: `Sahih Bukhari, Hadith ${selection.hadithnumber}`
      };

      localStorage.setItem('noorplus_hadith_day', JSON.stringify({ date: today, data: result }));
      return result;
    } catch (e) {
      return {
        text: "The best among you are those who have the best manners and character.",
        reference: "Sahih Bukhari 6035"
      };
    }
  },

  async getFeatured() {
    return [
      { text: "Take benefit of five before five: Your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your preoccupation, and your life before your death.", ref: "Al-Hakim" },
      { text: "A good word is charity.", ref: "Sahih Bukhari" },
      { text: "None of you truly believes until he loves for his brother what he loves for himself.", ref: "Sahih Bukhari" }
    ];
  }
};

async function initHadithPage() {
  try {
    const dayText = document.getElementById('h-day-text');
    const dayRef = document.getElementById('h-day-ref');
    const featuredList = document.getElementById('h-featured-list');
    const searchBtn = document.getElementById('h-search-btn');
    const searchContainer = document.getElementById('h-search-container');
    const copyBtn = document.getElementById('h-copy-day');

    // 1. Load Hadith of the Day
    const daily = await HadithDataService.getHadithOfTheDay();
    if (dayText) dayText.textContent = daily.text;
    if (dayRef) dayRef.textContent = daily.reference;

    // 2. Load Featured Feed
    const featured = await HadithDataService.getFeatured();
    if (featuredList) {
      featuredList.innerHTML = featured.map(h => `
        <div class="h-card">
          <p class="h-card-text">${h.text}</p>
          <div class="h-card-footer">
            <span>${h.ref}</span>
            <button class="icon-btn-sm" onclick="copyText('${h.text.replace(/'/g, "\\'")}')"><i data-lucide="copy"></i></button>
          </div>
        </div>
      `).join('');
      if (window.lucide) lucide.createIcons();
    }

    // 3. Search Toggle
    if (searchBtn && searchContainer) {
      searchBtn.onclick = () => {
        const isHidden = searchContainer.style.display === 'none';
        searchContainer.style.display = isHidden ? 'block' : 'none';
      };
    }

    if (copyBtn) {
      copyBtn.onclick = () => copyText(`${daily.text} - ${daily.reference}`);
    }

  } catch (e) {
    console.error('initHadithPage error:', e);
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard!");
  });
}

/* ===============================
   DUA MODULE
================================ */
const DuaDataService = {
  getDuasByCat(cat) {
    const data = {
      morning: [
        {
          title: "Upon Waking Up",
          arabic: "الْحَمْدُ للهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
          trans: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.",
          mean: "All praise is for Allah who gave us life after having taken it from us and unto Him is the resurrection."
        },
        {
          title: "For protection",
          arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
          trans: "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim.",
          mean: "In the Name of Allah, Who with His Name nothing can cause harm in the earth nor in the heavens, and He is the All-Hearing, the All-Knowing. (Recite 3 times)"
        }
      ],
      evening: [
        {
          title: "Evening Supplication",
          arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلهِ وَالْحَمْدُ لِلهِ",
          trans: "Amsayna wa amsal-mulku lillahi wal-hamdu lillah.",
          mean: "We have reached the evening and at this very time unto Allah belongs all sovereignty, and all praise is for Allah."
        }
      ],
      travel: [
        {
          title: "Travel Supplication",
          arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
          trans: "Subhanal-ladhi sakh-khara lana hadha wa ma kunna lahu muqrinina.",
          mean: "Glory is to Him Who has provided this for us, though we could never have subdued it by ourselves."
        }
      ],
      health: [
        {
          title: "For pain in the body",
          arabic: "أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ",
          trans: "A'udhu billahi wa qudratihi min sharri ma ajidu wa uhadhiru.",
          mean: "I seek refuge with Allah and with His Power from the evil that I find and that I fear. (Recite 7 times)"
        }
      ],
      protection: [
        {
          title: "Ayat al-Kursi",
          arabic: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
          trans: "Allahu la ilaha illa Huwal-Hayyul-Qayyum...",
          mean: "Allah! There is no god but He, the Living, the Self-subsisting..."
        }
      ]
    };
    return data[cat] || data.morning;
  }
};

function initDuaPage() {
  try {
    const tabs = document.querySelectorAll('.d-tab');
    const duaList = document.getElementById('d-list');

    if (!duaList) return;

    // Default Load
    renderDuas('morning');

    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderDuas(tab.dataset.cat);
      };
    });

    function renderDuas(cat) {
      const duas = DuaDataService.getDuasByCat(cat);
      duaList.innerHTML = duas.map(d => `
        <div class="d-card">
          <div class="d-card-header">
            <h3 class="d-card-title">${d.title}</h3>
          </div>
          <p class="d-card-arabic">${d.arabic}</p>
          <p class="d-card-trans">${d.trans}</p>
          <p class="d-card-mean">${d.mean}</p>
          <div class="d-card-footer">
             <button class="icon-btn-sm" onclick="copyText(\`${d.mean.replace(/'/g, "\\'")}\`)"><i data-lucide="copy"></i></button>
             <button class="icon-btn-sm"><i data-lucide="share-2"></i></button>
          </div>
        </div>
      `).join('');
      if (window.lucide) lucide.createIcons();
    }

  } catch (e) {
    console.error('initDuaPage error:', e);
  }
}

/* ===============================
   MODULE INITIALIZATIONS
================================ */
function initLibraryPage() {
  console.log("Library Page Initialized");
}

function initKitabPage() {
  console.log("Kitab Page Initialized");
}

function initCommunityPage() {
  console.log("Community Page Initialized");
}

function initHomePage() {
  try {
    console.log("Initializing Home Page...");

    // 1. Hijri & Gregorian Dates
    const hijriEl = document.getElementById('date-hijri');
    const gregEl = document.getElementById('date-gregorian');
    if (hijriEl && gregEl) {
      const today = new Date();
      gregEl.textContent = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      // Basic Hijri Calculation (Placeholder/Simple Logic)
      try {
        const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-uma-nu-latn', {
          day: 'numeric', month: 'long', year: 'numeric'
        }).format(today);
        hijriEl.textContent = hijri;
      } catch (e) {
        hijriEl.textContent = "Hijri Date Unavailable";
      }
    }

    // 2. Feature Grid Clicks
    document.querySelectorAll('.g-item').forEach(item => {
      item.onclick = () => {
        const page = item.dataset.page;
        if (page) loadPage(page);
      };
    });

    // 3. Prayer Tracker Initialization
    if (typeof renderTracker === 'function') renderTracker();

    // 4. Fetch Prayer Times
    const coords = SettingsManager.get('userCoordinates');
    if (coords) {
      fetchAdvPrayerTimes(coords.lat, coords.lon);
    } else {
      detectHomeLocation();
    }

  } catch (e) {
    console.error('initHomePage error:', e);
  }
}

async function detectHomeLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      SettingsManager.set('userCoordinates', { lat: latitude, lon: longitude });
      fetchAdvPrayerTimes(latitude, longitude);
    },
    (err) => console.warn("Location access denied", err)
  );
}

/* ===============================
   HIJRI CALENDAR MODULE
================================ */
let currentCalDate = new Date();

function initHijriPage() {
  renderHijriCalendar(currentCalDate);

  document.getElementById('cal-prev').onclick = () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderHijriCalendar(currentCalDate);
  };

  document.getElementById('cal-next').onclick = () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderHijriCalendar(currentCalDate);
  };

  document.getElementById('h-cal-today').onclick = () => {
    currentCalDate = new Date();
    renderHijriCalendar(currentCalDate);
  };
}

function renderHijriCalendar(date) {
  const grid = document.getElementById('cal-grid');
  const monthName = document.getElementById('cal-month-name');
  if (!grid || !monthName) return;

  const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-uma-nu-latn', {
    month: 'long', year: 'numeric'
  });
  monthName.textContent = hijriFormatter.format(date);

  grid.innerHTML = '';
  // Basic grid logic: Get start of month, fill gaps, etc.
  // Simplified for this phase: Show 30 days
  for (let i = 1; i <= 30; i++) {
    const day = document.createElement('div');
    day.className = 'cal-day';
    day.innerHTML = `<span class="h-day-num">${i}</span>`;
    grid.appendChild(day);
  }
}

/* ===============================
   QIBLA FINDER MODULE
================================ */
function initQiblaPage() {
  const angleEl = document.getElementById('q-angle');
  const distanceEl = document.getElementById('q-distance');
  const compass = document.getElementById('q-compass');
  const initBtn = document.getElementById('q-init-btn');

  if (!initBtn) return;

  initBtn.onclick = () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(response => {
        if (response === 'granted') startCompass();
      });
    } else {
      startCompass();
    }
    initBtn.style.display = 'none';
  };

  function startCompass() {
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    // Calc Qibla
    const coords = SettingsManager.get('userCoordinates');
    if (coords) {
      const qiblaAngle = calculateQibla(coords.lat, coords.lon);
      if (angleEl) angleEl.textContent = qiblaAngle.toFixed(1) + '°';
      const distance = calculateDistance(coords.lat, coords.lon, 21.4225, 39.8262);
      if (distanceEl) distanceEl.textContent = Math.round(distance).toLocaleString() + ' km';
    }
  }

  function handleOrientation(e) {
    const compassHeading = e.webkitCompassHeading || e.alpha;
    if (compassHeading && compass) {
      compass.style.transform = `rotate(${-compassHeading}deg)`;
    }
  }
}

function calculateQibla(lat, lon) {
  const phiK = 21.4225 * Math.PI / 180.0;
  const lambdaK = 39.8262 * Math.PI / 180.0;
  const phi = lat * Math.PI / 180.0;
  const lambda = lon * Math.PI / 180.0;
  const psi = Math.atan2(Math.sin(lambdaK - lambda), Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda));
  return psi * 180.0 / Math.PI;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ===============================
   ZAKAT CALCULATOR MODULE
================================ */
function initZakatPage() {
  const inputs = document.querySelectorAll('.z-input-group input');
  const calcBtn = document.getElementById('z-calc-btn');
  const totalEl = document.getElementById('z-total-due');

  if (calcBtn) {
    calcBtn.onclick = () => {
      let assets = 0;
      assets += parseFloat(document.getElementById('z-cash').value || 0);
      assets += parseFloat(document.getElementById('z-owed').value || 0);
      assets += parseFloat(document.getElementById('z-gold').value || 0);
      assets += parseFloat(document.getElementById('z-silver').value || 0);

      let liabilities = 0;
      liabilities += parseFloat(document.getElementById('z-debts').value || 0);
      liabilities += parseFloat(document.getElementById('z-expenses').value || 0);

      const net = assets - liabilities;
      const zakat = net > 0 ? net * 0.025 : 0;
      if (totalEl) totalEl.textContent = '$ ' + zakat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
  }
}

/* ===============================
   OTHER UTILITIES
================================ */
function initDonatePage() { console.log("Donate Page Init"); }
function initMosquePage() {
  const btn = document.getElementById('m-map-btn');
  if (btn) {
    btn.onclick = () => {
      const coords = SettingsManager.get('userCoordinates');
      const url = coords ? `https://www.google.com/maps/search/masjid/@${coords.lat},${coords.lon},14z` : `https://www.google.com/maps/search/masjid`;
      window.open(url, '_blank');
    };
  }
}
