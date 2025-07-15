// log.js
import { showToast } from './ui.js';

let tripLog = [];

function logTrip(purpose, notes, distance, duration, paused) {
  const rate = parseFloat(document.getElementById("rate").value || "0");
  const reimbursement = (distance * rate).toFixed(2);
  const entry = {
    date: new Date().toLocaleString(),
    purpose,
    notes,
    miles: distance,
    duration: `${duration} min`,
    paused: `${paused} min`,
    reimbursement: `$${reimbursement}`
  };
  tripLog.push(entry);

  const li = document.createElement("li");
  li.textContent = `${entry.date} | ${entry.purpose} | ${entry.miles} mi | ${entry.reimbursement}`;
  document.getElementById("trip-log").appendChild(li);
  updateSummary();
}

function updateSummary() {
  let today = 0, week = 0;
  const todayDate = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const rate = parseFloat(document.getElementById("rate").value || "0");

  tripLog.forEach(t => {
    const d = new Date(t.date);
    const m = parseFloat(t.miles);
    if (d.toDateString() === todayDate) today += m;
    if (d.getTime() >= weekAgo) week += m;
  });

  document.getElementById("today-summary").textContent = `${today.toFixed(2)} mi | $${(today * rate).toFixed(2)}`;
  document.getElementById("week-summary").textContent = `${week.toFixed(2)} mi | $${(week * rate).toFixed(2)}`;
}

function downloadCSV() {
  if (!tripLog.length) return showToast("📂 No trips to export");
  let csv = "Date,Purpose,Notes,Miles,Duration,Paused,Reimbursement\n";
  tripLog.forEach(t => {
    csv += `${t.date},${t.purpose},${t.notes},${t.miles},${t.duration},${t.paused},${t.reimbursement}\n`;
  });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mileage_log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  tripLog = [];
  document.getElementById("trip-log").innerHTML = "";
  updateSummary();
  showToast("🧹 Trip history cleared");
}

export { logTrip, updateSummary, downloadCSV, clearHistory };
