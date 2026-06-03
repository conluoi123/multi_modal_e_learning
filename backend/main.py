from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers import ingest, query, slides, quiz

app = FastAPI(
    title="Multimodal E-Learning AI API",
    description="""
## E-Learning AI Assistant

Hệ thống AI hỗ trợ học tập đa phương thức với các tính năng:

| Endpoint | Mô tả |
|----------|-------|
| `POST /api/v1/ingest` | Upload tài liệu PDF vào knowledge base |
| `POST /api/v1/query` | Hỏi đáp thông minh dựa trên tài liệu (RAG) |
| `POST /api/v1/slides/generate` | Tự động tạo slide PowerPoint từ topic |
| `GET  /api/v1/slides/download/{filename}` | Tải file .pptx |
| `POST /api/v1/quiz/generate` | Sinh câu hỏi trắc nghiệm MCQ từ tài liệu |
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — Cho phép frontend (localhost:3000, localhost:5173, v.v.) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Khi production thay bằng domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký routers
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(slides.router)
app.include_router(quiz.router)


@app.get("/health", tags=["System"])
def health_check():
    """Kiểm tra hệ thống đang hoạt động."""
    return {"status": "ok", "version": "2.0.0", "message": "Hệ thống đang hoạt động tốt!"}
