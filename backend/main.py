"""
SkillSync FastAPI Backend v2
Step 1: Semantic similarity via SentenceTransformer
Step 2: Weighted skill overlap score
Step 3: Experience/project relevance
  Final Score = 0.5 * Semantic Similarity + 0.3 * Skill Match + 0.2 * Experience Relevance
"""
import sys, os, traceback, json
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from nlp_engine import (
    extract_skills, compute_match_score,
    rank_suitable_roles, get_trending_skills, get_roadmap,
)

app = FastAPI(title="SkillSync API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# API Routes
CACHE_FILE = "analysis_cache.json"

def load_cache():
    global _cache
    try:
        with open(CACHE_FILE, "r") as f:
            _cache = json.load(f)
    except FileNotFoundError:
        _cache = {}

def save_cache():
    with open(CACHE_FILE, "w") as f:
        json.dump(_cache, f)

# Load cache on startup
load_cache()

class RoadmapRequest(BaseModel):
    role: str

class TrendingRequest(BaseModel):
    skills: list[str]

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/analyze")
async def analyze(resume: UploadFile = File(...), jd: str = Form(...)):
    try:
        from extractor import extract_resume_text

        file_bytes = await resume.read()
        if not file_bytes:
            raise HTTPException(400, "Uploaded resume is empty.")
        resume_text = extract_resume_text(resume.filename or "resume.pdf", file_bytes)
        if not resume_text.strip():
            raise HTTPException(400, "Could not extract text. Use PDF, DOCX or TXT.")
        jd_text = jd.strip()
        if not jd_text:
            raise HTTPException(400, "Job description is empty.")

        resume_skills = extract_skills(resume_text)
        jd_skills = extract_skills(jd_text)
        match_result = compute_match_score(resume_text, jd_text, resume_skills, jd_skills)
        top_roles = rank_suitable_roles(resume_skills)
        trending = get_trending_skills(resume_skills)

        result = {"resume_skills": resume_skills, "jd_skills": jd_skills,
                  "match": match_result, "roles": top_roles, "trending": trending}
        global _cache
        _cache = result
        save_cache()
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Analysis failed: {str(e)}")

@app.post("/roadmap")
async def roadmap(req: RoadmapRequest):
    if not req.role.strip():
        raise HTTPException(400, "Role cannot be empty.")
    return JSONResponse(content=get_roadmap(req.role.strip()))

@app.post("/trending")
async def trending_api(req: TrendingRequest):
    return JSONResponse(content=get_trending_skills({"hard": req.skills, "soft": []}))

@app.get("/download-report")
async def download_report():
    global _cache
    load_cache()
    if not _cache:
        raise HTTPException(404, "No analysis found. Run /analyze first.")
    try:
        from report_gen import generate_pdf_report

        pdf = generate_pdf_report(_cache)
        return Response(content=pdf, media_type="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=skillsync_report.pdf",
                                 "Content-Length": str(len(pdf))})
    except Exception as e:
        import traceback
        error_text = f"PDF Error: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        return Response(content=error_text, media_type="text/plain", status_code=500)

# Mount static files
app.mount("/css", StaticFiles(directory="../css"), name="css")
app.mount("/js", StaticFiles(directory="../js"), name="js")
app.mount("/data", StaticFiles(directory="../data"), name="data")
app.mount("/", StaticFiles(directory="../html", html=True), name="html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
