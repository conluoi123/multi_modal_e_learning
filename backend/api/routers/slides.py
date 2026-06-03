"""
POST /api/v1/slides/generate  — AI sinh dàn ý + xuất file .pptx
GET  /api/v1/slides/download/{filename} — Tải file .pptx về
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.models.schemas import SlideRequest, SlideResponse, SlidePresentation
from backend.rag.retriever import retrive_context
from backend.slides.slide_generator import generate_slide_outline, create_pptx_file

router = APIRouter(prefix="/api/v1/slides", tags=["Slide Generator"])

SLIDES_DIR = os.path.abspath("data/slides")


@router.post("/generate", response_model=SlideResponse)
async def generate_slides(request: SlideRequest):
    """
    Nhận topic từ người dùng → RAG tìm tài liệu → AI sinh dàn ý
    → pptxgenjs vẽ file .pptx đẹp → trả về URL tải xuống.
    """
    # 1. RAG: Tìm tài liệu liên quan
    chunks = retrive_context(request.topic, k=5)
    if not chunks:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy tài liệu liên quan đến chủ đề: '{request.topic}'. "
                   "Vui lòng upload tài liệu trước."
        )
    context_text = "\n".join([c["text"] for c in chunks])

    # 2. AI: Sinh dàn ý slide
    try:
        slide_data: SlidePresentation = generate_slide_outline(
            topic=request.topic,
            context=context_text,
            n_slides=request.n_slides,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi sinh nội dung slide: {str(e)}")

    # 3. pptxgenjs: Vẽ file .pptx
    safe_topic = "".join(c if c.isalnum() or c in " _-" else "_" for c in request.topic)
    filename = f"{safe_topic[:40].strip()}.pptx"

    try:
        create_pptx_file(
            presentation_data=slide_data,
            output_filename=filename,
            theme=request.theme,
            author=request.author,
            subtitle=request.subtitle,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất file PowerPoint: {str(e)}")

    return SlideResponse(
        file_url=f"/api/v1/slides/download/{filename}",
        filename=filename,
        n_slides=len(slide_data.slides),
    )


@router.get("/download/{filename}")
async def download_slide(filename: str):
    """Tải file .pptx đã tạo về máy."""
    # Chặn path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ.")

    file_path = os.path.join(SLIDES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File '{filename}' không tồn tại.")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
