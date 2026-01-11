let step = 1;

let prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {
  language: "en",
  hijriOffset: 0,
  location: null,
  prayerMethod: null,
  asrMethod: null
};

function nextStep() {
  document.querySelector(`[data-step="${step}"]`).classList.remove("active");
  step++;
  document.querySelector(`[data-step="${step}"]`).classList.add("active");
}

/* STEP 1: LOCATION + API DEFAULTS */
function detectLocation() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Layer 2: Human-readable location
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const geo = await geoRes.json();

    prefs.location = {
      lat,
      lon,
      city: geo.city || geo.locality || "Unknown",
      country: geo.countryName || "Unknown",
      timezone: geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    document.getElementById("location-text").innerText =
      `${prefs.location.city}, ${prefs.location.country}`;

    document.getElementById("location-box").classList.remove("hidden");

    // Fetch prayer metadata (method + asr) from API
    loadPrayerDefaults(lat, lon);
  }, () => {
    alert("Location permission is required to continue.");
  });
}

/* FETCH DEFAULTS FROM PRAYER API */
async function loadPrayerDefaults(lat, lon) {
  const res = await fetch(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}`
  );
  const data = await res.json();

  const meta = data.data.meta;

  prefs.prayerMethod = meta.method.id;
  prefs.asrMethod = meta.school;

  populateMethodSelect(meta.method.id);
  document.getElementById("asr-select").value = meta.school;

  document.getElementById("next-btn").classList.remove("hidden");
}

/* POPULATE CALCULATION METHODS */
function populateMethodSelect(selectedId) {
  const methods = {
    0: "Shia Ithna-Ashari",
    1: "University of Islamic Sciences, Karachi",
    2: "Islamic Society of North America",
    3: "Muslim World League",
    4: "Umm Al-Qura University, Makkah",
    5: "Egyptian General Authority of Survey",
    7: "Institute of Geophysics, University of Tehran",
    8: "Gulf Region",
    9: "Kuwait",
    10: "Qatar",
    11: "Majlis Ugama Islam Singapura",
    12: "Union Organization Islamic de France"
  };

  const select = document.getElementById("method-select");
  select.innerHTML = "";

  Object.entries(methods).forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    if (Number(id) === selectedId) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = () => {
    prefs.prayerMethod = Number(select.value);
    savePrefs();
  };

  document.getElementById("asr-select").onchange = e => {
    prefs.asrMethod = Number(e.target.value);
    savePrefs();
  };

  savePrefs();
}

function savePrefs() {
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}

/* STEP 2 */
function setLanguage(lang) {
  prefs.language = lang;
  savePrefs();
}

/* STEP 3 */
function setHijri(val) {
  prefs.hijriOffset = val;
  savePrefs();
}

function finish() {
  savePrefs();
  localStorage.setItem("onboardingCompleted", "true");
  location.reload();
}
