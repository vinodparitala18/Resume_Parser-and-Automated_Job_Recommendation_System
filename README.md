   ****Career Intelligence Platform****

Upload your resume · Paste a job description · Get an AI-powered match score with missing skills, course links, role recommendations, and a career roadmap.

What it does
Career Intelligence Platform  analyses your resume against any job description using SentenceTransformer embeddings and cosine similarity. It tells you exactly how well you match, which skills you're missing, what courses to take, and which IT roles suit your profile best.

Features

🎯 Match Score — Weighted AI score using semantic similarity + skill overlap + experience relevance
📚 Missing Skills + Courses — Every gap paired with Udemy & Coursera recommendations
💼 Role Matching — Top-5 IT roles ranked against your skill profile
🗺 Career Roadmap — Phase-by-phase learning path for any IT role
📈 Trending Skills — In-demand skills personalised to your tech stack
📥 PDF Report — Downloadable full analysis report


Scoring Formula
Final Score = 0.5 × Semantic Similarity
            + 0.3 × Skill Match
            + 0.2 × Experience Relevance
All three components use all-MiniLM-L6-v2 (SentenceTransformer) embeddings with cosine similarity for semantic understanding — not keyword matching.

Tech Stack
LayerTechnologyBackendPython, FastAPI, UvicornNLPsentence-transformers (all-MiniLM-L6-v2), scipyResume Parsingpdfplumber, python-docxPDF ReportReportLabFrontendHTML, CSS, Vanilla JavaScript (5 pages)

Project Structure
Career Intelligence Platform/
├── backend/
│   ├── main.py               # FastAPI routes
│   ├── models/
│   │   ├── nlp_engine.py     # SentenceTransformer scoring pipeline
│   │   ├── extractor.py      # PDF / DOCX / TXT text extraction
│   │   └── report_gen.py     # PDF report generator
│   └── data/
│       ├── courses.json      # Skills → course recommendations
│       ├── roles.json        # 25 IT roles with skill requirements
│       ├── roadmaps.json     # Phase-based career roadmaps
│       └── trending.json     # Trending skills by tech category
├── frontend/
│   ├── index.html            # Upload & Analyze
│   ├── pages/
│   │   ├── results.html      # Score + skill comparison
│   │   ├── roles.html        # Role recommendations
│   │   ├── roadmap.html      # Career roadmap
│   │   └── trending.html     # Trending skills
│   ├── css/main.css
│   └── js/                   # store.js, main.js, results.js, roles.js …
├── requirements.txt
└── start.sh

Setup
1. Clone and install
bashgit clone https://github.com/yourusername/skillsync.git
cd skillsync
pip install -r requirements.txt

First run downloads the all-MiniLM-L6-v2 model (~90 MB) and caches it locally.

2. Start
bashchmod +x start.sh && ./start.sh
Or manually:
bash# Terminal 1
cd backend && uvicorn main:app --port 8000 --reload

# Terminal 2
cd frontend && python3 -m http.server 3000
3. Open → http://localhost:3000
API docs → http://localhost:8000/docs

API Endpoints
MethodEndpointDescriptionPOST/analyzeResume file + JD text → full analysis JSONPOST/roadmap{"role": "Data Scientist"} → learning roadmapPOST/trending{"skills": [...]} → trending skillsGET/download-reportDownload PDF of last analysis

Requirements
fastapi
uvicorn
sentence-transformers
scipy
pdfplumber
python-docx
scikit-learn
reportlab
python-multipart
pydantic
