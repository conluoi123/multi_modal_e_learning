from fastapi import FastAPI
from backend.api.routers import ingest, query

app = FastAPI(
    title="Multimodal E-Learning AI API",
    description="Backend API cho hệ thống E-Learning",
    version="1.0.0"
)

# Nhúng (include) các "nhánh" router vào app chính
app.include_router(ingest.router)
app.include_router(query.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Hệ thống đang hoạt động tốt!"}
