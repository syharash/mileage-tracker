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