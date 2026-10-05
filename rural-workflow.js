const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:3001";
const role = document.querySelector("#role");
const content = document.querySelector("#content");
const errorBox = document.querySelector("#error");
const summary = document.querySelector("#summary");
let activeTab = "facilities";
const requestedRole = new URLSearchParams(location.search).get("role");
if (["hospital_staff", "doctor"].includes(requestedRole)) role.value = requestedRole;

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { "Content-Type": "application/json", "x-demo-role": role.value, ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The demo API returned an error.");
  return body;
}
function showError(error) { errorBox.textContent = error.message; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; }
function renderRows(items, fields) {
  content.innerHTML = `<div class="rural-list">${items.length ? items.map((item) => `<article class="rural-row"><div><strong>${fields(item).title}</strong><span>${fields(item).detail}</span></div><small>${item.status || item.openHours || "DEMO"}</small></article>`).join("") : "<p>No demo records yet.</p>"}</div>`;
}
async function loadSummary() {
  const { summary: data } = await api("/api/demo/dashboard/summary");
  summary.innerHTML = Object.entries(data).map(([key, value]) => `<article class="summary-card"><strong>${value}</strong><small>${key.replace(/[A-Z]/g, (letter) => ` ${letter}`).toUpperCase()}</small></article>`).join("");
}
async function loadTab() {
  clearError();
  try {
    if (activeTab === "facilities") {
      const { facilities } = await api("/api/demo/facilities");
      renderRows(facilities, (item) => ({ title: item.name, detail: `${item.district}, ${item.state} · ${item.services.join(", ")}` }));
    } else if (activeTab === "patients") {
      const { patients } = await api("/api/demo/patients");
      renderRows(patients, (item) => ({ title: `${item.name} (${item.id})`, detail: `${item.village} · ${item.age} years · ${item.phone}` }));
    } else if (activeTab === "appointments") {
      const { queue } = await api("/api/demo/appointments/queue");
      renderRows(queue, (item) => ({ title: `Queue ${item.queueNumber} · ${item.date} ${item.slot}`, detail: `${item.patientId} · ${item.reason}` }));
    } else if (activeTab === "availability") {
      const { facilities } = await api("/api/demo/availability");
      const items = facilities.flatMap((facility) => [
        ...(facility.diagnostics || []).map((name) => ({ id: `${facility.id}-${name}`, name, kind: "LAB / DIAGNOSTIC", facility: facility.name, status: "registered demo service" })),
        ...(facility.medicines || []).map((medicine) => ({ id: `${facility.id}-${medicine.name}`, name: medicine.name, kind: "MEDICINE", facility: facility.name, status: medicine.status })),
      ]);
      renderRows(items, (item) => ({ title: `${item.kind} · ${item.name}`, detail: item.facility }));
    } else {
      const path = activeTab === "referrals" ? "/api/demo/referrals" : "/api/demo/follow-ups";
      const key = activeTab === "referrals" ? "referrals" : "followUps";
      const { [key]: records } = await api(path);
      renderRows(records, (item) => ({ title: `${item.patientId} · ${item.id}`, detail: item.reason || `${item.dueDate} · ${item.channel}` }));
    }
  } catch (error) { showError(error); content.innerHTML = "<p>Unable to load this demo view.</p>"; }
}
document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = button.dataset.tab; document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button)); loadTab(); }));
role.addEventListener("change", () => { loadSummary().then(loadTab).catch(showError); });
loadSummary().then(loadTab).catch(showError);
