/**
 * SkillSync — roadmap.js
 * Roadmap page: fetch phase-by-phase career roadmap from API.
 */

const API_BASES = getApiBases();

// ── Navbar ──────────────────────────────────────────────────────
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

// ── DOM refs ─────────────────────────────────────────────────────
const roleInput     = document.getElementById("role-input");
const generateBtn   = document.getElementById("generate-btn");
const loadingEl     = document.getElementById("roadmap-loading");
const contentSec    = document.getElementById("roadmap-content-section");
const roleTitle     = document.getElementById("roadmap-role-title");
const timeline      = document.getElementById("roadmap-timeline");
const quickChips    = document.querySelectorAll(".quick-chip");

// ── Pre-fill from query param (e.g. ?role=Data+Scientist) ───────
const params = new URLSearchParams(window.location.search);
const preRole = params.get("role");
if (preRole) {
  roleInput.value = preRole;
  setTimeout(() => fetchRoadmap(preRole), 300);
} else {
  // Pre-fill from analysis if available
  const stored = Store.load();
  if (stored && stored.roles && stored.roles[0]) {
    roleInput.placeholder = `e.g. ${stored.roles[0].role}`;
  }
}

// ── Quick chip clicks ────────────────────────────────────────────
quickChips.forEach(chip => {
  chip.addEventListener("click", () => {
    const role = chip.dataset.role;
    roleInput.value = role;
    fetchRoadmap(role);
  });
});

// ── Generate button ──────────────────────────────────────────────
generateBtn.addEventListener("click", () => {
  const role = roleInput.value.trim();
  if (!role) { roleInput.focus(); return; }
  fetchRoadmap(role);
});

roleInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const role = roleInput.value.trim();
    if (role) fetchRoadmap(role);
  }
});

// ── Fetch roadmap ────────────────────────────────────────────────
async function fetchRoadmap(role) {
  loadingEl.classList.remove("hidden");
  contentSec.classList.add("hidden");
  timeline.innerHTML = "";

  try {
    const res = await fetchApi("/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    loadingEl.classList.add("hidden");
    renderRoadmap(data);
  } catch (err) {
    const fallback = await loadLocalRoadmap(role);
    if (fallback) {
      loadingEl.classList.add("hidden");
      renderRoadmap(fallback);
      roleTitle.insertAdjacentHTML("beforeend", `<span style="display:block;color:var(--yellow);font-size:0.95rem;margin-top:0.4rem;">Using local roadmap fallback because the backend is unavailable.</span>`);
      return;
    }

    loadingEl.classList.add("hidden");
    timeline.innerHTML = `<p style="color:var(--red);padding:20px">Failed to load roadmap: ${esc(err.message)}. Make sure the backend is running with <code>python main.py</code> or <code>./start.sh</code>.</p>`;
    contentSec.classList.remove("hidden");
  }
}

async function loadLocalRoadmap(role) {
  try {
    const res = await fetch("data/roadmaps.json");
    if (!res.ok) throw new Error(`Local roadmap file not available (${res.status})`);
    const json = await res.json();
    const roadmaps = json.roadmaps || {};
    const matchKey = Object.keys(roadmaps).find(key => key.toLowerCase() === role.toLowerCase());
    if (!matchKey) return null;
    return { role: matchKey, ...roadmaps[matchKey] };
  } catch (err) {
    console.warn("Local roadmap fallback failed:", err);
    return null;
  }
}

// ── Render roadmap ────────────────────────────────────────────────
function renderRoadmap(data) {
  const phases = data.phases || [];
  roleTitle.innerHTML = `Roadmap for <span>${esc(data.role)}</span>`;
  contentSec.classList.remove("hidden");

  // Animate role title
  roleTitle.classList.add("anim-fade-up");

  timeline.innerHTML = phases.map((phase, i) => {
    const skillChips = (phase.skills || [])
      .map(s => `<span class="phase-skill">${esc(s)}</span>`).join("");

    const resources = (phase.resources || [])
      .map(r => `
        <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" class="phase-res">
          <span class="phase-res-name">${esc(r.name)}</span>
          <span class="phase-res-plat">${esc(r.platform)}</span>
        </a>`).join("");

    return `
      <div class="phase-card stagger-child" style="transition-delay:${i * 0.12}s">
        <div class="phase-head">
          <span class="phase-icon-wrap">${esc(phase.icon || "📌")}</span>
          <span class="phase-name">${esc(phase.phase)}</span>
          <span class="phase-dur">${esc(phase.duration || "")}</span>
        </div>
        <div class="phase-skills">${skillChips}</div>
        <div class="phase-resources">${resources}</div>
      </div>`;
  }).join("");

  // Stagger animate phases
  setTimeout(() => {
    document.querySelectorAll(".phase-card").forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), i * 140);
    });
    // Re-observe new elements
    document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
  }, 100);

  contentSec.scrollIntoView({ behavior: "smooth", block: "start" });
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
