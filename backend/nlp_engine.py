"""
SkillSync NLP Engine
Step 1: Semantic similarity via SentenceTransformer
Step 2: Weighted skill overlap score
Step 3: Experience/project relevance
  Final Score = 0.5 × Semantic Similarity + 0.3 × Skill Match + 0.2 × Experience Relevance
"""
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Set
from sentence_transformers import SentenceTransformer

BASE = Path(__file__).parent.parent / "data"

def _load(f): 
    with open(BASE / f, encoding='utf-8') as fp: return json.load(fp)

COURSES_DB  = _load("courses.json")["skill_courses"]
ROLES_DB    = _load("roles.json")["roles"]
ROADMAPS_DB = _load("roadmaps.json")["roadmaps"]
TRENDING_DB = _load("trending.json")["trending_skills"]

# ── Master skill dictionary (100+ hard skills, 25+ soft skills) ───────────
HARD_SKILLS = {
    # Languages
    "python","java","javascript","typescript","c++","c#","go","golang","rust",
    "scala","r","matlab","swift","kotlin","php","ruby","perl","dart","elixir",
    "haskell","lua","assembly","bash","powershell","groovy","julia",
    # ML / AI
    "machine learning","deep learning","neural networks","nlp",
    "natural language processing","computer vision","reinforcement learning",
    "tensorflow","pytorch","keras","scikit-learn","sklearn","xgboost",
    "lightgbm","catboost","hugging face","transformers","bert","gpt","llm",
    "llms","langchain","rag","diffusion models","stable diffusion","mlops",
    "feature engineering","model deployment","model serving","fine-tuning",
    "transfer learning","federated learning","automl","hyperparameter tuning",
    "mlflow","wandb","dvc","kubeflow","vertex ai","sagemaker","azure ml",
    "opencv","spacy","nltk","gensim","sentence transformers","clip","whisper",
    "prompt engineering","agentic ai","vector databases","pinecone","chromadb",
    # Data
    "pandas","numpy","matplotlib","seaborn","plotly","tableau","power bi",
    "data analysis","data visualization","exploratory data analysis","eda",
    "statistics","statistical analysis","hypothesis testing","a/b testing",
    "polars","dask","vaex","streamlit","dash","bokeh","altair","d3",
    # Databases
    "sql","postgresql","mysql","mongodb","redis","elasticsearch","cassandra",
    "dynamodb","sqlite","oracle","neo4j","clickhouse","duckdb","mariadb",
    "couchdb","influxdb","timescaledb","firestore","supabase","planetscale",
    # Big Data
    "apache spark","spark","hadoop","kafka","airflow","dbt","hive","presto",
    "flink","databricks","snowflake","redshift","bigquery","delta lake",
    "data lakehouse","data warehouse","data warehousing","etl","elt",
    "data pipeline","data lake","data mesh","data governance","apache beam",
    # Cloud
    "aws","azure","gcp","google cloud","amazon web services","ec2","s3",
    "lambda","sagemaker","eks","ecs","rds","cloudformation","azure devops",
    "azure kubernetes","google kubernetes engine","gke","cloud run","cloud functions",
    "terraform","pulumi","cdk","serverless","iaas","paas","saas","faas",
    # DevOps
    "docker","kubernetes","k8s","ansible","jenkins","github actions","gitlab ci",
    "circleci","helm","argocd","gitops","ci/cd","devops","mlops","devsecops",
    "nginx","apache","load balancing","service mesh","istio","linkerd",
    # Web
    "react","next.js","vue","vue.js","angular","node.js","fastapi","django",
    "flask","express","graphql","rest api","restful","grpc","websocket",
    "spring boot","laravel","rails","ruby on rails","asp.net","svelte","remix",
    "nuxt","gatsby","astro","htmx","tailwind","bootstrap","sass","css","html",
    "html5","css3","jquery","ajax","json","xml","dom","responsive design",
    "full stack","fullstack","frontend","backend","web development","api development",
    # Mobile
    "flutter","react native","ios development","android development","swift ui",
    "jetpack compose","xamarin","ionic","capacitor","expo",
    # Tools & Practices
    "git","github","gitlab","jira","confluence","postman","swagger",
    "linux","bash","shell scripting","microservices","system design",
    "data structures","algorithms","object-oriented programming","oop",
    "functional programming","api development","web scraping","tdd","bdd",
    "clean code","design patterns","domain driven design","ddd","cqrs","event sourcing",
    # Security
    "cybersecurity","penetration testing","network security","cryptography",
    "oauth","jwt","ssl","tls","firewalls","siem","soc","zero trust",
    "owasp","vulnerability assessment","ethical hacking","burp suite","kali linux",
    # Blockchain / Web3
    "blockchain","solidity","ethereum","web3","smart contracts","defi",
    "nft","ipfs","hardhat","truffle","foundry",
    # Game Dev
    "unity","unreal engine","game development","3d modeling","opengl","vulkan",
    # Observability
    "prometheus","grafana","elk stack","datadog","new relic","jaeger","opentelemetry",
    "splunk","dynatrace","kibana","logstash","monitoring","observability",
    # Other
    "websockets","rabbitmq","celery","pydantic","fastapi","poetry","pyenv",
    "jupyter","colab","databricks","snowpark","streamlit","gradio",
}

