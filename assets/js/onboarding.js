let step = 1;
let prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {
  language: "en",
  hijriOffset: 0,
  location: null,
  prayerMethod: 1,
  asrMethod: 1
};

function nextStep() {
  document.querySelector(`[data-step="${step}"]`).classList.remove("active");
  step++;
  document.querySelector(`[data-step="${step}"]`).classList.add("active");
}

function detectLocation() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Layer 2: Reverse geocoding (BigDataCloud - free, no key)
    const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const geoRes = await fetch(geoUrl);
    const geo = await geoRes.json();

    prefs.location = {
      lat,
      lon,
      city: geo.city || geo.locality || "Unknown",
      country: geo.countryName || "Unknown",
      timezone: geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      source: "gps"
    };

    localStorage.setItem("noorPreferences", JSON.stringify(prefs));
    document.getElementById("location-status").innerText =
      `Detected: ${prefs.location.city}, ${prefs.location.country}`;
  }, () => {
    alert("Location permission denied. Please select manually later.");
  });
}

function setLanguage(lang) {
  prefs.language = lang;
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}

function setHijri(val) {
  prefs.hijriOffset = val;
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}

function finish() {
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
  localStorage.setItem("onboardingCompleted", "true");
  location.reload();
}
