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
      alert("❌ Failed to get location: " + err.message);
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
    },
    err => {
      alert("❌ Failed to get end location: " + err.message);
    },
    { enableHighAccuracy: true }
  );
}