SOFT_SKILLS = {
    "communication","leadership","teamwork","collaboration","problem solving",
    "critical thinking","analytical thinking","time management","adaptability",
    "creativity","innovation","attention to detail","project management",
    "agile","scrum","kanban","presentation","mentoring","coaching",
    "stakeholder management","decision making","conflict resolution",
    "multitasking","self-motivated","self-learning","curiosity","research",
    "organizational skills","interpersonal skills","work ethic","ownership",
    "accountability","empathy","active listening","negotiation",
    "stress management","strategic thinking","data-driven","customer focus",
    "storytelling","cross-functional","remote work","async communication",
}

# Canonical display names
CAP = {
    "python":"Python","java":"Java","javascript":"JavaScript","typescript":"TypeScript",
    "c++":"C++","c#":"C#","go":"Go","golang":"Go","rust":"Rust","scala":"Scala",
    "r":"R","swift":"Swift","kotlin":"Kotlin","php":"PHP","ruby":"Ruby","dart":"Dart",
    "machine learning":"Machine Learning","deep learning":"Deep Learning","nlp":"NLP",
    "natural language processing":"NLP","computer vision":"Computer Vision",
    "tensorflow":"TensorFlow","pytorch":"PyTorch","keras":"Keras",
    "scikit-learn":"Scikit-Learn","sklearn":"Scikit-Learn","xgboost":"XGBoost",
    "lightgbm":"LightGBM","catboost":"CatBoost","hugging face":"Hugging Face",
    "transformers":"Transformers","bert":"BERT","gpt":"GPT","llm":"LLMs","llms":"LLMs",
    "langchain":"LangChain","rag":"RAG","diffusion models":"Diffusion Models",
    "mlops":"MLOps","feature engineering":"Feature Engineering",
    "model deployment":"Model Deployment","fine-tuning":"Fine-Tuning",
    "transfer learning":"Transfer Learning","mlflow":"MLflow",
    "prompt engineering":"Prompt Engineering","agentic ai":"Agentic AI",
    "vector databases":"Vector Databases","pinecone":"Pinecone","chromadb":"ChromaDB",
    "pandas":"Pandas","numpy":"NumPy","matplotlib":"Matplotlib","seaborn":"Seaborn",
    "plotly":"Plotly","tableau":"Tableau","power bi":"Power BI","polars":"Polars",
    "streamlit":"Streamlit","data analysis":"Data Analysis",
    "data visualization":"Data Visualization","statistics":"Statistics",
    "sql":"SQL","postgresql":"PostgreSQL","mysql":"MySQL","mongodb":"MongoDB",
    "redis":"Redis","elasticsearch":"Elasticsearch","cassandra":"Cassandra",
    "dynamodb":"DynamoDB","neo4j":"Neo4j","clickhouse":"ClickHouse","duckdb":"DuckDB",
    "apache spark":"Apache Spark","spark":"Apache Spark","hadoop":"Hadoop",
    "kafka":"Kafka","airflow":"Airflow","dbt":"dbt","snowflake":"Snowflake",
    "redshift":"Redshift","bigquery":"BigQuery","data warehousing":"Data Warehousing",
    "etl":"ETL","elt":"ELT","data pipeline":"Data Pipelines","databricks":"Databricks",
    "aws":"AWS","azure":"Azure","gcp":"GCP","google cloud":"GCP",
    "terraform":"Terraform","pulumi":"Pulumi","serverless":"Serverless",
    "docker":"Docker","kubernetes":"Kubernetes","k8s":"Kubernetes",
    "ansible":"Ansible","jenkins":"Jenkins","github actions":"GitHub Actions",
    "gitlab ci":"GitLab CI","helm":"Helm","argocd":"ArgoCD","gitops":"GitOps",
    "ci/cd":"CI/CD","devops":"DevOps","devsecops":"DevSecOps",
    "react":"React","next.js":"Next.js","vue":"Vue.js","vue.js":"Vue.js",
    "angular":"Angular","node.js":"Node.js","fastapi":"FastAPI","django":"Django",
    "flask":"Flask","express":"Express.js","graphql":"GraphQL","rest api":"REST APIs",
    "restful":"REST APIs","grpc":"gRPC","spring boot":"Spring Boot",
    "flutter":"Flutter","react native":"React Native","ios development":"iOS Dev",
    "android development":"Android Dev",
    "git":"Git","github":"GitHub","linux":"Linux","microservices":"Microservices",
    "system design":"System Design","oop":"OOP",
    "object-oriented programming":"OOP","algorithms":"Algorithms",
    "data structures":"Data Structures","tdd":"TDD","clean code":"Clean Code",
    "cybersecurity":"Cybersecurity","penetration testing":"Penetration Testing",
    "network security":"Network Security","oauth":"OAuth","jwt":"JWT",
    "blockchain":"Blockchain","solidity":"Solidity","ethereum":"Ethereum",
    "unity":"Unity","unreal engine":"Unreal Engine",
    "prometheus":"Prometheus","grafana":"Grafana","datadog":"Datadog",
    "elk stack":"ELK Stack","opentelemetry":"OpenTelemetry",
    "rabbitmq":"RabbitMQ","celery":"Celery","pydantic":"Pydantic",
    "communication":"Communication","leadership":"Leadership","teamwork":"Teamwork",
    "collaboration":"Collaboration","problem solving":"Problem Solving",
    "critical thinking":"Critical Thinking","agile":"Agile","scrum":"Scrum",
    "time management":"Time Management","creativity":"Creativity",
    "attention to detail":"Attention to Detail","project management":"Project Management",
    "research":"Research","mentoring":"Mentoring","ownership":"Ownership",
    "analytical thinking":"Analytical Thinking","adaptability":"Adaptability",
    "storytelling":"Storytelling","curiosity":"Curiosity","empathy":"Empathy",
    "sagemaker":"AWS SageMaker","vertex ai":"Vertex AI","azure ml":"Azure ML",
    "spacy":"spaCy","nltk":"NLTK","gensim":"Gensim","opencv":"OpenCV",
    "kali linux":"Kali Linux","burp suite":"Burp Suite","owasp":"OWASP",
    "zero trust":"Zero Trust","siem":"SIEM","prometheus":"Prometheus",
    "grafana":"Grafana","splunk":"Splunk","kibana":"Kibana","logstash":"Logstash",
    "istio":"Istio","linkerd":"Linkerd","nginx":"Nginx","apache":"Apache",
}


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s\+\#\/\.\-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> List[str]:
    return [token for token in _normalize(text).split() if token]


