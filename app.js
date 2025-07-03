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

async function endTracking() {
  if (!startCoords) {
    alert("Please tap Start Trip first.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    endCoords = pos.coords;

    try {
      const distance = await getDrivingDistance(startCoords, endCoords);
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
    } catch (err) {
      alert("❌ Error getting driving distance: " + err.message);
    }
  }, err => {
    alert("❌ Failed to get end location: " + err.message);
  }, { enableHighAccuracy: true });
}

async function getDrivingDistance(start, end) {
  const apiKey = "AIzaSyCbJgUNmcagzbSGb6QB3vWGvtbq3sUuPns"; // 🔁 Replace with your actual key
  const origin = `${start.latitude},${start.longitude}`;
  const destination = `${end.latitude},${end.longitude}`;
  const endpoint = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;

  const response = await fetch(endpoint);
  const data = await response.json();

  if (data.status === "OK") {
    const meters = data.routes[0].legs[0].distance.value;
    return meters / 1609.34; // meters to miles
  } else {
    throw new Error(data.error_message || data.status);
  }
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

function toRad(deg) {
  return deg * (Math.PI / 180);
}
