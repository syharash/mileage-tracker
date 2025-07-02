let startCoords = null;
let endCoords = null;
let trips = [];

window.onload = function () {
  const savedTrips = localStorage.getItem("tripLog");
  if (savedTrips) {
    trips = JSON.parse(savedTrips);
    updateLog();
  }
};

function saveTrips() {
  localStorage.setItem("tripLog", JSON.stringify(trips));
}

function startTracking() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      startCoords = pos.coords;
      alert("✅ Start location recorded!");
    },
    err => {
      alert("❌ Failed to get start location: " + err.message);
    },
    { enableHighAccuracy: true }
  );
}

function endTracking() {
  if (!startCoords) {
    alert("Please tap Start Trip first.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      endCoords = pos.coords;

      const distance = calculateDistance(
        startCoords.latitude,
        startCoords.longitude,
        endCoords.latitude,
        endCoords.longitude
      );

      const rate = parseFloat(document.getElementById("rate").value);
      const cost = (distance * rate).toFixed(2);

      const result = `📍 Distance: ${distance.toFixed(2)} miles  
💵 Reimbursement: $${cost}`;
      document.getElementById("results").innerText = result;

      const log = `${new Date().toLocaleString()} — ${result}`;
      trips.push(log);
      saveTrips();
      updateLog();

      startCoords = null;
      endCoords = null;
    },
    err => {
      alert("❌ Failed to get end location: " + err.message);
    },
    { enableHighAccuracy: true }
  );
}

function updateLog() {
  const list = document.getElementById("trip-log");
  list.innerHTML = "";
  trips.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    list.appendChild(li);
  });
  updateSummary();
}

function updateSummary() {
  let todayDistance = 0, todayReimb = 0;
  let weekDistance = 0, weekReimb = 0;

  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 6);

  trips.forEach(log => {
    const [timestamp, result] = log.split("—");
    const date = new Date(timestamp.trim());

    const miles = parseFloat((result.match(/Distance: ([\d.]+)/) || [])[1] || 0);
    const reimb = parseFloat((result.match(/Reimbursement: \$([\d.]+)/) || [])[1] || 0);

    if (date.toLocaleDateString() === todayStr) {
      todayDistance += miles;
      todayReimb += reimb;
    }

    if (date >= oneWeekAgo && date <= now) {
      weekDistance += miles;
      weekReimb += reimb;
    }
  });

  document.getElementById("today-summary").innerText =
    `${todayDistance.toFixed(2)} mi | $${todayReimb.toFixed(2)}`;
  document.getElementById("week-summary").innerText =
    `${weekDistance.toFixed(2)} mi | $${weekReimb.toFixed(2)}`;
}

function clearHistory() {
  if (confirm("Clear all stored trip history?")) {
    trips = [];
    localStorage.removeItem("tripLog");
    updateLog();
    document.getElementById("results").innerText = "";
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function downloadCSV() {
  if (trips.length === 0) {
    alert("No trips to export.");
    return;
  }

  const csvHeader = "Date,Distance (miles),Reimbursement ($)\n";
  const csvRows = trips.map(log => {
    const [datetime, result] = log.split("—");
    const miles = (result.match(/Distance: ([\d.]+)/) || [])[1] || "";
    const reimb = (result.match(/Reimbursement: \$([\d.]+)/) || [])[1] || "";
    return `"${datetime.trim()}","${miles}","${reimb}"`;
  });

  const blob = new Blob([csvHeader + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `mileage-log-${Date.now()}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
