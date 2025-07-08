let tracking = false;
let tripStart = null;
let tripEnd = null;
let tripLog = [];
let map, directionsService, directionsRenderer;

const apiKey = "AIzaSyAInvy6GdRdnuYVJGlde1gX0VINpU5AsJI"; // replace with your key

// Initialize map+directions
function initMapServices() {
  if (map) return;
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 38.5816, lng: -121.4944 },
    zoom: 12
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    panel: document.getElementById("directions-panel")
  });
}

// Start trip
function startTracking() {
  initMapServices();
  navigator.geolocation.getCurrentPosition(
    pos => {
      tripStart = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        timestamp: Date.now()
      };
      tracking = true;
      showToast("🚀 Trip started!", "success");
    },
    () => showToast("⚠️ Unable to access GPS", "error")
  );
}

function pauseTracking() {
  tracking = false;
  showToast("⏸️ Tracking paused", "default");
}

function resumeTracking() {
  tracking = true;
  showToast("▶️ Tracking resumed", "default");
}

async function endTracking() {
  if (!tracking || !tripStart) {
    showToast("❌ Trip not started", "error");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    tripEnd = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };

    try {
      initMapServices();
      const result = await getRoute(tripStart, tripEnd);
      const leg = result.routes[0].legs[0];

      // cache for offline fallback
      localStorage.setItem("lastRoute", JSON.stringify(result));

      const distanceMi = (leg.distance.value / 1609.34).toFixed(2);
      const durationMin = Math.round(leg.duration.value / 60);
      const startAddress = leg.start_address;
      const endAddress = leg.end_address;
      const purpose = document.getElementById("trip-purpose").value || "–";
      const notes = document.getElementById("trip-notes").value || "–";

      // update summary panel
      document.getElementById("summary-purpose").textContent = purpose;
      document.getElementById("summary-notes").textContent = notes;
      document.getElementById("summary-start").textContent = startAddress;
      document.getElementById("summary-end").textContent = endAddress;
      document.getElementById("summary-distance").textContent = `${distanceMi} mi`;
      document.getElementById("summary-duration").textContent = `${durationMin} min`;

      // render on map + steps
      directionsRenderer.setDirections(result);
      renderSteps(leg.steps);

      showToast(`✅ Trip complete: ${distanceMi} mi`, "success");
      document.getElementById("trip-summary").scrollIntoView({ behavior: "smooth" });

      logTrip(purpose, notes, distanceMi, durationMin);
    } catch (err) {
      console.error(err);
      // offline fallback?
      const cached = localStorage.getItem("lastRoute");
      if (cached) {
        const result = JSON.parse(cached);
        const leg = result.routes[0].legs[0];
        showToast("⚠️ Offline: showing last saved route", "default");
        directionsRenderer.setDirections(result);
        renderSteps(leg.steps);
      } else {
        showToast("❌ " + err.message, "error");
      }
    }

    tracking = false;
    tripStart = tripEnd = null;
  });
}

// Turn-by-turn
function renderSteps(steps) {
  const panel = document.getElementById("directions-panel");
  panel.innerHTML = "";
  const iconMap = {
    "turn-left": "⬅️",
    "turn-right": "➡️",
    "merge": "🔀",
    "ramp-right": "↪️",
    "ramp-left": "↩️"
  };
  steps.forEach(step => {
    const li = document.createElement("div");
    const icon = iconMap[step.maneuver] || "➡️";
    li.innerHTML = `${icon} ${step.html_instructions}`;
    panel.appendChild(li);
  });
}

// Single route RPC
function getRoute(start, end) {
  return new Promise((resolve, reject) => {
    directionsService.route({
      origin: { lat: start.latitude, lng: start.longitude },
      destination: { lat: end.latitude, lng: end.longitude },
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === "OK") resolve(result);
      else reject(new Error(status));
    });
  });
}

// Log & CSV
function logTrip(purpose, notes, distance, duration) {
  const rate = parseFloat(document.getElementById("rate").value);
  const reimbursement = (distance * rate).toFixed(2);
  const entry = {
    date: new Date().toLocaleString(),
    purpose,
    notes,
    miles: distance,
    duration: `${duration} min`,
    reimbursement: `$${reimbursement}`
  };
  tripLog.push(entry);

  const li = document.createElement("li");
  li.textContent = `${entry.date} | ${entry.purpose} | ${entry.miles} mi | ${entry.reimbursement}`;
  document.getElementById("trip-log").appendChild(li);
  updateSummary();
}

function updateSummary() {
  let today = 0, week = 0;
  const todayDate = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  tripLog.forEach(t => {
    const d = new Date(t.date);
    const m = parseFloat(t.miles);
    if (d.toDateString() === todayDate) today += m;
    if (d.getTime() >= weekAgo) week += m;
  });
  const rate = parseFloat(document.getElementById("rate").value);
  document.getElementById("today-summary").textContent = 
    `${today.toFixed(2)} mi | $${(today * rate).toFixed(2)}`;
  document.getElementById("week-summary").textContent = 
    `${week.toFixed(2)} mi | $${(week * rate).toFixed(2)}`;
}

function downloadCSV() {
  if (!tripLog.length) {
    showToast("📂 No trips to export", "default");
    return;
  }
  let csv = "Date,Purpose,Notes,Miles,Duration,Reimbursement\n";
  tripLog.forEach(t => {
    csv += `${t.date},${t.purpose},${t.notes},${t.miles},${t.duration},${t.reimbursement}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mileage_log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  tripLog = [];
  document.getElementById("trip-log").innerHTML = "";
  updateSummary();
  showToast("🧹 Trip history cleared", "default");
}

function toggleHelp() {
  const h = document.getElementById("help-screen");
  h.style.display = h.style.display === "none" ? "block" : "none";
}

function showToast(msg, type) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show";
  t.style.backgroundColor = type === "error" ? "#B00020" : "#222";
  setTimeout(() => t.className = "", 3000);
}
