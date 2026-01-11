const prefs = JSON.parse(localStorage.getItem("noorPreferences"));
const list = document.getElementById("prayer-times");

if (!prefs?.location) {
  list.innerHTML = "<li>Location not set</li>";
} else {
  const { lat, lon } = prefs.location;

  const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${prefs.prayerMethod}&school=${prefs.asrMethod}&adjustment=${prefs.hijriOffset}`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const t = data.data.timings;
      list.innerHTML = `
        <li>Fajr: ${t.Fajr}</li>
        <li>Dhuhr: ${t.Dhuhr}</li>
        <li>Asr: ${t.Asr}</li>
        <li>Maghrib: ${t.Maghrib}</li>
        <li>Isha: ${t.Isha}</li>
      `;
    });
}
