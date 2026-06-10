from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routers import ingest, query, slides, documents, quiz, chat, settings

app = FastAPI(
    title="Multimodal E-Learning AI API",
    description="Backend API cho hệ thống E-Learning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nhúng (include) các "nhánh" router vào app chính
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(slides.router)
app.include_router(documents.router)
app.include_router(quiz.router)
app.include_router(chat.router)
app.include_router(settings.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Hệ thống đang hoạt động tốt!"}
