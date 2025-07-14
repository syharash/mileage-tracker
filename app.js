let tracking = false;
let tripStart = null;
let tripEnd = null;
let tripLog = [];
let map, directionsService, directionsRenderer;
let pauseStartTime = null, totalPauseDuration = 0;
let gpsPoller = null;
const fallbackInterval = 60000;
const motionThreshold = 0.1;
const apiKey = "AIzaSyAInvy6GdRdnuYVJGlde1gX0VINpU5AsJI";

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
    updateControls();
  }, () => showToast("⚠️ Unable to access GPS", "error"));
}

function pauseTracking() {
  tracking = false;
  pauseStartTime = Date.now();

  updateStatus("Paused");
  showToast("⏸️ Trip paused");

  // Adjust control states
  document.getElementById("pause-btn").disabled = true;
  document.getElementById("resume-btn").disabled = false;
  document.getElementById("start-btn").disabled = true;
  document.getElementById("end-btn").disabled = true;

  startMotionMonitor(); // Optional: to auto-resume on movement
  updateControls();
}


function resumeTracking() {
  tracking = true;
  clearInterval(gpsPoller); // Resume GPS polling

  if (pauseStartTime) {
    totalPauseDuration += Date.now() - pauseStartTime;
    pauseStartTime = null;
  }

  updateStatus("Tracking");
  showToast("▶️ Trip resumed");

  // Restore tracking controls
  document.getElementById("pause-btn").disabled = false;
  document.getElementById("resume-btn").disabled = true;
  document.getElementById("start-btn").disabled = true;
  document.getElementById("end-btn").disabled = false;

  updateControls();
}


function endTracking() {
  clearInterval(gpsPoller);

  if (!tracking || !tripStart) {
    updateStatus("Idle");
    showToast("❌ Trip not started or currently paused", "error");

    // Reset controls to safe defaults
    document.getElementById("start-btn").disabled = false;
    document.getElementById("pause-btn").disabled = true;
    document.getElementById("resume-btn").disabled = true;
    document.getElementById("end-btn").disabled = true;
    updateControls();
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

      const distanceMi = (leg.distance.value / 1609.34).toFixed(2);
      const durationMin = Math.round(leg.duration.value / 60);
      const pausedMin = Math.round(totalPauseDuration / 60000);
      const startAddress = leg.start_address;
      const endAddress = leg.end_address;
      const purpose = document.getElementById("trip-purpose").value || "–";
      const notes = document.getElementById("trip-notes").value || "–";

      // Log and store data
      tripLog.push({
        startAddress,
        endAddress,
        distanceMi,
        durationMin,
        pausedMin,
        purpose,
        notes,
        timestamp: Date.now()
      });

      localStorage.setItem("lastRoute", JSON.stringify(result));

      showToast(`🛑 Trip ended. Distance: ${distanceMi} mi, Duration: ${durationMin} min`);

    } catch (err) {
      console.error("Failed to fetch route:", err);
      showToast("🚫 Could not finalize route", "error");
    }

    updateStatus("Idle");

    // Reset control states
    document.getElementById("start-btn").disabled = false;
    document.getElementById("pause-btn").disabled = true;
    document.getElementById("resume-btn").disabled = true;
    document.getElementById("end-btn").disabled = true;

    updateControls();
  }, () => {
    showToast("⚠️ GPS access failed", "error");
    updateStatus("Idle");
  });
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
      document.getElementById("pause-summary").textContent = `${pausedMin} min`;

      directionsRenderer.setDirections(result);
      renderSteps(leg.steps);

      logTrip(purpose, notes, distanceMi, durationMin, pausedMin);
      showToast(`✅ Trip complete: ${distanceMi} mi`);
      updateStatus("Trip Complete");
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
      updateStatus("Trip Complete");
    }

    tracking = false;
    tripStart = tripEnd = null;
  });

function getRoute(start, end) {
  return new Promise((resolve, reject) => {
    directionsService.route({
      origin: { lat: start.latitude, lng: start.longitude },
      destination: { lat: end.latitude, lng: end.longitude },
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      status === "OK" ? resolve(result) : reject(new Error(status));
    });
  });
}

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
  document.getElementById("today-summary").textContent = `${today.toFixed(2)} mi | $${(today * rate).toFixed(2)}`;
  document.getElementById("week-summary").textContent = `${week.toFixed(2)} mi | $${(week * rate).toFixed(2)}`;
}

function downloadCSV() {
  if (!tripLog.length) return showToast("📂 No trips to export");
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

function clearHistory() {
  tripLog = [];
  document.getElementById("trip-log").innerHTML = "";
  updateSummary();
  showToast("🧹 Trip history cleared");
}

function toggleHelp() {
  const h = document.getElementById("help-screen");
  h.style.display = h.style.display === "none" ? "block" : "none";
}

function showToast(msg, type = "default") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show";
  t.style.backgroundColor = type === "error" ? "#B00020" : "#222";
  setTimeout(() => t.className = "", 3000);
}

function updateStatus(state) {
  const el = document.getElementById("tracking-status");
  el.textContent = state;
  document.body.classList.toggle("paused", state === "Paused");
  document.body.classList.toggle("ended", state === "Ended" || state === "Trip Complete");
}

function startMotionMonitor() {
  gpsPoller = setInterval(() => {
    // Future fallback tracking can go here
  }, fallbackInterval);
}

function updateControls() {
  const pauseTrackingBtn = document.getElementById("pauseTrackingBtn");
  const resumeTrackingBtn = document.getElementById("resumeTrackingBtn");
  const endTrackingBtn = document.getElementById("endTrackingBtn");

  const isActive = tracking && tripStart;

  pauseTrackingBtn.disabled = !isActive;
  resumeTrackingBtn.disabled = !isActive;
  endTrackingBtn.disabled = !isActive;
}

window.onload = function () {
  initMapServices();
  updateStatus("Idle");
  updateControls();

  const buttonHandlers = {
    startTrackingBtn: startTracking,
    pauseTrackingBtn: pauseTracking,
    resumeTrackingBtn: resumeTracking,
    endTrackingBtn: endTracking,
    downloadCSVBtn: downloadCSV,
    clearHistoryBtn: clearHistory,
    toggleHelpBtn: toggleHelp
  };

  for (const [id, handler] of Object.entries(buttonHandlers)) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
    else console.warn(`🔍 Missing button with ID: ${id}`);
  }

  // Optional UI reset
  document.getElementById("trip-purpose").value = "";
  document.getElementById("trip-notes").value = "";

  // Toast existence check
  if (!document.getElementById("toast")) {
    console.warn("🚨 Toast element not found.");
  }

  // Clear directions
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
    const panel = document.getElementById("directions-panel");
    if (panel) panel.innerHTML = "";
  }
};
