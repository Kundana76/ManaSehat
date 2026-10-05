const navItems = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");
const breadcrumb = document.querySelector("#breadcrumb");
const toast = document.querySelector("#toast");
const loadingOverlay = document.querySelector("#app-loading");
const loginScreen = document.querySelector("#login-screen");
const appShell = document.querySelector("#app-shell");
const loginInput = document.querySelector("#login-input");
const loginLabel = document.querySelector("#login-label");
const loginPrefix = document.querySelector("#login-prefix");
const loginEyebrow = document.querySelector("#login-eyebrow");
const loginTitle = document.querySelector("#login-title");
const loginDescription = document.querySelector("#login-description");
const qrLoginLabel = document.querySelector("#qr-login-label");
let loginRole = "patient";
const brandReveal = document.querySelector("#brand-reveal");
const languageSelect = document.querySelector("#language-select");
const loginLanguageSelect = document.querySelector("#login-language-select");
const loadingLanguageSelect = document.querySelector("#loading-language-select");
const savedLanguage = localStorage.getItem("mana-sehat-language") || "en";
languageSelect.value = translations[savedLanguage] ? savedLanguage : "en";
loginLanguageSelect.value = languageSelect.value;
loadingLanguageSelect.value = languageSelect.value;
let activeLanguage = languageSelect.value;

function applyLanguage(language) {
  const selected = translations[language] || translations.en;
  activeLanguage = language;
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = selected[element.dataset.i18n];
    if (value) element.textContent = value;
  });
  const currentView = document.querySelector(".view.active");
  const viewLabels = { overview: selected.overview, timeline: selected.history, scan: selected.scan, records: selected.records, profile: selected.profile };
  if (currentView) breadcrumb.textContent = viewLabels[currentView.id] || selected.overview;
  localStorage.setItem("mana-sehat-language", language);
  languageSelect.value = language;
  loginLanguageSelect.value = language;
  loadingLanguageSelect.value = language;
  setTimeout(updateChatbotContext, 0);
}

function setLoading(isLoading) {
  loadingOverlay.hidden = !isLoading;
  document.body.classList.toggle("is-loading", isLoading);
}

languageSelect.addEventListener("change", () => {
  applyLanguage(languageSelect.value);
  updateChatbotContext();
  loginLanguageSelect.value = languageSelect.value;
  showToast(`${translations[languageSelect.value].language} selected`);
});
loginLanguageSelect.addEventListener("change", () => {
  languageSelect.value = loginLanguageSelect.value;
  applyLanguage(loginLanguageSelect.value);
  updateChatbotContext();
});
loadingLanguageSelect.addEventListener("change", () => {
  applyLanguage(loadingLanguageSelect.value);
  updateChatbotContext();
});
applyLanguage(languageSelect.value);

document.querySelectorAll("[data-login-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-login-tab]").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    const abha = tab.dataset.loginTab === "abha";
    loginLabel.textContent = translations[activeLanguage][abha ? "abhaLabel" : "aadhaarLabel"];
    loginInput.placeholder = abha ? "12-3456-7890-1234" : "0000 0000 0000";
    loginInput.maxLength = abha ? 17 : 14;
    loginPrefix.textContent = abha ? "ABHA" : "AADHAAR";
    loginInput.value = "";
  });
});

document.querySelectorAll("[data-login-role]").forEach((roleButton) => {
  roleButton.addEventListener("click", () => {
    loginRole = roleButton.dataset.loginRole;
    document.querySelectorAll("[data-login-role]").forEach((item) => item.classList.toggle("active", item === roleButton));
    const staffRole = ["doctor", "hospital_staff"].includes(loginRole);
    const doctor = loginRole === "doctor";
    loginEyebrow.textContent = staffRole ? "SECURE STAFF LOGIN" : translations[activeLanguage].secureLogin;
    loginTitle.textContent = staffRole ? "Care teams, connected." : translations[activeLanguage].loginTitle;
    loginDescription.textContent = doctor
      ? "Review AI case summaries, manage appointments, and coordinate patient care."
      : loginRole === "hospital_staff"
        ? "Track patient records, referrals, queues, and follow-up work for your hospital."
      : translations[activeLanguage].loginDescription;
    loginLabel.textContent = staffRole ? "Enter your staff ID" : translations[activeLanguage].abhaLabel;
    loginInput.placeholder = staffRole ? "STAFF-MS-204" : "12-3456-7890-1234";
    loginInput.maxLength = staffRole ? 32 : 17;
    loginInput.inputMode = staffRole ? "text" : "numeric";
    loginPrefix.textContent = staffRole ? "ID" : "ABHA";
    qrLoginLabel.textContent = staffRole ? "Login with staff SSO" : translations[activeLanguage].loginQr;
    document.querySelectorAll("[data-login-tab]").forEach((item) => item.classList.toggle("is-disabled", staffRole));
    loginInput.value = "";
  });
});

