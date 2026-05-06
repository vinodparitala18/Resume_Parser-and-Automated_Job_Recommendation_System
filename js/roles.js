/**
 * SkillSync — roles.js
 * Roles page: render top-5 IT roles with animated match bars.
 */

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

// ── Load data ───────────────────────────────────────────────────
const data = Store.load();

if (!data || !data.roles) {
  document.getElementById("no-data-wrap").classList.remove("hidden");
} else {
  document.getElementById("page-content").classList.remove("hidden");
  renderRoles(data.roles);
}

function renderRoles(roles) {
  const container = document.getElementById("roles-ranked");
  if (!roles || roles.length === 0) {
    container.innerHTML = `<p style="color:var(--brown-lt);font-style:italic">No role data available.</p>`;
    return;
  }

  container.innerHTML = roles.map((role, i) => `
    <a href="roadmap.html?role=${encodeURIComponent(role.role)}" class="role-big-card stagger-child" style="transition-delay:${i * 0.1}s" data-animate="fade-up">
      <div class="role-big-rank">${i + 1}</div>
      <div class="role-big-body">
        <div class="role-big-name">${esc(role.role)}</div>
        <div class="role-big-desc">${esc(role.description || "")}</div>
        <div class="role-big-bar-wrap">
          <div class="role-big-bar-track">
            <div class="role-big-bar-fill" data-width="${role.score}" style="width:0%"></div>
          </div>
          <div class="role-big-pct">${role.score}%</div>
        </div>
        <div class="role-big-tags">
          ${role.avg_salary ? `<span class="role-tag tag-salary">💰 ${esc(role.avg_salary)}</span>` : ""}
          ${role.demand     ? `<span class="role-tag tag-demand">📊 ${esc(role.demand)}</span>` : ""}
          ${role.growth     ? `<span class="role-tag tag-growth">📈 ${esc(role.growth)}</span>` : ""}
        </div>
        ${role.matched_skills && role.matched_skills.length > 0 ? `
          <div class="role-chips-label">Matched Skills</div>
          <div class="role-chips-row">
            ${role.matched_skills.slice(0, 8).map(s => `<span class="role-chip-sm">${esc(s)}</span>`).join("")}
          </div>
        ` : ""}
      </div>
      <div class="role-big-action">
        <span class="btn-primary btn-sm">Roadmap →</span>
        <div style="font-size:.72rem;color:var(--brown-lt);margin-top:4px">View learning path</div>
      </div>
    </a>
  `).join("");

  // Stagger cards in
  setTimeout(() => {
    document.querySelectorAll(".stagger-child").forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), i * 120);
    });
  }, 100);

  // Animate bars after cards appear
  setTimeout(() => {
    document.querySelectorAll(".role-big-bar-fill").forEach(bar => {
      bar.style.width = bar.dataset.width + "%";
    });
  }, 400);
}

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
