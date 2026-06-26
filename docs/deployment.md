# EduMind — Deployment Guide

> Chi?n lu?c deploy t?i gi?n, t?p trung vào AI — không lãng phí th?i gian vào DevOps.
> C?p nh?t: 2026-06-25

---

## Ki?n trúc Deploy T?ng quan

```
GitHub Repository
       ¦
       +--- git push --? HF Spaces (Docker)    ? Backend FastAPI :7860
       ¦                      ¦
       ¦                      +-- Qdrant Cloud  (vector DB, free 1GB)
       ¦                      +-- Gemini API    (qua HF Secrets)
       ¦                      +-- Groq API      (qua HF Secrets)
       ¦                      +-- SQLite        (ephemeral, OK cho demo)
       ¦
       +--- git push --? Vercel                 ? Frontend React/Vite
```

**Chi phí: $0** (t?t c? free tier)

---

## Ph?n 1 — Backend lên Hugging Face Spaces

### 1.1 T?o HF Space

1. Vào https://huggingface.co/new-space
2. Ch?n **SDK: Docker**
3. Visibility: **Public** (d? portfolio)
4. Tên g?i ý: `edumind-api`

### 1.2 Dockerfile

T?o file `Dockerfile` ? root project:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-vie \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# HF Spaces yêu c?u port 7860
EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "2"]
```

### 1.3 README.md — HF Space config (thêm vào d?u file)

```yaml
---
title: EduMind API
emoji: ??
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
app_port: 7860
---
```

### 1.4 Secrets — C?u hình bi?n môi tru?ng

Vào **Settings ? Variables and secrets** trong HF Space, thêm:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | `AIza...` |
| `GROQ_API_KEY` | `gsk_...` |
| `QDRANT_URL` | `https://xxx.us-east-1-0.aws.cloud.qdrant.io` |
| `QDRANT_API_KEY` | `...` |
| `SECRET_KEY` | JWT secret key |
| `ENVIRONMENT` | `production` |

> ?? KHÔNG commit API keys vào .env hay source code khi push lên HF.

### 1.5 Push lên HF Spaces

```bash
# Thêm HF remote (l?n d?u)
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/edumind-api

# Push
git push hf main

# Xem logs build
# ? vào HF Space ? tab "Logs"
```

---

## Ph?n 2 — Qdrant Cloud (Persistent Vector DB)

HF Spaces có **ephemeral storage** — disk reset khi restart. Qdrant local s? m?t data.
Dùng **Qdrant Cloud** d? data t?n t?i vinh vi?n.

### 2.1 T?o Qdrant Cloud cluster

1. Vào https://cloud.qdrant.io
2. T?o cluster: **Free tier — 1GB**
3. Region: ch?n g?n nh?t (Singapore ho?c US)
4. L?y: `Cluster URL` và `API Key`

### 2.2 Update config trong code

Trong `backend/core/config.py` ho?c `backend/db/vector_store.py`:

```python
import os
from qdrant_client import QdrantClient

def get_qdrant_client() -> QdrantClient:
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if qdrant_url and qdrant_api_key:
        # Production: Qdrant Cloud
        return QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    else:
        # Local dev: Qdrant local
        return QdrantClient(host="localhost", port=6333)
```

---

## Ph?n 3 — Frontend lên Vercel

### 3.1 Deploy

1. Vào https://vercel.com ? Import GitHub repo
2. Ch?n folder `frontend/`
3. Framework: **Vite** (ho?c Next.js tùy project)

### 3.2 Environment Variable trên Vercel

```
VITE_API_URL = https://YOUR_USERNAME-edumind-api.hf.space
```

### 3.3 CORS — C?p nh?t backend

Trong `backend/main.py`, thêm Vercel domain vào allowed origins:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://edumind.vercel.app",
        "https://YOUR_USERNAME-edumind-api.hf.space",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Ph?n 4 — Local Development (gi? nguyên nhu cu)

```bash
# Terminal 1: Qdrant local
docker run -p 6333:6333 qdrant/qdrant

# Terminal 2: FastAPI backend
uvicorn backend.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend && npm run dev
```

Không c?n thay d?i gì — code t? detect `QDRANT_URL` có hay không d? ch?n local/cloud.

---

## Ph?n 5 — Luu ý Quan tr?ng

### HF Spaces Sleep Mode

Free tier t? **ng? sau 48h** không có traffic.

- Request d?u tiên sau khi ng? s? m?t ~30-60s d? kh?i d?ng l?i
- Workaround: Dùng UptimeRobot (https://uptimerobot.com) ping `/health` m?i 30 phút (free)

### SQLite trên HF Spaces

- Data **RESET** khi Space restart ho?c rebuild
- V?i d? án AI demo: **ch?p nh?n du?c**
- N?u c?n persistent sau này: migrate sang Supabase PostgreSQL

### Upload Files (PDF)

Files upload lên `/tmp/` — cung s? m?t khi restart.

- Option don gi?n: X? lý ingest xong thì xóa file g?c, ch? gi? chunks trong Qdrant Cloud
- Option nâng cao: Upload lên Cloudflare R2 ho?c HF Dataset repo

---

## Ph?n 6 — Checklist tru?c khi Deploy

```
? Ðã t?o HF Space (Docker SDK)
? Dockerfile dã test build local: docker build -t edumind .
? README.md có YAML frontmatter dúng format
? T?t c? API keys dã vào HF Secrets (không có trong code)
? QDRANT_URL tr? v? Qdrant Cloud
? CORS dã thêm domain Vercel
? /health endpoint ho?t d?ng
? .gitignore bao g?m: .env, *.db, data/, __pycache__/
? requirements.txt có d? dependencies (pin version)
```

---

## Ph?n 7 — URLs sau khi Deploy

| Service | URL |
|---------|-----|
| Backend API | `https://YOUR_USERNAME-edumind-api.hf.space` |
| API Docs (Swagger) | `https://YOUR_USERNAME-edumind-api.hf.space/docs` |
| Frontend | `https://edumind.vercel.app` |
| Qdrant Dashboard | `https://cloud.qdrant.io` |

---

*Deployment Guide v1.0 — EduMind AI E-Learning Platform*