document.querySelector("#login-button").addEventListener("click", () => {
  if (["doctor", "hospital_staff"].includes(loginRole)) {
    if (loginInput.value.trim().length < 4) {
      loginInput.focus();
      showToast("Enter a valid staff ID");
      return;
    }
    if (loginRole === "doctor") {
      window.location.href = "mana-sehat-clinical-command-center-2026.html";
    } else {
      window.location.href = `rural-workflow.html?role=${encodeURIComponent(loginRole)}`;
    }
    return;
  }
  if (loginInput.value.replace(/\D/g, "").length < 6) {
    loginInput.focus();
    showToast("Enter a valid ABHA ID or Aadhaar number");
    return;
  }
  loginScreen.style.display = "none";
  appShell.classList.remove("app-hidden");
  updateChatbotContext();
  brandReveal.style.animation = "none";
  brandReveal.offsetHeight;
  brandReveal.style.animation = "";
  showToast("Secure login successful");
});
document.querySelector("#qr-login").addEventListener("click", () => {
  if (loginRole === "doctor") {
    window.location.href = "mana-sehat-clinical-command-center-2026.html";
    return;
  }
  if (loginRole === "hospital_staff") {
    window.location.href = `rural-workflow.html?role=${encodeURIComponent(loginRole)}`;
    return;
  }
  showToast("ABHA QR scanner is ready");
});
document.querySelector("#logout-button").addEventListener("click", () => {
  appShell.classList.add("app-hidden");
  loginScreen.style.display = "flex";
  updateChatbotContext();
  loginInput.value = "";
});

const voiceButton = document.querySelector("#chatbot-mic");
const voiceStatus = document.querySelector("#chatbot-voice-status");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    voiceButton.classList.add("listening");
    voiceStatus.textContent = "Listening…";
  };
  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;
    voiceStatus.textContent = spokenText;
    chatbotInput.value = spokenText;
    sendChat(spokenText);
  };
  recognition.onerror = () => {
    voiceStatus.textContent = "Voice input was not available. Please try again.";
    voiceButton.classList.remove("listening");
  };
  recognition.onend = () => voiceButton.classList.remove("listening");
}
function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = { en: "en-IN", te: "te-IN", hi: "hi-IN", ta: "ta-IN" }[activeLanguage] || "en-IN";
  window.speechSynthesis.speak(utterance);
}
function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
voiceButton.addEventListener("click", () => {
  if (!recognition) {
    voiceStatus.textContent = "Voice input is not supported in this browser.";
    return;
  }
  recognition.lang = { en: "en-IN", te: "te-IN", hi: "hi-IN", ta: "ta-IN" }[activeLanguage] || "en-IN";
  recognition.start();
});

const chatbotFab = document.querySelector("#chatbot-fab");
const chatbotPanel = document.querySelector("#chatbot-panel");
const chatbotMessages = document.querySelector("#chatbot-messages");
const chatbotInput = document.querySelector("#chatbot-input");
const chatbotWelcome = document.querySelector("#chatbot-welcome");
const chatbotQuickReplies = document.querySelector("#chatbot-quick-replies");
function updateChatbotContext() {
  if (!chatbotWelcome || !chatbotQuickReplies) return;
  const loggedIn = !appShell.classList.contains("app-hidden");
  const selected = translations[activeLanguage] || translations.en;
  chatbotWelcome.textContent = loggedIn ? selected.chatWelcome : selected.loginChatWelcome;
  chatbotQuickReplies.innerHTML = (loggedIn ? selected.chatQuickReplies : selected.loginChatQuickReplies)
    .map((text) => `<button type="button">${text}</button>`).join("");
  chatbotQuickReplies.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => sendChat(button.textContent));
  });
}
updateChatbotContext();
chatbotFab.addEventListener("click", () => {
  const open = chatbotPanel.classList.toggle("open");
  chatbotPanel.setAttribute("aria-hidden", String(!open));
  if (!open) {
    stopSpeaking();
    if (recognition) recognition.abort();
  }
  if (open) chatbotInput.focus();
});
document.querySelector("#chatbot-close").addEventListener("click", () => {
  stopSpeaking();
  if (recognition) recognition.abort();
  chatbotPanel.classList.remove("open");
  chatbotPanel.setAttribute("aria-hidden", "true");
});

