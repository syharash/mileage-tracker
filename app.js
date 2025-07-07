let startCoords = null;
let tripSegments = [];
let trips = [];
let currentUser = null;

window.onload = function () {
  const savedTrips = localStorage.getItem("tripLog");
  if (savedTrips) {
    trips = JSON.parse(savedTrips);
    updateLog();
  }

  google.accounts.id.initialize({
    client_id: "YOUR_GOOGLE_CLIENT_ID",
    callback: handleCredentialResponse
  });

  google.accounts.id.renderButton(
    document.getElementById("signin-container"),
    { theme: "outline", size: "large" }
  );
};

function handleCredentialResponse(response) {
  const token = response.credential;
  const decoded = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  currentUser = decoded;
  document.getElementById("welcome-msg").innerText =
    `Welcome, ${currentUser.name || currentUser.email}`;
}

function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  toast.innerText = message;

  toast.className = "";
  toast.classList.add("toast-" + type, "show");

  // Vibration feedback (mobile only)
  navigator.vibrate?.(100);

  // Play contextual sound
  const audio = document.getElementById("sound-" + type) || document.getElementById("sound-default");
  audio?.play();

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function saveTrips() {
  localStorage.setItem("tripLog", JSON.stringify(trips));
}

function startTracking() {
  tripSegments = [];
  startCoords = null;
  navigator.geolocation.getCurrentPosition(
    pos => {
      startCoords = pos.coords;
      showToast("🚀 Trip started", "resume");
    },
    err => alert("Failed to get location: " + err.message),
    { enableHighAccuracy: true }
  );
}

function pauseTracking() {
  if (!startCoords) {
    alert("No active trip to pause.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      tripSegments.push({ start: startCoords, end: pos.coords });
      startCoords = null;
      showToast("⏸️ Trip paused", "pause");
    },
    err => alert("Pause failed: " + err.message),
    { enableHighAccuracy: true }
  );
}

function resumeTracking() {
  if (startCoords) {
    alert("Trip already running.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      startCoords = pos.coords;
      showToast("▶️ Trip resumed", "resume");
    },
    err => alert("Resume failed: " + err.message),
    { enableHighAccuracy: true }
  );
}

async function endTracking() {
  if (!startCoords) {
    alert("Resume trip before ending.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    tripSegments.push({ start: startCoords, end: pos.coords });
    startCoords = null;

    try {
      let totalDistance = 0;
      for (const seg of tripSegments) {
        totalDistance += await getDrivingDistance(seg.start, seg.end);
      }

      const rate = parseFloat(document.getElementById("rate").value);
      const cost = (totalDistance * rate).toFixed(2);

      const result = `📍 Distance: ${totalDistance.toFixed(2)} miles\n💵 Reimbursement: $${cost}`;
      document.getElementById("results").innerText = result;

      const log = `${new Date().toLocaleString()} — ${result}`;
      trips.push(log);
      saveTrips();
      updateLog();
      showToast("🛑 Trip ended", "default");
    } catch (err) {
      alert("Error calculating distance: " + err.message);
    }
  });
}

async function getDrivingDistance(start, end) {
  const apiKey = "YOUR_GOOGLE_MAPS_API_KEY";
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === "OK") {
    return data.routes[0].legs[0].distance.value / 1609.34;
  } else {
    throw new Error(data.status);
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
  let todayDistance = 0, todayReimb = 0, weekDistance = 0, weekReimb = 0;

  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 6);

  trips.forEach(log => {
    const [ts, result] = log.split("—");
    const date = new Date(ts.trim());
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
  if (confirm("Clear trip history?")) {
    trips = [];
    localStorage.removeItem("tripLog");
    updateLog();
    document.getElementById("results").innerText = "";
    showToast("🗑️ History cleared", "default");
  }
}

function downloadCSV() {
  if (trips.length === 0) {
    alert("No trips logged.");
    return;
  }

  const employee = currentUser?.name || "Unknown Employee";
  const csvHeader = `Employee: ${employee}\nDate,Distance (miles),Reimbursement ($)\n`;

  const csvRows = trips.map(log => {
    const [dt, result] = log.split("—");
    const miles = (result.match(/Distance: ([\d.]+)/) || [])[1] || "";
    const reimb = (result.match(/Reimbursement: \$([\d.]+)/) || [])[1] || "";
    return `"${dt.trim()}","${miles}","${reimb}"`;
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
