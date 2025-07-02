let startCoords = null;
let endCoords = null;
let trips = [];

// Start Trip
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

// End Trip & Calculate Distance/Cost
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

      // Reset for next trip
      startCoords = null;
      endCoords = null;
    },
    err => {
      alert("❌ Failed to get end location: " + err.message);
    },
    { enableHighAccuracy: true }
  );
}

// Display Trip Log
function updateLog() {
  const list = document.getElementById("trip-log");
  list.innerHTML = "";
  trips.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    list.appendChild(li);
  });
}

// Calculate Distance Between 2 GPS Coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
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

// Download trip log as CSV
function downloadCSV() {
  if (trips.length === 0) {
    alert("No trips to export.");
    return;
  }

  const csvHeader = "Date,Distance (miles),Reimbursement ($)\n";
  const csvRows = trips.map(log => {
    const [datetime, result] = log.split("—");
    const milesMatch = result.match(/Distance: ([\d.]+)/);
    const reimbMatch = result.match(/Reimbursement: \$([\d.]+)/);

    const miles = milesMatch ? milesMatch[1] : "";
    const reimb = reimbMatch ? reimbMatch[1] : "";

    return `"${datetime.trim()}","${miles}","${reimb}"`;
  });

  const csvContent = csvHeader + csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

 // Attach anchor to DOM before clicking
  const link = document.createElement("a");
  link.href = url;
  link.download = `mileage-log-${Date.now()}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