function addChatMessage(text, type) {
  const message = document.createElement("div");
  message.className = `chat-message ${type}`;
  const content = document.createElement("span");
  content.textContent = text;
  const speakButton = document.createElement("button");
  speakButton.type = "button";
  speakButton.className = "speak-message";
  speakButton.setAttribute("aria-label", "Read this message aloud");
  speakButton.textContent = "🔊";
  speakButton.addEventListener("click", () => speakText(text));
  message.append(content, speakButton);
  chatbotMessages.appendChild(message);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}
function assistantReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("report") || lower.includes("scan")) return "Open Scan from the bottom bar to scan a report or X-ray. I can help organize the important values after upload.";
  if (lower.includes("appointment") || lower.includes("doctor")) return "Your next appointment is with Dr. Ananya Mehta tomorrow at 10:30 AM. You can join the waiting room from Appointments.";
  if (lower.includes("record") || lower.includes("history")) return "Your records and complete care history are available from Records and History in the bottom navigation.";
  return "I can help with reports, appointments, records, or your AI case-taking. What would you like to explore?";
}
async function sendChat(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  addChatMessage(cleanText, "user");
  chatbotInput.value = "";
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: cleanText, language: activeLanguage }),
    }, 2000);
    if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
    const payload = await response.json();
    const reply = payload.reply || assistantReply(cleanText);
    addChatMessage(reply, "bot");
  } catch (error) {
    if (error.name !== "AbortError") console.warn("Gemini chat unavailable; using local assistant:", error.message);
    const fallback = assistantReply(cleanText);
    addChatMessage(fallback, "bot");
  }
}
document.querySelector("#chatbot-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendChat(chatbotInput.value);
});
document.querySelectorAll(".quick-replies button").forEach((button) => {
  button.addEventListener("click", () => sendChat(button.textContent));
});

function showView(viewName) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewName));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  const active = document.querySelector(`[data-view="${viewName}"]`);
  breadcrumb.textContent = active ? active.textContent.trim().replace(/\s+\d+$/, "") : viewName;
  if (viewName === "timeline") renderSavedHistory();
  if (viewName === "find-care") loadCareDirectory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderSavedHistory() {
  const container = document.querySelector("#history-items");
  const wrapper = document.querySelector("#saved-history");
  if (!historyEntries.length) {
    wrapper.hidden = true;
    return;
  }
  wrapper.hidden = false;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  container.innerHTML = historyEntries.map((entry) => `<div class="saved-history-row"><span class="history-file-icon">${entry.type.startsWith("X-ray") ? "◉" : "▤"}</span><div><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.type)} · ${escapeHtml(entry.file)} · Saved ${escapeHtml(entry.savedAt)}</small>${entry.details ? `<p>${escapeHtml(entry.details)}</p>` : `<p>${entry.points.map(escapeHtml).join(" · ")}</p>`}</div></div>`).join("");
}

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.viewTarget));
});
navItems.forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));

const questions = [
  ["What brings you here today?", "You can type your answer or use the microphone. Take your time.", "Getting started"],
  ["Where do you feel the discomfort?", "Tell me the location in your own words.", "Understanding symptoms"],
  ["When did this start, and how often does it happen?", "An approximate date or pattern is perfectly okay.", "Understanding symptoms"],
  ["Has anything made it better or worse?", "Think about food, sleep, activity, stress, or medicines.", "Looking for patterns"],
  ["Is there anything else your doctor should know?", "Share allergies, concerns, or questions you would like to discuss.", "Almost complete"],
];
let questionIndex = 0;
const answerInput = document.querySelector("#answer-input");
const questionNumber = document.querySelector("#question-number");
const questionText = document.querySelector("#question-text");
const questionHelper = document.querySelector("#question-helper");
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");

