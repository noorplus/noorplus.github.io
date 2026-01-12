
let prefs = JSON.parse(localStorage.getItem("noorPreferences")) || {};

function goToStep(n) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById("step-" + n).classList.add("active");
}

document.getElementById("refreshLocation").onclick = requestLocation;
requestLocation();

function requestLocation() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;

    const geo = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    ).then(r => r.json());

    document.getElementById("locationText").textContent =
      `${geo.city || geo.locality}, ${geo.countryName}`;

    document.getElementById("timezoneText").textContent =
      `Time Zone: ${geo.timezone}`;

    const prayer = await fetch(
      `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}`
    ).then(r => r.json());

    let method = prayer.data.meta.method;
    let asr = method.id === 1 ? 1 : prayer.data.meta.school;

    document.getElementById("calcMethod").textContent = method.name;
    document.getElementById("asrMethod").textContent = asr === 1 ? "Hanafi" : "Shafi";

    prefs.location = { latitude, longitude, city: geo.city, country: geo.countryName };
    prefs.prayer = { method: method.id, asr };
    localStorage.setItem("noorPreferences", JSON.stringify(prefs));
  });
}

function setLanguage(l) {
  prefs.language = l;
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}

function setHijri(h) {
  prefs.hijriOffset = h;
  localStorage.setItem("noorPreferences", JSON.stringify(prefs));
}

function finish() {
  localStorage.setItem("onboardingCompleted", "true");
  location.replace("../index.html");
}
