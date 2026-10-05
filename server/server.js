require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { demoStore, add } = require("./demo-store");

const app = express();
const port = Number.parseInt(process.env.PORT || "3001", 10);
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);
const allowedDocumentTypes = new Set(["prescription", "xray"]);
const allowedLanguages = new Set(["en", "te", "hi", "ta"]);
const clientOrigins = (process.env.CLIENT_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const deploymentOrigins = [
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
].filter(Boolean);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = file.originalname.toLowerCase().split(".").pop();
    const allowedExtension = ["pdf", "jpg", "jpeg", "png"].includes(extension);
    if (!allowedTypes.has(file.mimetype) && !allowedExtension) {
      return callback(new Error("Only PDF, JPEG, and PNG documents are accepted."));
    }
    callback(null, true);
  },
});

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (for example curl) while restricting browsers.
    if (!origin || origin === "null" || clientOrigins.includes(origin) || deploymentOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This browser origin is not allowed."));
  },
}));
app.use(express.json({ limit: "1mb" }));

const demoRoles = new Set(["patient", "hospital_staff", "frontline_worker", "facility_admin", "doctor"]);
const rolePermissions = {
  facilities: new Set(["patient", "hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
  availability: new Set(["patient", "hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
  patientsRead: new Set(["hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
  patientsWrite: new Set(["hospital_staff", "frontline_worker", "facility_admin"]),
  appointments: new Set(["hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
  referrals: new Set(["hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
  followUps: new Set(["hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
  dashboard: new Set(["hospital_staff", "frontline_worker", "facility_admin", "doctor"]),
};

function requireDemoRole(permission) {
  return (request, response, next) => {
    const role = request.get("x-demo-role");
    if (!role) return response.status(401).json({ error: "Demo role required. Send x-demo-role." });
    if (!demoRoles.has(role) || !rolePermissions[permission].has(role)) {
      return response.status(403).json({ error: `Demo role '${role}' is not authorized for this action.` });
    }
    request.demoRole = role;
    next();
  };
}

function text(value, field, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    return `${field} must be a non-empty string of at most ${max} characters.`;
  }
  return null;
}

app.get("/api/demo/facilities", requireDemoRole("facilities"), (_request, response) => {
  response.json({ demo: true, facilities: demoStore.facilities });
});

app.get("/api/demo/availability", requireDemoRole("availability"), (_request, response) => {
  response.json({
    demo: true,
    facilities: demoStore.facilities.map(({ id, name, latitude, longitude, diagnostics, medicines }) => ({
      id, name, latitude, longitude, diagnostics, medicines,
    })),
  });
});

app.get("/api/demo/patients", requireDemoRole("patientsRead"), (request, response) => {
  const query = String(request.query.q || "").trim().toLowerCase();
  const patients = query
    ? demoStore.patients.filter((patient) => [patient.id, patient.name, patient.phone, patient.village].some((value) => String(value).toLowerCase().includes(query)))
    : demoStore.patients;
  response.json({ demo: true, patients });
});

app.post("/api/demo/patients", requireDemoRole("patientsWrite"), (request, response) => {
  const { name, phone, village, age, sex, facilityId } = request.body || {};
  const error = text(name, "name") || text(phone, "phone", 20) || text(village, "village") || text(facilityId, "facilityId", 30);
  if (error) return response.status(400).json({ error });
  if (!/^[0-9+\-\s]{7,20}$/.test(phone.trim())) return response.status(400).json({ error: "phone must contain 7–20 digits or separators." });
  if (!demoStore.facilities.some((facility) => facility.id === facilityId)) return response.status(400).json({ error: "facilityId must refer to a demo facility." });
  if (!Number.isInteger(age) || age < 0 || age > 120) return response.status(400).json({ error: "age must be an integer from 0 to 120." });
  const patient = add(demoStore.patients, "PAT", { name: name.trim(), phone: phone.trim(), village: village.trim(), age, sex: sex === "M" || sex === "F" || sex === "O" ? sex : "U", facilityId, registeredAt: new Date().toISOString().slice(0, 10) });
  response.status(201).json({ demo: true, patient });
});

app.get("/api/demo/appointments", requireDemoRole("appointments"), (request, response) => {
  const appointments = request.query.patientId ? demoStore.appointments.filter((item) => item.patientId === request.query.patientId) : demoStore.appointments;
  response.json({ demo: true, appointments });
});

app.get("/api/demo/appointments/queue", requireDemoRole("appointments"), (request, response) => {
  const facilityId = String(request.query.facilityId || "");
  response.json({ demo: true, queue: demoStore.appointments.filter((item) => (!facilityId || item.facilityId === facilityId) && item.status !== "cancelled").sort((a, b) => a.queueNumber - b.queueNumber) });
});

app.post("/api/demo/appointments", requireDemoRole("appointments"), (request, response) => {
  const { patientId, facilityId, date, slot, reason } = request.body || {};
  const error = text(patientId, "patientId", 30) || text(facilityId, "facilityId", 30) || text(date, "date", 10) || text(slot, "slot", 10) || text(reason, "reason");
  if (error) return response.status(400).json({ error });
  if (!demoStore.patients.some((item) => item.id === patientId) || !demoStore.facilities.some((item) => item.id === facilityId)) return response.status(400).json({ error: "patientId and facilityId must reference demo records." });
  const queueNumber = demoStore.appointments.filter((item) => item.facilityId === facilityId && item.date === date).length + 1;
  response.status(201).json({ demo: true, appointment: add(demoStore.appointments, "APT", { patientId, facilityId, date, slot, reason: reason.trim(), status: "requested", queueNumber }) });
});

app.get("/api/demo/referrals", requireDemoRole("referrals"), (_request, response) => response.json({ demo: true, referrals: demoStore.referrals }));
app.post("/api/demo/referrals", requireDemoRole("referrals"), (request, response) => {
  const { patientId, fromFacilityId, toFacilityId, reason, urgency = "routine" } = request.body || {};
  const error = text(patientId, "patientId", 30) || text(fromFacilityId, "fromFacilityId", 30) || text(toFacilityId, "toFacilityId", 30) || text(reason, "reason");
  if (error) return response.status(400).json({ error });
  if (!demoStore.patients.some((item) => item.id === patientId) || !demoStore.facilities.some((item) => item.id === fromFacilityId) || !demoStore.facilities.some((item) => item.id === toFacilityId)) return response.status(400).json({ error: "Referral references must match demo records." });
  if (!["routine", "urgent"].includes(urgency)) return response.status(400).json({ error: "urgency must be routine or urgent." });
  response.status(201).json({ demo: true, referral: add(demoStore.referrals, "REF", { patientId, fromFacilityId, toFacilityId, reason: reason.trim(), urgency, status: "open" }) });
});

app.get("/api/demo/follow-ups", requireDemoRole("followUps"), (_request, response) => response.json({ demo: true, followUps: demoStore.followUps }));
app.post("/api/demo/follow-ups", requireDemoRole("followUps"), (request, response) => {
  const { patientId, dueDate, channel = "phone", notes } = request.body || {};
  const error = text(patientId, "patientId", 30) || text(dueDate, "dueDate", 10) || text(notes, "notes");
  if (error) return response.status(400).json({ error });
  if (!demoStore.patients.some((item) => item.id === patientId)) return response.status(400).json({ error: "patientId must reference a demo patient." });
  if (!["phone", "visit", "sms"].includes(channel)) return response.status(400).json({ error: "channel must be phone, visit, or sms." });
  response.status(201).json({ demo: true, followUp: add(demoStore.followUps, "FUP", { patientId, dueDate, channel, notes: notes.trim(), status: "pending" }) });
});

app.get("/api/demo/dashboard/summary", requireDemoRole("dashboard"), (_request, response) => {
  response.json({ demo: true, summary: { facilities: demoStore.facilities.length, registeredPatients: demoStore.patients.length, appointmentsToday: demoStore.appointments.filter((item) => item.date === new Date().toISOString().slice(0, 10)).length, openReferrals: demoStore.referrals.filter((item) => item.status === "open").length, pendingFollowUps: demoStore.followUps.filter((item) => item.status === "pending").length } });
});

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

function requireGemini() {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("Gemini is not configured. Set GEMINI_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    .getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-3.6-flash" });
}

const responseSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    findings: { type: "ARRAY", items: { type: "STRING" } },
    recommendations: { type: "ARRAY", items: { type: "STRING" } },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    confidence: { type: "STRING", enum: ["low", "medium", "high"] },
  },
  required: ["summary", "findings", "recommendations", "warnings", "confidence"],
};

function documentPrompt(documentType, language) {
  const focus = documentType === "prescription"
    ? "Extract medicines, dosage, frequency, duration, and prescriber instructions exactly when legible."
    : "Describe visible radiology findings conservatively; do not diagnose or infer beyond the image.";
  const languageInstruction = language === "en"
    ? "Respond in English."
    : `Respond in the user's selected language: ${language}.`;
  return `You are a cautious medical document assistant. Analyze this ${documentType} for informational purposes only.
${focus}
${languageInstruction}
Never invent unreadable text. Clearly say when content cannot be read. Do not provide a diagnosis, treatment change, or emergency triage. Return ONLY valid JSON matching this schema: ${JSON.stringify(responseSchema)}.
Use concise language, include uncertainty in warnings, and recommend review by a qualified clinician.`;
}

app.post("/api/analyze-document", upload.single("document"), async (request, response, next) => {
  try {
    const { documentType, language = "en" } = request.body;
    if (!allowedDocumentTypes.has(documentType)) {
      return response.status(400).json({
        error: "documentType must be either 'prescription' or 'xray'.",
      });
    }
    if (!allowedLanguages.has(language)) {
      return response.status(400).json({ error: "language must be one of 'en', 'te', 'hi', or 'ta'." });
    }
    if (!request.file) {
      return response.status(400).json({ error: "A document file is required in the 'document' field." });
    }

    const model = requireGemini();
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: documentPrompt(documentType, language) },
          {
            inlineData: {
              data: request.file.buffer.toString("base64"),
              mimeType: request.file.mimetype,
            },
          },
        ],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    const text = result.response.text().replace(/^```json\s*|\s*```$/g, "").trim();
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (_error) {
      return response.status(502).json({ error: "Gemini returned an invalid structured response." });
    }
    return response.json({ documentType, analysis });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/chat", async (request, response, next) => {
  try {
    const { message, language = "en" } = request.body || {};
    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
      return response.status(400).json({ error: "message must be a non-empty string up to 4000 characters." });
    }
    if (!allowedLanguages.has(language)) {
      return response.status(400).json({ error: "language must be one of 'en', 'te', 'hi', or 'ta'." });
    }
    const model = requireGemini();
    const result = await model.generateContent(
      `You are MANA-SEHAT's cautious health-information assistant. Answer clearly and briefly in language ${language}.
Do not diagnose, prescribe, or claim certainty. Encourage a qualified clinician for personal medical decisions.
If the user describes an emergency, advise contacting local emergency services.
User message: ${message.trim()}`,
    );
    return response.json({ reply: result.response.text() });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({ error: "Document exceeds the 10MB limit." });
  }
  if (error.message && (error.message.includes("Only PDF") || error.message.includes("origin"))) {
    return response.status(400).json({ error: error.message });
  }
  const status = Number.isInteger(error.status) ? error.status : 502;
  console.error(error);
  return response.status(status).json({ error: status === 503 ? error.message : "Gemini request failed." });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`MANA-SEHAT API listening on port ${port}`);
  });
}

module.exports = app;
