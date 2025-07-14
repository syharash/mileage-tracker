let tracking = false;
let tripStart = null;
let tripEnd = null;
let tripLog = [];
let map, directionsService, directionsRenderer;
let pauseStartTime = null, totalPauseDuration = 0;
let gpsPoller = null;
const fallbackInterval = 60000; // 60 sec
const motionThreshold = 0.1; // miles

const apiKey = "AIzaSyAInvy6GdRdnuYVJGlde1gX0VINpU5AsJI"; // Replace with your actual key

// Initialize Map + Directions
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

// Start Trip
function startTracking() {
  initMapServices();
  navigator.geolocation.getCurrentPosition(pos => {
    tripStart = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now()
    };
    tracking = true;
    totalPauseDuration = 0;
    updateStatus("Tracking");
    showToast("🚀 Trip started!");
  }, () => showToast("⚠️ Unable to access GPS", "error"));
}

function pauseTracking() {
  tracking = false;
  pauseStartTime = Date.now();
  updateStatus("Paused");
  showToast("⏸️ Trip paused");
  startMotionMonitor();
}

function resumeTracking() {
  tracking = true;
  clearInterval(gpsPoller);
  if (pauseStartTime) {
    totalPauseDuration += Date.now() - pauseStartTime;
    pauseStartTime = null;
  }
  updateStatus("Tracking");
  showToast("▶️ Trip resumed");
}

function endTracking() {
  clearInterval(gpsPoller);
  if (!tracking || !tripStart) {
    showToast("❌ Trip not started or currently paused", "error");
    return;
    updateStatus("Trip Complete");
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

      localStorage.setItem("lastRoute", JSON.stringify(result));

      const distanceMi = (leg.distance.value / 1609.34).toFixed(2);
      const durationMin = Math.round(leg.duration.value / 60);
      const pausedMin = Math.round(totalPauseDuration / 60000);
      const startAddress = leg.start_address;
      const endAddress = leg.end_address;
      const purpose = document.getElementById("trip-purpose").value || "–";
      const notes = document.getElementById("trip-notes").value || "–";

      document.getElementById("summary-purpose").textContent = purpose;
      document.getElementById("summary-notes").textContent = notes;
      document.getElementById("summary-start").textContent = startAddress;
      document.getElementById("summary-end").textContent = endAddress;
      document.getElementById("summary-distance").textContent = `${distanceMi} mi`;
      document.getElementById("summary-duration").textContent = `${durationMin} min`;
      if (document.getElementById("pause-summary")) {
        document.getElementById("pause-summary").textContent = `${pausedMin} min`;
      }

      directionsRenderer.setDirections(result);
      renderSteps(leg.steps);

      logTrip(purpose, notes, distanceMi, durationMin, pausedMin);
      showToast(`✅ Trip complete: ${distanceMi} mi`);
    } catch (err) {
      console.error(err);
      const cached = localStorage.getItem("lastRoute");
      if (cached) {
        const result = JSON.parse(cached);
        const leg = result.routes[0].legs[0];
        showToast("⚠️ Offline: showing last saved route");
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

// Render turn-by-turn steps
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
    const div = document.createElement("div");
    const icon = iconMap[step.maneuver] || "➡️";
    div.innerHTML = `${icon} ${step.html_instructions}`;
    panel.appendChild(div);
  });
}

// Route fetch
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

// Trip logger
function logTrip(purpose, notes, distance, duration, paused) {
  const rate = parseFloat(document.getElementById("rate").value);
  const reimbursement = (distance * rate).toFixed(2);
  const entry = {
    date: new Date().toLocaleString(),
    purpose,
    notes,
    miles: distance,
    duration: `${duration} min`,
    paused: `${paused} min`,
    reimbursement: `$${reimbursement}`
  };
  tripLog.push(entry);

  const li = document.createElement("li");
  li.textContent = `${entry.date} | ${entry.purpose} | ${entry.miles} mi | ${entry.reimbursement}`;
  document.getElementById("trip-log").appendChild(li);
  updateSummary();
}

// Trip Summary
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

// CSV Export
function downloadCSV() {
  if (!tripLog.length) {
    showToast("📂 No trips to export");
    return;
  }
  let csv = "Date,Purpose,Notes,Miles,Duration,Paused,Reimbursement\n";
  tripLog.forEach(t => {
    csv += `${t.date},${t.purpose},${t.notes},${t.miles},${t.duration},${t.paused},${t.reimbursement}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mileage_log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Reset
function clearHistory() {
  tripLog = [];
  document.getElementById("trip-log").innerHTML = "";
  updateSummary();
  showToast("🧹 Trip history cleared");
}

// Help screen toggle
function toggleHelp() {
  const h = document.getElementById("help-screen");
  h.style.display = h.style.display === "none" ? "block" : "none";
}

// Toast messages
function showToast(msg, type = "default") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show";
  t.style.backgroundColor = type === "error" ? "#B00020" : "#222";
  setTimeout(() => t.className = "", 3000);
}

// Status Indicator
function updateStatus(state) {
  const el = document.getElementById("tracking-status");
  el.textContent = state;

  if (state === "Tracking") {
    document.body.classList.remove("paused");
    document.body.classList.remove("ended");
  } else if (state === "Paused") {
    document.body.classList.add("paused");
    document.body.classList.remove("ended");
 // } else if (state === "Ended" || state === "Trip Complete") {
 // document.body.classList.remove("paused");
 //   document.body.classList.add("ended");
  } else {
    document.body.classList.remove("paused");
    document.body.classList.remove("ended");
  }
}

// GPS fallback detector
 function startMotionMonitor() {
  gpsPoller = setInterval() =>};

window.onload = function () {
  // Initialize the map
  initMapServices();

  // Attach button event handlers explicitly
  document.querySelector("button[onclick='startTracking()']").onclick = startTracking;
  document.querySelector("button[onclick='pauseTracking()']").onclick = pauseTracking;
  document.querySelector("button[onclick='resumeTracking()']").onclick = resumeTracking;
  document.querySelector("button[onclick='endTracking()']").onclick = endTracking;
  document.querySelector("button[onclick='downloadCSV()']").onclick = downloadCSV;
  document.querySelector("button[onclick='clearHistory()']").onclick = clearHistory;
  document.querySelector("button[onclick='toggleHelp()']").onclick = toggleHelp;

  // Make sure toast element is accessible
  if (!document.getElementById("toast")) {
    console.warn("🚨 Toast element not found in DOM.");
  }

  // Update initial UI status
  updateStatus("Idle");

  // Optional: clear previous map directions
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
    document.getElementById("directions-panel").innerHTML = "";
    document.getElementById("trip-purpose").value = "";
    document.getElementById("trip-notes").value = "";
  }
};