def _cosine_similarity(text_a: str, text_b: str) -> float:
    tokens_a = Counter(_tokenize(text_a))
    tokens_b = Counter(_tokenize(text_b))
    if not tokens_a or not tokens_b:
        return 0.0

    shared = set(tokens_a) & set(tokens_b)
    numerator = sum(tokens_a[token] * tokens_b[token] for token in shared)
    norm_a = math.sqrt(sum(count * count for count in tokens_a.values()))
    norm_b = math.sqrt(sum(count * count for count in tokens_b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return numerator / (norm_a * norm_b)


_EMBEDDING_MODEL = None
_EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
_EXPERIENCE_HEADINGS = [
    "professional experience", "work experience", "experience", "project", "projects",
    "portfolio", "research experience", "internship", "employment", "career history",
    "technical experience", "project experience", "side projects"
]

def _load_embedding_model() -> SentenceTransformer:
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        _EMBEDDING_MODEL = SentenceTransformer(_EMBEDDING_MODEL_NAME)
    return _EMBEDDING_MODEL


def _embed_texts(texts: List[str]):
    model = _load_embedding_model()
    return model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)


def _semantic_similarity(text_a: str, text_b: str) -> float:
    if not text_a.strip() or not text_b.strip():
        return 0.0
    try:
        emb_a, emb_b = _embed_texts([text_a, text_b])
        return float(emb_a.dot(emb_b))
    except Exception:
        return 0.0


def _normalize_skill_map(skills: List[str]) -> Dict[str, str]:
    return {skill.lower().strip(): skill.strip() for skill in skills if skill and skill.strip()}


def _extract_relevant_resume_text(resume_text: str) -> str:
    normalized_resume = resume_text.strip()
    if not normalized_resume:
        return ""

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", normalized_resume) if p.strip()]
    matched_sections = [p for p in paragraphs if any(h in p.lower() for h in _EXPERIENCE_HEADINGS)]
    if matched_sections:
        return "\n\n".join(matched_sections)

    return "\n\n".join(paragraphs[:5]) if paragraphs else normalized_resume


def extract_skills(text: str) -> Dict[str, List[str]]:
    norm = _normalize(text)
    found_hard: Set[str] = set()
    found_soft: Set[str] = set()
    all_skills = sorted(HARD_SKILLS | SOFT_SKILLS, key=lambda s: -len(s.split()))
    for skill in all_skills:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, norm):
            if skill in HARD_SKILLS:
                found_hard.add(skill)
            else:
                found_soft.add(skill)

    def cap(skills_set):
        result, seen = [], set()
        for s in skills_set:
            c = CAP.get(s, s.title())
            if c not in seen:
                seen.add(c); result.append(c)
        return sorted(result)

    return {"hard": cap(found_hard), "soft": cap(found_soft)}


