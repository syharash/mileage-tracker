let startCoords = null;
let endCoords = null;
let trips = [];

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
      updateLog();

      // Reset
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
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
    // Parse readable log like: "7/17/2025, 2:45 PM — 📍 Distance: 2.45 miles 💵 Reimbursement: $1.23"
    const [datetime, result] = log.split("—");
    const milesMatch = result.match(/Distance: ([\d.]+) miles/);
    const reimbMatch = result.match(/Reimbursement: \$([\d.]+)/);

    const miles = milesMatch ? milesMatch[1] : "";
    const reimb = reimbMatch ? reimbMatch[1] : "";

    return `"${datetime.trim()}","${miles}","${reimb}"`;
  });

  const csvContent = csvHeader + csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `mileage-log-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}