function updateQuestion() {
  const [title, helper, label] = questions[questionIndex];
  questionNumber.textContent = questionIndex + 1;
  questionText.textContent = title;
  questionHelper.textContent = helper;
  progressLabel.textContent = label;
  progressBar.style.width = `${((questionIndex + 1) / questions.length) * 100}%`;
  answerInput.value = "";
  answerInput.focus();
}

document.querySelector("#next-question").addEventListener("click", () => {
  if (questionIndex < questions.length - 1) {
    questionIndex += 1;
    updateQuestion();
  } else {
    showToast("Case summary prepared for Dr. Mehta");
    questionIndex = 0;
    updateQuestion();
  }
});
document.querySelector("#skip-question").addEventListener("click", () => {
  if (questionIndex < questions.length - 1) {
    questionIndex += 1;
    updateQuestion();
  }
});
answerInput.addEventListener("input", () => {
  document.querySelector(".character-count").textContent = `${answerInput.value.length} / 500`;
});
document.querySelector("#voice-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.innerHTML = "<span>●</span> Listening…";
  button.classList.add("listening");
  setTimeout(() => {
    answerInput.value = "I have had a dull headache since last week, mostly in the evenings.";
    answerInput.dispatchEvent(new Event("input"));
    button.innerHTML = "<span>♩</span> Speak your answer";
    button.classList.remove("listening");
    showToast("Voice answer captured");
  }, 1200);
});

const uploadTrigger = document.querySelector("#upload-trigger");
const fileInput = document.querySelector("#file-input");
const recordsStorageKey = "mana-sehat-records";
const recordEntries = JSON.parse(localStorage.getItem(recordsStorageKey) || "[]");
const recordsList = document.querySelector("#records-list");
const recordCount = document.querySelector("#record-count");
function renderRecords() {
  recordCount.textContent = recordEntries.length;
  if (!recordEntries.length) {
    recordsList.innerHTML = '<div class="empty-records"><strong>No scanned records yet</strong><span>Use Scan to analyze a prescription, report, or X-ray.</span></div>';
    return;
  }
  recordsList.innerHTML = recordEntries.map((entry) => `<div class="record-row"><div class="file-icon ${entry.extension === "pdf" ? "pdf" : "image"}">${entry.extension === "pdf" ? "PDF" : "IMG"}</div><div class="record-info"><strong>${escapeHtml(entry.file)}</strong><span>${escapeHtml(entry.type)} · ${escapeHtml(entry.savedAt)} · ${escapeHtml(entry.size)}</span></div><span class="tag green-tag">${escapeHtml(entry.status)}</span></div>`).join("");
}
function addRecord(file, type, status = "AI read") {
  const extension = file.name.toLowerCase().split(".").pop();
  const exists = recordEntries.some((entry) => entry.file === file.name && entry.type === type);
  if (exists) return;
  recordEntries.unshift({
    file: file.name,
    extension,
    type,
    status,
    size: `${(file.size / 1024).toFixed(0)} KB`,
    savedAt: new Date().toLocaleDateString(),
  });
  localStorage.setItem(recordsStorageKey, JSON.stringify(recordEntries.slice(0, 30)));
  renderRecords();
}
renderRecords();
uploadTrigger.addEventListener("click", () => fileInput.click());
document.querySelector(".upload-zone .outline-button").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (!fileInput.files.length) return;
  const file = fileInput.files[0];
  const extension = file.name.toLowerCase().split(".").pop();
  const allowed = ["pdf", "jpg", "jpeg", "png"].includes(extension);
  if (!allowed || file.size > maxUploadBytes) {
    fileInput.value = "";
    showToast("Choose a PDF, JPG, or PNG file up to 10 MB");
    return;
  }
  addRecord(file, "Uploaded from records", "Uploaded");
  showToast(`${file.name} added to your records`);
});
document.querySelectorAll(".mood-row button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".mood-row button").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");
}));
document.querySelector(".checkin-panel .primary-button").addEventListener("click", () => showToast("Daily check-in saved"));
document.querySelector(".language-banner .outline-button").addEventListener("click", () => showToast("Language preferences are ready to update"));
document.querySelector(".emergency-button").addEventListener("click", () => showToast("Please call 112 for immediate medical help"));
const scanInput = document.querySelector("#scan-input");
let selectedScanType = "prescription";
let selectedScanFile = null;
const scanResult = document.querySelector("#scan-result");
const xrayQuestions = document.querySelector("#xray-questions");
const importantPoints = document.querySelector("#important-points");
const historyStorageKey = "mana-sehat-history";
const historyEntries = JSON.parse(localStorage.getItem(historyStorageKey) || "[]");
const defaultApiBaseUrl = window.location.protocol === "file:" ? "http://localhost:3001" : window.location.origin;
const apiBaseUrl = (window.MANA_SEHAT_API_URL || defaultApiBaseUrl).replace(/\/$/, "");
const maxUploadBytes = 10 * 1024 * 1024;
const supportedUploadTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

