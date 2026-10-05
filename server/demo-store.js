const crypto = require("crypto");

const demoStore = {
  facilities: [
    { id: "FAC-001", name: "PHC Nalgonda Rural", type: "hospital", district: "Nalgonda", state: "Telangana", latitude: 17.0575, longitude: 79.2671, services: ["OPD", "maternal care", "lab"], specialists: ["Dr. Ananya Mehta · General medicine"], diagnostics: ["CBC blood test", "Blood pressure"], medicines: [{ name: "Paracetamol 500 mg", status: "in-stock" }, { name: "ORS sachets", status: "low-stock" }], openHours: "08:00–17:00" },
    { id: "FAC-002", name: "CHC Miryalaguda", type: "hospital", district: "Nalgonda", state: "Telangana", latitude: 16.8723, longitude: 79.5625, services: ["OPD", "emergency", "teleconsult"], specialists: ["Dr. Vikram Rao · Cardiology"], diagnostics: ["X-ray", "ECG"], medicines: [{ name: "Amlodipine 5 mg", status: "in-stock" }, { name: "Insulin", status: "out-of-stock" }], openHours: "24 hours" },
  ],
  patients: [
    { id: "PAT-1001", name: "Lakshmi Devi", phone: "9000000001", village: "Chityal", age: 42, sex: "F", facilityId: "FAC-001", registeredAt: "2026-09-18", demo: true },
    { id: "PAT-1002", name: "Ravi Kumar", phone: "9000000002", village: "Nakrekal", age: 29, sex: "M", facilityId: "FAC-002", registeredAt: "2026-09-19", demo: true },
  ],
  appointments: [
    { id: "APT-2001", patientId: "PAT-1001", facilityId: "FAC-001", date: "2026-09-23", slot: "10:30", status: "confirmed", queueNumber: 4, reason: "Blood pressure review", demo: true },
  ],
  referrals: [],
  followUps: [],
};

function id(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function add(collection, prefix, value) {
  const record = { id: id(prefix), ...value, demo: true };
  collection.push(record);
  return record;
}

module.exports = { demoStore, add };
