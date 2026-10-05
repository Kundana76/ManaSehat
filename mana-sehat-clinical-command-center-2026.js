const ms26Toast = document.querySelector("#ms26-toast");
let ms26ToastTimer;

function ms26ShowToast(message) {
  ms26Toast.textContent = message;
  ms26Toast.classList.add("is-visible");
  clearTimeout(ms26ToastTimer);
  ms26ToastTimer = setTimeout(() => ms26Toast.classList.remove("is-visible"), 2600);
}

function ms26OpenSection(section) {
  document.querySelectorAll(".ms26-section").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.panel === section);
  });
  document.querySelectorAll(".ms26-nav button[data-section]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === section);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".ms26-nav button[data-section], [data-section-target]").forEach((element) => {
  element.addEventListener("click", () => ms26OpenSection(element.dataset.section || element.dataset.sectionTarget));
});

function ms26SetMode(mode) {
  document.querySelectorAll(".ms26-view-switch button").forEach((button) => button.classList.toggle("is-selected", button.dataset.mode === mode));
  document.querySelectorAll("[data-doctor][data-hospital]").forEach((value) => {
    value.textContent = value.dataset[mode];
  });
  ms26ShowToast(`${mode === "doctor" ? "Doctor" : "Hospital"} view selected`);
}

document.querySelectorAll(".ms26-view-switch button").forEach((button) => {
  button.addEventListener("click", () => ms26SetMode(button.dataset.mode));
});
document.querySelectorAll("[data-mode-target]").forEach((button) => {
  button.addEventListener("click", () => {
    ms26SetMode(button.dataset.modeTarget);
    ms26OpenSection("overview");
  });
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => ms26ShowToast(`${button.dataset.action} · connected to your care workflow`));
});

const ms26ReferralForm = document.querySelector("#doctor-referral-form");
if (ms26ReferralForm) {
  ms26ReferralForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#doctor-referral-status");
    const data = Object.fromEntries(new FormData(ms26ReferralForm));
    status.textContent = "Creating referral…";
    try {
      const apiBase = window.MANA_SEHAT_API_URL || (location.protocol === "file:" ? "http://localhost:3001" : location.origin);
      const response = await fetch(`${apiBase}/api/demo/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "doctor" },
        body: JSON.stringify({ ...data, fromFacilityId: "FAC-001" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Referral could not be created.");
      status.textContent = `Referral ${result.referral.id} created and marked ${result.referral.urgency}.`;
      ms26ShowToast("Referral created · hospital tracking enabled");
      ms26ReferralForm.reset();
    } catch (error) {
      status.textContent = error.message;
      ms26ShowToast("Referral could not be created");
    }
  });
}

const ms26PatientSearch = document.querySelector("#ms26-patient-search");
const ms26Rows = [...document.querySelectorAll("#ms26-patient-table tr")];
let ms26Filter = "all";
function ms26FilterPatients() {
  const query = ms26PatientSearch.value.toLowerCase().trim();
  ms26Rows.forEach((row) => {
    const matchesFilter = ms26Filter === "all" || row.dataset.category === ms26Filter;
    row.hidden = !(matchesFilter && row.textContent.toLowerCase().includes(query));
  });
}
ms26PatientSearch.addEventListener("input", ms26FilterPatients);
document.querySelectorAll(".ms26-filter-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".ms26-filter-tabs button").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    ms26Filter = button.dataset.filter;
    ms26FilterPatients();
  });
});

document.querySelector(".ms26-menu").addEventListener("click", () => {
  document.querySelector(".ms26-sidebar").classList.toggle("is-open");
});
document.querySelectorAll(".ms26-nav button").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(".ms26-sidebar").classList.remove("is-open"));
});

document.querySelector("#ms26-global-search").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.currentTarget.value.trim()) {
    ms26OpenSection("patients");
    ms26PatientSearch.value = event.currentTarget.value;
    ms26FilterPatients();
  }
});