def compute_match_score(
    resume_text: str, jd_text: str,
    resume_skills: Dict, jd_skills: Dict
) -> Dict:
    """
    Step 1: Semantic similarity via SentenceTransformer
    Step 2: Weighted skill overlap score
    Step 3: Experience/project relevance
      Final Score = 0.5 * Semantic Similarity + 0.3 * Skill Match + 0.2 * Experience Relevance
    """
    # ── Step 1: Semantic similarity ──────────────────────────────────────────
    semantic_score = round(_semantic_similarity(resume_text, jd_text) * 100, 1)

    # ── Step 2: Weighted skill overlap score ────────────────────────────────
    resume_hard_map = _normalize_skill_map(resume_skills.get("hard", []))
    resume_soft_map = _normalize_skill_map(resume_skills.get("soft", []))
    jd_hard_map = _normalize_skill_map(jd_skills.get("hard", []))
    jd_soft_map = _normalize_skill_map(jd_skills.get("soft", []))

    matched_hard_keys = set(resume_hard_map) & set(jd_hard_map)
    matched_soft_keys = set(resume_soft_map) & set(jd_soft_map)
    matched_hard = sorted(resume_hard_map[key] for key in matched_hard_keys)
    matched_soft = sorted(resume_soft_map[key] for key in matched_soft_keys)

    hard_pct = (len(matched_hard_keys) / len(jd_hard_map)) if jd_hard_map else 1.0
    soft_pct = (len(matched_soft_keys) / len(jd_soft_map)) if jd_soft_map else 1.0
    skill_match_pct = min(100.0, round((hard_pct * 0.65 + soft_pct * 0.35) * 100, 1))
    hard_skill_match = round(hard_pct * 100, 1)
    soft_skill_match = round(soft_pct * 100, 1)

    all_jd_keys = set(jd_hard_map) | set(jd_soft_map)
    missing_hard_keys = set(jd_hard_map) - set(resume_hard_map)
    missing_soft_keys = set(jd_soft_map) - set(resume_soft_map)

    # ── Step 3: Experience / Project relevance ─────────────────────────────
    experience_text = _extract_relevant_resume_text(resume_text)
    experience_relevance = round(_semantic_similarity(experience_text, jd_text) * 100, 1)

    # ── Step 4: Weighted final score ────────────────────────────────────────
    final_score = min(round(0.5 * semantic_score + 0.3 * skill_match_pct + 0.2 * experience_relevance, 1), 100.0)

    missing_items = []
    for key in sorted(missing_hard_keys):
        skill = jd_hard_map[key]
        courses = _get_courses(skill)
        missing_items.append({"skill": skill, "type": "Hard Skill", "courses": courses})
    for key in sorted(missing_soft_keys):
        skill = jd_soft_map[key]
        courses = _get_courses(skill)
        missing_items.append({"skill": skill, "type": "Soft Skill", "courses": courses})

    return {
        "final_score": final_score,
        "steps": {
            "step1_semantic": semantic_score,
            "step2_skill_match": skill_match_pct,
            "step3_experience": experience_relevance,
            "step4_formula": "0.5 × Semantic Similarity + 0.3 × Skill Match + 0.2 × Experience Relevance",
        },
        "breakdown": {
            "semantic_similarity": semantic_score,
            "skill_match": skill_match_pct,
            "experience_relevance": experience_relevance,
            "hard_skill_match": hard_skill_match,
            "soft_skill_match": soft_skill_match,
        },
        "matched_hard": matched_hard,
        "matched_soft": matched_soft,
        "missing_skills": missing_items,
        "jd_skill_count": len(all_jd_keys),
        "matched_count": len(matched_hard_keys | matched_soft_keys),
    }