document.querySelectorAll(".scan-choice").forEach((choice) => {
  choice.addEventListener("click", () => {
    document.querySelectorAll(".scan-choice").forEach((item) => item.classList.remove("active"));
    choice.classList.add("active");
    selectedScanType = choice.dataset.scanType;
    const isXray = selectedScanType === "xray";
    document.querySelector("#scanner-symbol").textContent = isXray ? "◉" : "▤";
    document.querySelector("#scanner-prompt").textContent = isXray ? "Place an X-ray or medical image here" : "Place a prescription or report here";
    document.querySelector("#scanner-subtitle").textContent = isXray ? "After upload, tell us about the image" : "Keep the page flat and well lit";
  });
});
document.querySelector("#scan-button").addEventListener("click", () => {
  showToast("Camera scanner opened");
  document.querySelector(".scan-line").style.animationDuration = "1s";
  scanInput.click();
});
document.querySelector("#gallery-button").addEventListener("click", () => scanInput.click());
scanInput.addEventListener("change", async () => {
  if (!scanInput.files.length) return;
  selectedScanFile = scanInput.files[0];
  const fileExtension = selectedScanFile.name.toLowerCase().split(".").pop();
  const isSupportedImage = ["jpg", "jpeg", "png"].includes(fileExtension)
    && (!selectedScanFile.type || selectedScanFile.type.startsWith("image/"));
  const isSupportedPdf = fileExtension === "pdf" && (!selectedScanFile.type || selectedScanFile.type === "application/pdf");
  if ((!isSupportedImage && !isSupportedPdf) || selectedScanFile.size > maxUploadBytes) {
    selectedScanFile = null;
    scanInput.value = "";
    showToast("Choose a PDF, JPG, or PNG file up to 10 MB");
    return;
  }
  if (selectedScanType === "xray") {
    await analyzeWithGemini(selectedScanFile, "xray");
    xrayQuestions.hidden = false;
    scanResult.hidden = true;
    showToast("X-ray uploaded. Add a little context before saving.");
    xrayQuestions.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  await analyzeWithGemini(selectedScanFile, "prescription");
});

let latestAnalysis = null;
async function analyzeWithGemini(file, documentType) {
  showToast("Gemini is analyzing your document...");
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentType", documentType);
    formData.append("language", activeLanguage);
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/analyze-document`, { method: "POST", body: formData }, 3000);
    if (!response.ok) throw new Error(`Analysis request failed (${response.status})`);
    latestAnalysis = await response.json();
    if (documentType === "prescription") {
      showPrescriptionResult(file, latestAnalysis.analysis || latestAnalysis);
      addRecord(file, "Prescription / report");
    } else {
      showToast("X-ray context ready. Please answer the questions before saving.");
    }
  } catch (error) {
    if (error.name !== "AbortError") console.warn("Gemini document analysis unavailable; using safe preview:", error.message);
    latestAnalysis = null;
    if (documentType === "prescription") showPrescriptionResult(file);
    showToast(error.name === "AbortError"
      ? "Analysis timed out; showing the safe demo preview"
      : "Gemini is unavailable; showing the safe demo preview");
  } finally {
    setLoading(false);
  }
}
function showPrescriptionResult(file, analysis = null) {
  const fileName = file.name.toLowerCase();
  document.querySelector("#result-file").textContent = `${file.name} · AI extracted key details`;
  document.querySelector("#result-title").textContent = fileName.includes("prescription") ? "Prescription summary" : "Report summary";
  const points = analysis?.importantPoints
    || analysis?.keyPoints
    || analysis?.important_points
    || [
      ...(Array.isArray(analysis?.findings) ? analysis.findings : []),
      ...(Array.isArray(analysis?.recommendations) ? analysis.recommendations : []),
    ];
  importantPoints.innerHTML = Array.isArray(points) && points.length
    ? points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")
    : "<li>Medicine names and dosage detected</li><li>Prescription date identified</li><li>Follow-up instructions found</li>";
  const summaryText = [document.querySelector("#result-title").textContent, ...[...importantPoints.querySelectorAll("li")].map((item) => item.textContent)].join(". ");
  document.querySelector("#speak-summary").dataset.speechText = summaryText;
  scanResult.hidden = false;
  xrayQuestions.hidden = true;
  scanResult.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Document analyzed successfully");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}
function saveHistoryEntry(entry) {
  historyEntries.unshift({ ...entry, savedAt: new Date().toLocaleDateString() });
  localStorage.setItem(historyStorageKey, JSON.stringify(historyEntries.slice(0, 20)));
  showToast("Saved to your health history");
}
document.querySelector("#save-result").addEventListener("click", () => {
  if (!selectedScanFile) return;
  saveHistoryEntry({ type: "Prescription / report", title: document.querySelector("#result-title").textContent, file: selectedScanFile.name, points: [...importantPoints.querySelectorAll("li")].map((item) => item.textContent), aiAnalysis: latestAnalysis });
  document.querySelector("#saved-result").textContent = "✓ Added to timeline";
});
document.querySelector("#save-xray").addEventListener("click", () => {
  const bodyPart = document.querySelector("#xray-body-part").value.trim();
  const takenDate = document.querySelector("#xray-date").value;
  if (!selectedScanFile || !bodyPart || !takenDate) {
    showToast("Add the body part and date to continue");
    return;
  }
  saveHistoryEntry({ type: "X-ray / medical image", title: `${bodyPart} X-ray`, file: selectedScanFile.name, details: document.querySelector("#xray-reason").value.trim() || "Context not provided" });
  addRecord(selectedScanFile, "X-ray / medical image");
  showToast("X-ray context saved to your timeline");
  document.querySelector("#save-xray").textContent = "✓ Saved to history";
});
document.querySelector("#share-xray").addEventListener("click", async () => {
  if (!selectedScanFile) return;
  const bodyPart = document.querySelector("#xray-body-part").value.trim() || "medical image";
  const shareData = { title: `MANA-SEHAT ${bodyPart} X-ray`, text: `Please review this ${bodyPart} X-ray in my MANA-SEHAT health history.` };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error.name !== "AbortError") showToast("Sharing is unavailable right now");
    }
  } else {
    await navigator.clipboard?.writeText(`${shareData.title}\n${shareData.text}`);
    showToast("X-ray summary copied to clipboard");
  }
});
document.querySelector("#close-result").addEventListener("click", () => {
  stopSpeaking();
  scanResult.hidden = true;
});
document.querySelector("#explain-result").addEventListener("click", () => {
  chatbotPanel.classList.add("open");
  chatbotPanel.setAttribute("aria-hidden", "false");
  sendChat(`Explain my ${selectedScanType === "xray" ? "X-ray context" : "prescription"} ${selectedScanFile ? selectedScanFile.name : ""}`);
});
document.querySelector("#speak-result").addEventListener("click", () => {
  const summaryButton = document.querySelector("#speak-summary");
  speakText(summaryButton.dataset.speechText || "Your document has been analyzed.");
  showToast("Speaking document summary");
});
document.querySelector("#speak-summary").addEventListener("click", (event) => {
  speakText(event.currentTarget.dataset.speechText || "No summary is available yet.");
});

const careDirectory = document.querySelector("#care-directory");
const careFilters = document.querySelectorAll("[data-care-filter]");
const careMapElement = document.querySelector("#care-map");
const careMapStatus = document.querySelector("#care-map-status");
let careFacilities = [];
let careMap;
let careMapMarkers;
let careRefreshTimer;
function renderCareMap(facilities) {
  if (!careMapElement || !careMapStatus) return;
  const mapped = facilities.filter((facility) => Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude));
  if (!window.L) {
    careMapElement.innerHTML = '<div class="care-map-fallback"><div><strong>Map view needs an internet connection</strong><span>Registered hospital markers will appear here when the map service loads. The facility list remains available below.</span></div></div>';
    careMapStatus.textContent = "List view is available.";
    return;
  }
  careMap ||= L.map(careMapElement).setView([17.01, 79.42], 9);
  if (!careMapMarkers) {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(careMap);
    careMapMarkers = L.layerGroup().addTo(careMap);
  }
  careMapMarkers.clearLayers();
  if (!mapped.length) {
    careMapStatus.textContent = "No registered hospital locations are available yet.";
    setTimeout(() => careMap.invalidateSize(), 0);
    return;
  }
  const bounds = [];
  mapped.forEach((facility) => {
    const marker = L.marker([facility.latitude, facility.longitude]).bindPopup(`<strong>${escapeHtml(facility.name)}</strong><br>${escapeHtml(facility.openHours || "Hours not provided")}<br>Registered demo facility`);
    marker.addTo(careMapMarkers);
    bounds.push([facility.latitude, facility.longitude]);
  });
  careMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
  setTimeout(() => careMap.invalidateSize(), 0);
  careMapStatus.textContent = `${mapped.length} registered hospital location${mapped.length === 1 ? "" : "s"} shown. Availability refreshes automatically.`;
}
async function loadCareDirectory(filter = "all") {
  if (!careDirectory) return;
  renderCareMap(careFacilities);
  careDirectory.innerHTML = "<div class=\"empty-records\"><strong>Loading nearby care…</strong><span>Checking the synthetic demo directory.</span></div>";
  try {
    const apiBase = window.MANA_SEHAT_API_URL || (location.protocol === "file:" ? "http://localhost:3001" : location.origin);
    const apiUrl = `${apiBase}/api/demo/facilities`;
    const response = await fetch(apiUrl, { headers: { "x-demo-role": "patient" } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Nearby care is unavailable.");
    careFacilities = body.facilities || [];
    renderCareMap(careFacilities);
    const facilities = filter === "all"
      ? careFacilities
      : careFacilities.filter((facility) => filter === "doctor"
        ? facility.specialists?.length
        : filter === "lab"
          ? facility.diagnostics?.length
          : filter === "medicine"
            ? facility.medicines?.length
          : facility.type === filter);
    careDirectory.innerHTML = facilities.length
      ? facilities.map((facility) => `<article class="record-item"><div class="record-icon">⌖</div><div class="record-info"><strong>${escapeHtml(facility.name)}</strong><span>${escapeHtml(facility.district)}, ${escapeHtml(facility.state)} · ${escapeHtml(facility.openHours)}</span><small>Doctors: ${escapeHtml((facility.specialists || []).join(" · "))}</small><small>Medical/labs: ${escapeHtml((facility.diagnostics || []).join(" · "))}</small><small>Medicines: ${escapeHtml((facility.medicines || []).map((item) => `${item.name} (${item.status})`).join(" · "))} · Registered demo availability</small></div><button class="outline-button small" type="button" data-care-request="${escapeHtml(facility.id)}">Request visit</button></article>`).join("")
      : "<div class=\"empty-records\"><strong>No matching demo services</strong><span>Try another category.</span></div>";
    careDirectory.querySelectorAll("[data-care-request]").forEach((button) => button.addEventListener("click", () => {
      const facility = careFacilities.find((item) => item.id === button.dataset.careRequest);
      showToast(`Visit request started for ${facility?.name || "this facility"}`);
    }));
  } catch (error) {
    if (careMapStatus) careMapStatus.textContent = "Map is ready, but registered facilities could not be loaded. Start the MANA-SEHAT API to show live markers.";
    careDirectory.innerHTML = `<div class="empty-records"><strong>Nearby care is unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}
careFilters.forEach((button) => button.addEventListener("click", () => {
  careFilters.forEach((item) => item.classList.toggle("active", item === button));
  loadCareDirectory(button.dataset.careFilter);
}));
if (careDirectory) careRefreshTimer = setInterval(() => {
  if (document.querySelector("#find-care.view.active")) loadCareDirectory(document.querySelector("[data-care-filter].active")?.dataset.careFilter || "all");
}, 30000);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}
