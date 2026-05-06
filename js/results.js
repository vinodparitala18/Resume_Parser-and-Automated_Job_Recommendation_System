/**
 * SkillSync — results.js
 * Results page: score ring, breakdown, skills, missing skills + courses.
 */

const API_BASES = getApiBases();

// ── Navbar scroll + mobile ──────────────────────────────────────
document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 8);
});
document.getElementById("mobile-toggle").addEventListener("click", () => {
  document.getElementById("mobile-menu").classList.toggle("hidden");
});

// ── Intersection observer ───────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in-view"); observer.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));

// ── Load data ───────────────────────────────────────────────────
const data = Store.load();
console.log('Loaded data from store:', data);

if (!data) {
  console.log('No data found, showing no-data-wrap');
  document.getElementById("no-data-wrap").classList.remove("hidden");
} else {
  console.log('Data found, initializing page');
  document.getElementById("page-content").classList.remove("hidden");
  init(data);
}

function init(d) {
  const match = d.match || {};
  const score = match.final_score || 0;

  // Score ring animation
  renderRing(score);

  // Steps breakdown
  renderSteps(match);

  // Skills
  renderChips("r-hard-chips",   d.resume_skills?.hard || [], "chip-hard",    "None detected");
  renderChips("r-soft-chips",   d.resume_skills?.soft || [], "chip-soft",    "None detected");
  renderChips("jd-hard-chips",  d.jd_skills?.hard     || [], "chip-jd",      "None in JD");
  renderChips("jd-soft-chips",  d.jd_skills?.soft     || [], "chip-soft",    "None in JD");
  renderChips("matched-chips",  [...(match.matched_hard || []), ...(match.matched_soft || [])], "chip-matched", "No matches yet");
  renderChips("missing-chips-top", [...(match.missing_skills || []).slice(0,6).map(m => m.skill)], "chip-missing", "No missing skills");

  // Missing skills full section
  renderMissing(match.missing_skills || []);

  // PDF download
  document.getElementById("download-pdf-btn").addEventListener("click", downloadPDF);

  // Stagger animate cards after short delay
  setTimeout(() => animateStagger(), 200);
}

// ── Score Ring ──────────────────────────────────────────────────
function renderRing(score) {
  const circumference = 2 * Math.PI * 85; // r=85 → ~534
  const ring = document.getElementById("ring-progress");
  const scoreEl = document.getElementById("ring-score");
  const labelEl = document.getElementById("ring-label");

  // Color by score
  const scoreColor = score >= 80 ? "#5A8C6B" : score >= 60 ? "#C17B4E" : "#C0392B";
  ring.style.stroke = scoreColor;

  const verdict = score >= 80 ? "Excellent ✓" : score >= 60 ? "Good Fit" : "Needs Work";
  labelEl.textContent = verdict;

  // Animate ring fill
  setTimeout(() => {
    const offset = circumference - (score / 100) * circumference;
    ring.style.strokeDashoffset = offset;
  }, 300);

  // Animate counter
  animateCounter(scoreEl, score, "%");
}

// ── Steps breakdown ─────────────────────────────────────────────
function renderSteps(match) {
  const steps = match.steps || {};
  const grid = document.getElementById("steps-grid");
  grid.innerHTML = `
    <div class="step-card anim-scale-in" style="animation-delay:.1s">
      <div class="step-num">Step 1 · Semantic Analysis</div>
      <div class="step-val">${(steps.step1_semantic || 0).toFixed(1)}%</div>
      <div class="step-desc">SentenceTransformer embedding similarity between resume and JD</div>
    </div>
    <div class="step-card anim-scale-in" style="animation-delay:.2s">
      <div class="step-num">Step 2 · Skill Matching</div>
      <div class="step-val">${(steps.step2_skill_match || 0).toFixed(1)}%</div>
      <div class="step-desc">Weighted hard + soft skill overlap against the JD</div>
    </div>
    <div class="step-card anim-scale-in" style="animation-delay:.3s">
      <div class="step-num">Step 3 · Experience Relevance</div>
      <div class="step-val">${(steps.step3_experience || 0).toFixed(1)}%</div>
      <div class="step-desc">Resume experience/project text relevance to the JD</div>
    </div>
  `;
}

// ── Chip Cloud ──────────────────────────────────────────────────
function renderChips(containerId, skills, cls, emptyText) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!skills || skills.length === 0) {
    el.innerHTML = `<span class="chip chip-empty">${esc(emptyText)}</span>`;
    return;
  }
  el.innerHTML = skills.map((s, i) =>
    `<span class="chip ${cls} stagger-child" style="transition-delay:${i * 0.04}s">${esc(s)}</span>`
  ).join("");
}

// ── Missing Skills + Courses ────────────────────────────────────
function renderMissing(missing) {
  const section = document.getElementById("missing-section");
  const grid = document.getElementById("missing-grid");

  if (!missing || missing.length === 0) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  grid.innerHTML = missing.map((item, i) => {
    const courses = item.courses || [];
    const coursesHtml = courses.length > 0
      ? courses.map(c => {
          const platLower = (c.platform || "").toLowerCase();
          const platCls = platLower.includes("udemy") ? "plat-udemy"
            : platLower.includes("coursera") ? "plat-coursera"
            : platLower.includes("deeplearning") ? "plat-deeplearning"
            : "plat-default";
          return `
            <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" class="course-item">
              <span class="course-plat ${platCls}">${esc(c.platform)}</span>
              <div class="course-info">
                <div class="course-name">${esc(c.title)}</div>
                <div class="course-meta">${esc(c.duration || "")}${c.level ? " · " + esc(c.level) : ""}</div>
              </div>
            </a>`;
        }).join("")
      : `<p class="no-course">
          Search on <a href="https://www.udemy.com/courses/search/?q=${encodeURIComponent(item.skill)}" target="_blank">Udemy</a>
          or <a href="https://www.coursera.org/search?query=${encodeURIComponent(item.skill)}" target="_blank">Coursera</a>
        </p>`;

    return `
      <div class="missing-card stagger-child" style="transition-delay:${i * 0.06}s">
        <div class="missing-skill-name">${esc(item.skill)}</div>
        <span class="missing-type-badge">${esc(item.type || "Skill")}</span>
        <div class="course-list">${coursesHtml}</div>
      </div>`;
  }).join("");
}

// ── Stagger animate visible elements ────────────────────────────
function animateStagger() {
  document.querySelectorAll(".stagger-child").forEach((el, i) => {
    setTimeout(() => el.classList.add("visible"), i * 40);
  });
}

// ── PDF Download ─────────────────────────────────────────────────
async function downloadPDF() {
  const btn = document.getElementById("download-pdf-btn");
  btn.textContent = "⏳ Generating…";
  btn.disabled = true;
  try {
    const res = await fetchApi("/download-report");
    if (!res.ok) {
      let errorMsg = "PDF generation failed";
      try {
        errorMsg = await res.text();
      } catch {}
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillsync_report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("PDF download failed: " + err.message);
  } finally {
    btn.textContent = "⬇ PDF Report";
    btn.disabled = false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function animateCounter(el, target, suffix = "") {
  let cur = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = Math.round(cur) + suffix;
    if (cur >= target) clearInterval(timer);
  }, 18);
}

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

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
