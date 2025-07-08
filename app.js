let tracking = false;
let tripStart = null;
let tripEnd = null;
let tripLog = [];

const apiKey = "YOUR_API_KEY"; // Replace with your actual Google Maps key

function startTracking() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      tripStart = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        timestamp: Date.now(),
      };
      tracking = true;
      showToast("🚀 Trip started!", "default");
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

  navigator.geolocation.getCurrentPosition(async (pos) => {
    tripEnd = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now(),
    };

    try {
      const distance = await getDrivingDistance(tripStart, tripEnd);
      const route = await fetchRouteData(tripStart, tripEnd);
      const leg = route.routes[0].legs[0];
      const duration = Math.round(leg.duration.value / 60);
      const startAddress = leg.start_address;
      const endAddress = leg.end_address;

      document.getElementById("summary-start").textContent = startAddress;
      document.getElementById("summary-end").textContent = endAddress;
      document.getElementById("summary-distance").textContent = `${distance.toFixed(2)} mi`;
      document.getElementById("summary-duration").textContent = `${duration} min`;

      showToast(`✅ Trip complete: ${distance.toFixed(2)} mi to ${endAddress}`, "default");
      document.getElementById("trip-summary").scrollIntoView({ behavior: "smooth" });

      logTrip(distance, duration);
    } catch (err) {
      console.error("Trip error:", err);
      showToast("❌ " + err.message, "error");
    }

    tracking = false;
    tripStart = null;
    tripEnd = null;
  });
}

function logTrip(distance, duration) {
  const rate = parseFloat(document.getElementById("rate").value);
  const amount = distance * rate;

  const tripEntry = {
    date: new Date().toLocaleString(),
    miles: distance.toFixed(2),
    reimbursement: `$${amount.toFixed(2)}`,
    duration: `${duration} min`,
  };

  tripLog.push(tripEntry);

  const li = document.createElement("li");
  li.textContent = `${tripEntry.date}: ${tripEntry.miles} mi, ${tripEntry.reimbursement}`;
  document.getElementById("trip-log").appendChild(li);

  updateSummary();
}

function updateSummary() {
  let todayMiles = 0, weekMiles = 0;
  const today = new Date().toDateString();
  const weekAgo = new Date(Date.now() - 604800000);

  for (let trip of tripLog) {
    const tripDate = new Date(trip.date);
    const miles = parseFloat(trip.miles);

    if (tripDate.toDateString() === today) todayMiles += miles;
    if (tripDate >= weekAgo) weekMiles += miles;
  }

  const rate = parseFloat(document.getElementById("rate").value);
  document.getElementById("today-summary").textContent =
    `${todayMiles.toFixed(2)} mi | $${(todayMiles * rate).toFixed(2)}`;
  document.getElementById("week-summary").textContent =
    `${weekMiles.toFixed(2)} mi | $${(weekMiles * rate).toFixed(2)}`;
}

function clearHistory() {
  tripLog = [];
  document.getElementById("trip-log").innerHTML = "";
  updateSummary();
  showToast("🧹 Trip history cleared", "default");
}

function downloadCSV() {
  if (tripLog.length === 0) {
    showToast("📂 No trips to export", "default");
    return;
  }

  let csv = "Date,Miles,Reimbursement,Duration\n";
  tripLog.forEach(trip => {
    csv += `${trip.date},${trip.miles},${trip.reimbursement},${trip.duration}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mileage_log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function toggleHelp() {
  const help = document.getElementById("help-screen");
  help.style.display = help.style.display === "none" ? "block" : "none";
}

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";

  // Optional style tweak by type
  toast.style.backgroundColor = type === "error" ? "#B00020" : "#222";
  toast.style.color = "#fff";

  setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
}

async function getDrivingDistance(start, end) {
  if (!start || !end || !start.latitude || !start.longitude || !end.latitude || !end.longitude) {
    throw new Error("Missing or invalid GPS coordinates.");
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&mode=driving&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Network error");

  const data = await response.json();
  if (data.status !== "OK") throw new Error("Directions API error: " + data.status);

  return data.routes[0].legs[0].distance.value / 1609.34; // meters → miles
}

async function fetchRouteData(start, end) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&mode=driving&key=${apiKey}`;
  const response = await fetch(url);
  return await response.json();
}
