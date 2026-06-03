import os
import re
import unicodedata
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.models.schemas import SlideRequest, SlideGenerateResponse
from backend.rag.citations import build_citations
from backend.rag.retriever import retrieve_context
from backend.slides.slide_generator import generate_slide_outline, create_pptx_file

router = APIRouter(prefix="/api/v1/slides", tags=["Slides"])


def safe_filename(name: str) -> str:
    name = name.replace("Đ", "D").replace("đ", "d")

    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_name = ascii_name.lower().strip()
    ascii_name = re.sub(r"[^a-z0-9_.-]+", "_", ascii_name)
    ascii_name = re.sub(r"_+", "_", ascii_name).strip("_")

    return ascii_name[:80] or "presentation"


@router.post("/generate", response_model=SlideGenerateResponse)
async def generate_slides(request: SlideRequest):
    chunks = retrieve_context(request.topic, k=5, doc_id=request.doc_id)
    context_text = "\n".join([chunk["text"] for chunk in chunks])

    if not context_text.strip():
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu liên quan")

    slide_data = generate_slide_outline(
        topic=request.topic,
        context=context_text,
        n_slides=request.n_slides,
        grade_level=request.grade_level,
        difficulty=request.difficulty,
        language=request.language,
        include_speaker_notes=request.include_speaker_notes,
    )

    filename = f"{safe_filename(request.topic)}.pptx"

    output_path = create_pptx_file(
        presentation_data=slide_data,
        output_filename=filename,
        theme=request.template_name,
        author="E-Learning AI",
        subtitle="Generated from uploaded documents",
    )

    citations = build_citations(chunks)

    return {
        "status": "success",
        "filename": filename,
        "file_path": output_path,
        "download_url": f"/api/v1/slides/download/{filename}",
        "slide_count": len(slide_data.slides),
        "citations": citations,
    }

@router.get("/download/{filename}")
async def download_slide(filename: str):
    safe_name = os.path.basename(filename)
    file_path = os.path.abspath(os.path.join("data", "slides", safe_name))

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file slide")

    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=safe_name,
    )
