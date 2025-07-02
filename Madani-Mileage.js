let startCoords = null;
let endCoords = null;
let trips = [];

function startTracking() {
  navigator.geolocation.getCurrentPosition(pos => {
    startCoords = pos.coords;
    alert("Start location recorded.");
  });
}

function endTracking() {
  if (!startCoords) return alert("Start trip first.");

  navigator.geolocation.getCurrentPosition(pos => {
    endCoords = pos.coords;
    const distance = calculateDistance(
      startCoords.latitude,
      startCoords.longitude,
      endCoords.latitude,
      endCoords.longitude
    );

    const rate = parseFloat(document.getElementById("rate").value);
    const cost = (distance * rate).toFixed(2);

    const result = `Distance: ${distance.toFixed(2)} miles | Reimbursement: $${cost}`;
    document.getElementById("results").innerText = result;

    const log = `${new Date().toLocaleString()} — ${result}`;
    trips.push(log);
    updateLog();
  });
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