let tripStart = null;
let tripEnd = null;
let tripLog = [];

const apiKey = "AIzaSyCbJgUNmcagzbSGb6QB3vWGvtbq3sUuPns"; // Replace with your actual Google API key

// Helper function to show notifications
function showToast(message, type = "default") {
  // Simple alert for demo; replace with custom toast UI if desired
  alert(message);
}

// Start tracking: get initial position
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
    () => showToast("⚠ Unable to access GPS", "default")
  );
}

// Pause tracking
function pauseTracking() {
  tracking = false;
  showToast("⏸ Tracking paused", "default");
}

// Resume tracking
function resumeTracking() {
  tracking = true;
  showToast("▶ Tracking resumed", "default");
}

// End trip, calculate distance, fetch route info, and log
async function endTracking() {
  if (!tracking || !tripStart) {
    showToast("❌ Trip not started", "default");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    tripEnd = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: Date.now(),
    };

    try {
      // Calculate driving distance in miles
      const distance = await getDrivingDistance(tripStart, tripEnd);
      // Fetch route details from Google Directions API
      const route = await fetchRouteData(tripStart, tripEnd);
      const leg = route.routes[0].legs[0];
      const durationMinutes = Math.round(leg.duration.value / 60);
      const startAddress = leg.start_address;
      const endAddress = leg.end_address;

      // Update UI elements
      document.getElementById("summary-start").textContent = startAddress;
      document.getElementById("summary-end").textContent = endAddress;
      document.getElementById("summary-distance").textContent = ${distance.toFixed(2)} mi;
      document.getElementById("summary-duration").textContent = ${durationMinutes} min;

      showToast(✅ Trip complete: ${distance.toFixed(2)} mi to ${endAddress}, "default");
      document.getElementById("trip-summary").scrollIntoView({ behavior: "smooth" });

      // Log trip details
      logTrip(distance, durationMinutes);
      
      // Reset tracking state
      tracking = false;
      tripStart = null;
      tripEnd = null;
    } catch (err) {
      showToast("❌ Error: " + err.message, "default");
    }
  }, () => showToast("⚠ Unable to access GPS", "default"));
}

// Function to get driving distance using Google Distance Matrix API
async function getDrivingDistance(start, end) {
  const url = https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${start.latitude},${start.longitude}&destinations=${end.latitude},${end.longitude}&key=${apiKey};

  // For CORS issues, you might need a proxy like cors-anywhere or server-side calls
  const response = await fetch(https://cors-anywhere.herokuapp.com/${url});
  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error("Distance API error: " + data.status);
  }

  const element = data.rows[0].elements[0];
  if (element.status !== "OK") {
    throw new Error("Distance calculation error: " + element.status);
  }

  // Convert meters to miles
  return element.distance.value / 1609.34;
}

// Function to fetch route data using Google Directions API
async function fetchRouteData(start, end) {
  const url = https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=${apiKey};

  // Handle CORS
  const response = await fetch(https://cors-anywhere.herokuapp.com/${url});
  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error("Directions API error: " + data.status);
  }

  return data;
}

// Function to log trip details
function logTrip(distance, duration) {
  tripLog.push({
    startTime: new Date(tripStart.timestamp).toLocaleString(),
    endTime: new Date(tripEnd.timestamp).toLocaleString(),
    distance: distance.toFixed(2),
    duration: duration,
  });
  console.log("Trip logged:", tripLog[tripLog.length - 1]);
}

// Example buttons in HTML to trigger functions
// <button onclick="startTracking()">Start Trip</button>
// <button onclick="pauseTracking()">Pause</button>
// <button onclick="resumeTracking()">Resume</button>
// <button onclick="endTracking()">End Trip</button>

// Make sure your HTML has the following elements
// <div id="summary-start"></div>
// <div id="summary-end"></div>
// <div id="summary-distance"></div>
// <div id="summary-duration"></div>
// <div id="trip-summary"></div>
