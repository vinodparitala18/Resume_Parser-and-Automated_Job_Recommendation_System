/**
 * SkillSync — main.js
 * Homepage: file upload, JD input, analyze, save to store, redirect.
 */

const API_BASES = getApiBases();

// ── DOM refs ───────────────────────────────────────────────────
const resumeInput   = document.getElementById("resume-file");
const dropZone      = document.getElementById("drop-zone");
const fileConfirmed = document.getElementById("file-confirmed");
const fileConfName  = document.getElementById("file-conf-name");
const fileConfSize  = document.getElementById("file-conf-size");
const fileRemove    = document.getElementById("file-remove");
const jdInput       = document.getElementById("jd-input");
const charCount     = document.getElementById("char-count");
const clearJd       = document.getElementById("clear-jd");
const analyzeBtn    = document.getElementById("analyze-btn");
const loadingWrap   = document.getElementById("loading-wrap");
const errorWrap     = document.getElementById("error-wrap");
const errorMsg      = document.getElementById("error-msg");
const errorClose    = document.getElementById("error-close");
const mobileToggle  = document.getElementById("mobile-toggle");
const mobileMenu    = document.getElementById("mobile-menu");
const navbar        = document.getElementById("navbar");

let selectedFile = null;
let isOpeningDialog = false;

// ── Navbar scroll shadow ────────────────────────────────────────
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 8);
});

// ── Mobile menu ─────────────────────────────────────────────────
mobileToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

// ── Hero particles ──────────────────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  const colors = ["#C17B4E", "#D4A0A0", "#5A8C6B", "#4A7FA5", "#F0D8D0"];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 10 + 4;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      --dur:${4 + Math.random() * 6}s;
      --delay:${Math.random() * 4}s;
    `;
    container.appendChild(p);
  }
})();

// ── Intersection observer for [data-animate] ────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in-view");
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));

// ── File Upload ─────────────────────────────────────────────────
resumeInput.addEventListener("change", () => {
  if (resumeInput.files[0]) handleFile(resumeInput.files[0]);
});

dropZone.addEventListener("click", () => {
  if (isOpeningDialog) return;
  isOpeningDialog = true;
  resumeInput.click();
  setTimeout(() => isOpeningDialog = false, 1000);
});

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  const allowed = [".pdf", ".docx", ".doc", ".txt"];
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showError("Please upload a PDF, DOCX, or TXT file.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError("File size exceeds 10 MB limit.");
    return;
  }
  selectedFile = file;
  fileConfName.textContent = file.name;
  fileConfSize.textContent = formatBytes(file.size);
  fileConfirmed.classList.remove("hidden");
  dropZone.style.display = "none";
  hideError();
}

fileRemove.addEventListener("click", () => {
  selectedFile = null;
  resumeInput.value = "";
  fileConfirmed.classList.add("hidden");
  dropZone.style.display = "";
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ── JD input ────────────────────────────────────────────────────
jdInput.addEventListener("input", () => {
  const n = jdInput.value.length;
  charCount.textContent = n.toLocaleString() + " character" + (n !== 1 ? "s" : "");
});

clearJd.addEventListener("click", () => {
  jdInput.value = "";
  charCount.textContent = "0 characters";
});

// ── Loading stepper ─────────────────────────────────────────────
const stepIds = ["ls-1","ls-2","ls-3","ls-4","ls-5"];
let stepTimer = null;

function startSteps() {
  let idx = 0;
  stepIds.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove("active","done");
  });
  document.getElementById(stepIds[0]).classList.add("active");

  stepTimer = setInterval(() => {
    if (idx < stepIds.length - 1) {
      document.getElementById(stepIds[idx]).classList.remove("active");
      document.getElementById(stepIds[idx]).classList.add("done");
      idx++;
      document.getElementById(stepIds[idx]).classList.add("active");
    }
  }, 600);
}

function stopSteps() {
  clearInterval(stepTimer);
  stepIds.forEach(id => {
    document.getElementById(id).classList.remove("active");
    document.getElementById(id).classList.add("done");
  });
}

// ── Analyze ──────────────────────────────────────────────────────
analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  hideError();

  if (!selectedFile) {
    showError("Please upload your resume first.");
    return;
  }
  if (!jdInput.value.trim()) {
    showError("Please paste a job description.");
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.querySelector(".analyze-btn-text").textContent = "Analyzing…";
  loadingWrap.classList.remove("hidden");
  startSteps();

  try {
    const form = new FormData();
    form.append("resume", selectedFile);
    form.append("jd", jdInput.value.trim());

    const res = await fetchApi("/analyze", { method: "POST", body: form });

    stopSteps();

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();

    console.log('API response received:', data);

    // Save to shared store
    Store.save(data);
    console.log('Data saved to store');

    // Hide loading and redirect with small delay to ensure data is saved
    loadingWrap.classList.add("hidden");
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector(".analyze-btn-text").textContent = "Redirecting…";
    
    console.log('Redirecting to results.html...');
    setTimeout(() => {
      window.location.href = "results.html";
    }, 100);

  } catch (err) {
    stopSteps();
    loadingWrap.classList.add("hidden");
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector(".analyze-btn-text").textContent = "Analyze Match";
    showError(err.message || "Analysis failed. Is the backend running on port 8000?");
  }
}

// ── Error helpers ────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorWrap.classList.remove("hidden");
}
function hideError() {
  errorWrap.classList.add("hidden");
}
errorClose.addEventListener("click", hideError);

function getApiBases() {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname;
  const bases = [];

  if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
    bases.push(`${protocol}//${hostname}:8000`);
  }
  bases.push(`${protocol}//localhost:8000`);
  bases.push(`${protocol}//127.0.0.1:8000`);

  return [...new Set(bases)];
}

async function fetchApi(path, options) {
  let lastError = null;

  for (const base of API_BASES) {
    try {
      return await fetch(`${base}${path}`, options);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Unable to reach the backend on port 8000. Make sure the API server is running with 'python main.py' or './start.sh'. ${lastError?.message || ""}`);
}