def _get_courses(skill: str) -> List[Dict]:
    if skill in COURSES_DB: return COURSES_DB[skill][:2]
    for key in COURSES_DB:
        if key.lower() in skill.lower() or skill.lower() in key.lower():
            return COURSES_DB[key][:2]
    return []


def rank_suitable_roles(resume_skills: Dict) -> List[Dict]:
    resume_all = set(s.lower() for s in resume_skills.get("hard",[]) + resume_skills.get("soft",[]))
    if not resume_all:
        return []  # No skills, no recommendations
    results = []
    for name, data in ROLES_DB.items():
        role_set = set(s.lower() for s in data["core_skills"] + data["soft_skills"])
        if not role_set: continue
        matched = resume_all & role_set
        score = round(len(matched) / len(resume_all) * 100, 1) if resume_all else 0
        results.append({
            "role": name, "score": score,
            "matched_skills": sorted(s.title() for s in matched)[:8],
            "missing_skills": sorted(s.title() for s in (role_set - resume_all))[:6],
            "description": data["description"],
            "avg_salary": data["avg_salary"],
            "demand": data["demand"], "growth": data["growth"],
        })
    results.sort(key=lambda x: (-x["score"], -len(x["matched_skills"])))
    return results[:5]


def get_trending_skills(resume_skills: Dict) -> List[Dict]:
    resume_hard = resume_skills.get("hard", [])
    found, seen = [], set()
    
    # First, try exact matches with title case skills
    for skill in resume_hard:
        skill_key = skill.title()  # Normalize to title case for matching
        if skill_key in TRENDING_DB:
            for item in TRENDING_DB[skill_key]:
                if item["skill"] not in seen:
                    seen.add(item["skill"])
                    found.append({**item, "based_on": skill})
    
    # If no personalized skills found, use default
    if not found:
        for item in TRENDING_DB.get("default", []):
            if item["skill"] not in seen:
                seen.add(item["skill"])
                found.append({**item, "based_on": "For Your Skills"})
    
    def dval(x):
        m = re.search(r"\+(\d+)%", x.get("demand","0"))
        return int(m.group(1)) if m else 0
    found.sort(key=dval, reverse=True)
    return found[:8]


def get_roadmap(role: str) -> Dict:
    if role in ROADMAPS_DB:
        return {"role": role, "phases": ROADMAPS_DB[role]["phases"]}
    for key in ROADMAPS_DB:
        if key.lower() in role.lower() or role.lower() in key.lower():
            return {"role": key, "phases": ROADMAPS_DB[key]["phases"]}
    return {"role": role, "phases": [
        {"phase":"Foundations","duration":"2–3 months","icon":"🏗️",
         "skills":["Python","Git","Linux CLI","Algorithms & DS","SQL"],
         "resources":[{"name":"Python Bootcamp","platform":"Udemy","url":"https://www.udemy.com/course/complete-python-bootcamp/"},{"name":"SQL Bootcamp","platform":"Udemy","url":"https://www.udemy.com/course/the-complete-sql-bootcamp/"}]},
        {"phase":"Core Skills","duration":"3–4 months","icon":"⚙️",
         "skills":[f"{role} Fundamentals","Industry Tools","API Development","Testing","Documentation"],
         "resources":[{"name":f"Search '{role}' on Coursera","platform":"Coursera","url":f"https://www.coursera.org/search?query={role.replace(' ','+')}"},{"name":f"Search '{role}' on Udemy","platform":"Udemy","url":f"https://www.udemy.com/courses/search/?q={role.replace(' ','+')}"}]},
        {"phase":"Advanced Topics","duration":"2–3 months","icon":"🎯",
         "skills":["System Design","Cloud Deployment","Best Practices","Performance","Security"],
         "resources":[{"name":"System Design Primer","platform":"GitHub Free","url":"https://github.com/donnemartin/system-design-primer"},{"name":"AWS Fundamentals","platform":"Coursera","url":"https://www.coursera.org/specializations/aws-fundamentals"}]},
        {"phase":"Job Ready","duration":"1–2 months","icon":"🚀",
         "skills":["Portfolio Projects","LeetCode/HackerRank","Mock Interviews","Resume Polish","Networking"],
         "resources":[{"name":"LeetCode","platform":"Free","url":"https://leetcode.com/"},{"name":"Interview Preparation","platform":"Coursera","url":"https://www.coursera.org/professional-certificates/meta-backend-developer"}]},
    ]}
