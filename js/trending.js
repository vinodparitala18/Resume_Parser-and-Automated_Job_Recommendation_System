/**
 * SkillSync — trending.js
 * Trending page: personalised + general trending skills with animated cards.
 */

const API = "http://localhost:8000";

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

// ── General trending (always shown) ──────────────────────────────
const generalItems = [
  {skill:"Agentic AI & LLM Agents",trend:"Explosive",demand:"+400% YoY",description:"Autonomous AI agents that plan, reason, and take actions to complete complex tasks.",course:"https://www.deeplearning.ai/short-courses/ai-agents-in-langgraph/",platform:"DeepLearning.AI",based_on:"General"},
  {skill:"Prompt Engineering",trend:"Explosive",demand:"+350% YoY",description:"Design and optimise prompts for LLMs in production applications.",course:"https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/",platform:"DeepLearning.AI",based_on:"General"},
  {skill:"RAG Systems",trend:"Explosive",demand:"+290% YoY",description:"Retrieval-Augmented Generation combining vector search with generative AI.",course:"https://www.deeplearning.ai/short-courses/building-evaluating-advanced-rag/",platform:"DeepLearning.AI",based_on:"General"},
  {skill:"LLM Fine-tuning",trend:"Explosive",demand:"+240% YoY",description:"Customise large language models for domain-specific tasks and datasets.",course:"https://www.coursera.org/learn/generative-ai-with-llms",platform:"Coursera",based_on:"General"},
  {skill:"Vector Databases",trend:"Explosive",demand:"+290% YoY",description:"Pinecone, Weaviate, ChromaDB — powering semantic search and AI memory.",course:"https://www.udemy.com/course/vector-database-and-semantic-search/",platform:"Udemy",based_on:"General"},
  {skill:"Polars",trend:"Explosive",demand:"+220% YoY",description:"Rust-based DataFrame library — up to 10× faster than Pandas for large datasets.",course:"https://www.udemy.com/course/polars-course/",platform:"Udemy",based_on:"General"},
  {skill:"DuckDB",trend:"Explosive",demand:"+230% YoY",description:"In-process OLAP database for fast local data analysis without a server.",course:"https://www.udemy.com/course/duckdb-bootcamp/",platform:"Udemy",based_on:"General"},
  {skill:"GitOps with ArgoCD",trend:"Rising",demand:"+190% YoY",description:"Git-driven automated Kubernetes deployments for zero-downtime pipelines.",course:"https://www.udemy.com/course/gitops-with-argocd/",platform:"Udemy",based_on:"General"},
  {skill:"AWS Bedrock",trend:"Explosive",demand:"+400% YoY",description:"Managed foundation models on AWS — easiest path to GenAI in the cloud.",course:"https://www.udemy.com/course/amazon-bedrock/",platform:"Udemy",based_on:"General"},
  {skill:"Zero Trust Security",trend:"Explosive",demand:"+210% YoY",description:"Never trust, always verify — the modern security architecture standard.",course:"https://www.coursera.org/learn/zero-trust-security",platform:"Coursera",based_on:"General"},
  {skill:"Diffusion Models",trend:"Explosive",demand:"+310% YoY",description:"Generative models for images, audio and video synthesis — DALL·E, Stable Diffusion.",course:"https://www.deeplearning.ai/short-courses/how-diffusion-models-work/",platform:"DeepLearning.AI",based_on:"General"},
  {skill:"dbt Core",trend:"Rising",demand:"+145% YoY",description:"Transform and test data in your warehouse using SQL and software engineering practices.",course:"https://www.udemy.com/course/complete-dbt-data-build-tool-bootcamp-zero-to-hero-learn-dbt/",platform:"Udemy",based_on:"General"},
];

renderGrid("general-grid", generalItems);

// ── Personalised trending (if analysis done) ──────────────────────
const stored = Store.load();
const personalSection = document.getElementById("personalised-section");
const personalSub = document.getElementById("personalised-sub");

if (stored && stored.trending && stored.trending.length > 0) {
  personalSection.classList.remove("hidden");
  const skills = stored.resume_skills?.hard || [];
  if (skills.length > 0) {
    personalSub.textContent = `Based on your skills: ${skills.slice(0, 5).join(", ")}${skills.length > 5 ? "…" : ""}`;
  }
  renderGrid("personalised-grid", stored.trending);
} else {
  personalSection.classList.add("hidden");
}

// ── Render grid ──────────────────────────────────────────────────
function renderGrid(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el || !items || items.length === 0) return;

  el.innerHTML = items.map((item, i) => {
    const trendLower = (item.trend || "").toLowerCase();
    const badgeCls = trendLower.includes("explosive") ? "badge-explosive"
      : trendLower.includes("rising") ? "badge-rising" : "badge-growing";
    const badgeLabel = trendLower.includes("explosive") ? "🔥 Explosive"
      : trendLower.includes("rising") ? "📈 Rising" : "🌱 Growing";

    return `
      <div class="trending-card stagger-child" style="transition-delay:${i * 0.05}s">
        <div class="t-top">
          <div class="t-name">${esc(item.skill)}</div>
          <span class="t-badge ${badgeCls}">${badgeLabel}</span>
        </div>
        <div class="t-desc">${esc(item.description || "")}</div>
        <div class="t-demand">↑ ${esc(item.demand || "")}</div>
        ${item.based_on && item.based_on !== "General"
          ? `<div class="t-based">Based on your: <strong>${esc(item.based_on)}</strong></div>`
          : ""}
        ${item.course
          ? `<a href="${esc(item.course)}" target="_blank" rel="noopener noreferrer" class="t-link">
              Learn on ${esc(item.platform || "course")} →
             </a>`
          : ""}
      </div>`;
  }).join("");

  // Stagger animate
  setTimeout(() => {
    el.querySelectorAll(".stagger-child").forEach((card, i) => {
      setTimeout(() => card.classList.add("visible"), i * 60);
    });
  }, 200);
}

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
