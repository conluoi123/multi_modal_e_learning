"""
slide_generator.py

Thay thế toàn bộ hàm create_pptx_file() cũ.
Pipeline: AI JSON  →  slide_builder.js (pptxgenjs)  →  .pptx

Ưu điểm:
- KHÔNG phụ thuộc template → KHÔNG bao giờ bị lệch
- Layout tự vẽ bằng tọa độ tuyệt đối
- 3 theme sẵn: academic, corporate, minimal
"""

import os
import json
import subprocess
import tempfile
from pathlib import Path

from backend.rag.generator import get_llm
from backend.models.schemas import SlidePresentation
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate


# ── Đường dẫn tới slide_builder.js (đặt cùng thư mục file này) ──
BUILDER_SCRIPT = Path(__file__).parent / "slide_builder.js"


# ──────────────────────────────────────────────
# PHẦN 1: AI SINH NỘI DUNG (không đổi)
# ──────────────────────────────────────────────

def generate_slide_outline(
    topic: str,
    context: str,
    n_slides: int,
    grade_level: str = "Đại học",
    difficulty: str = "standard",
    language: str = "vi",
    include_speaker_notes: bool = True,
) -> SlidePresentation:
    """AI trả về JSON nội dung slide theo chủ đề, cấp học và độ khó."""
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=SlidePresentation)

    language_instruction = "tiếng Việt" if language == "vi" else "English"
    notes_instruction = (
        "Mỗi slide phải có speaker_notes giúp giảng viên thuyết trình."
        if include_speaker_notes
        else "speaker_notes phải là chuỗi rỗng."
    )

    template = """
Bạn là một chuyên gia thiết kế bài giảng e-learning.

Hãy tạo bài thuyết trình gồm {n_slides} slide.

Thông tin cấu hình:
- Chủ đề: {topic}
- Đối tượng học: {grade_level}
- Mức độ: {difficulty}
- Ngôn ngữ trình bày: {language_instruction}

Tài liệu tham khảo:
{context}

Yêu cầu nội dung:
1. Chỉ sử dụng thông tin có trong tài liệu tham khảo.
2. Không bịa thêm nội dung ngoài tài liệu.
3. Điều chỉnh độ khó, thuật ngữ và ví dụ cho phù hợp với đối tượng học.
4. Nếu difficulty là "basic", giải thích đơn giản, tránh thuật ngữ quá nặng.
5. Nếu difficulty là "advanced", có thể dùng thuật ngữ chuyên sâu hơn và thêm gợi ý thảo luận.
6. Mỗi slide có tiêu đề ngắn, 3-4 bullet points rõ ràng.
7. {notes_instruction}

Yêu cầu định dạng:
{format_instructions}
"""

    prompt = PromptTemplate(
        template=template,
        input_variables=[
            "topic",
            "context",
            "n_slides",
            "grade_level",
            "difficulty",
            "language_instruction",
            "notes_instruction",
        ],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    print(
        f"AI đang tạo dàn ý cho {n_slides} slide "
        f"về '{topic}' - cấp học: {grade_level}, mức độ: {difficulty}..."
    )

    result_dict = chain.invoke(
        {
            "topic": topic,
            "context": context,
            "n_slides": n_slides,
            "grade_level": grade_level,
            "difficulty": difficulty,
            "language_instruction": language_instruction,
            "notes_instruction": notes_instruction,
        }
    )

    return SlidePresentation(**result_dict)


# ──────────────────────────────────────────────
# PHẦN 2: XUẤT FILE PPTX (thay thế hoàn toàn)
# ──────────────────────────────────────────────

def create_pptx_file(
    presentation_data: SlidePresentation,
    output_filename: str,
    theme: str = "academic",   # "academic" | "corporate" | "minimal"
    author: str = "",
    subtitle: str = "",
) -> str:
    """
    Gọi slide_builder.js để vẽ PPTX từ đầu — không dùng template.

    Args:
        presentation_data: object SlidePresentation từ AI
        output_filename:   tên file xuất, ví dụ "Demo.pptx"
        theme:             "academic" | "corporate" | "minimal"
        author:            tên tác giả (tuỳ chọn, hiện trên title slide)
        subtitle:          phụ đề (tuỳ chọn)

    Returns:
        Đường dẫn tuyệt đối tới file .pptx
    """
    # 1. Chuẩn bị payload JSON
    payload = {
        "title": getattr(presentation_data, "title", output_filename.replace(".pptx", "")),
        "subtitle": subtitle,
        "author": author,
        "slides": [
            {
                "title": slide.title,
                "bullet_points": slide.bullet_points,
                "speaker_notes": getattr(slide, "speaker_notes", ""),
            }
            for slide in presentation_data.slides
        ],
    }

    # 2. Ghi JSON tạm
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as tmp:
        json.dump(payload, tmp, ensure_ascii=False, indent=2)
        tmp_json = tmp.name

    # 3. Chuẩn bị output path
    os.makedirs("data/slides", exist_ok=True)
    output_path = os.path.abspath(f"data/slides/{output_filename}")

    # 4. Gọi Node.js builder
    try:
        result = subprocess.run(
            ["node", str(BUILDER_SCRIPT), tmp_json, output_path, theme],
            capture_output=True,
            text=True,
            encoding="utf-8",      # Fix UnicodeDecodeError trên Windows (cp1252)
            errors="replace",      # Thay ký tự lỗi bằng ? thay vì crash
            check=True,
        )
        if result.stdout:
            print(result.stdout.strip())
        if result.stderr:
            print("⚠", result.stderr.strip())
    except subprocess.CalledProcessError as e:
        print("❌ Lỗi khi chạy slide_builder.js:")
        print(e.stderr)
        raise
    finally:
        os.unlink(tmp_json)  # Xoá file tạm

    return output_path


# ──────────────────────────────────────────────
# MAIN — chạy thử
# ──────────────────────────────────────────────

if __name__ == "__main__":
    from backend.rag.retriever import retrieve_context

    topic = "Tiêu chí đánh giá môn học"

    print("1. Đang lục tìm tài liệu...")
    chunks = retrieve_context(topic, k=3)
    context_text = "\n".join([c["text"] for c in chunks])

    print("2. Bắt đầu sinh cấu trúc Slide...")
    slide_data = generate_slide_outline(topic, context_text, n_slides=5)

    print("3. Bắt đầu vẽ file PowerPoint...")
    path = create_pptx_file(
        slide_data,
        output_filename="Demo_Bai_Giang.pptx",
        theme="academic",          # Đổi thành "corporate" hoặc "minimal" tuỳ ý
        author="GV. Nguyễn Văn A",
        subtitle="Hướng dẫn môn học",
    )
    print(f"📁 File đã lưu tại: {path}")