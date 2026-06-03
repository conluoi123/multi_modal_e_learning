"""
POST /api/v1/quiz/generate — AI sinh bộ câu hỏi MCQ từ tài liệu
"""

import json
from fastapi import APIRouter, HTTPException

from backend.models.schemas import QuizRequest, QuizResponse, QuizQuestion
from backend.rag.retriever import retrive_context
from backend.rag.generator import get_llm
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

router = APIRouter(prefix="/api/v1/quiz", tags=["Quiz Generator"])


DIFFICULTY_MAP = {
    "easy":   "đơn giản, chỉ cần nhớ định nghĩa/khái niệm cơ bản",
    "medium": "trung bình, cần hiểu và áp dụng kiến thức",
    "hard":   "khó, cần phân tích, so sánh, hoặc suy luận sâu",
}


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """
    Nhận topic → RAG tìm tài liệu → AI sinh câu hỏi MCQ có 4 lựa chọn
    cùng đáp án và giải thích.
    """
    # 1. Tìm tài liệu
    chunks = retrive_context(request.topic, k=5)
    if not chunks:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy tài liệu về '{request.topic}'. Upload tài liệu trước."
        )
    context_text = "\n".join([c["text"] for c in chunks])
    difficulty_desc = DIFFICULTY_MAP.get(request.difficulty, DIFFICULTY_MAP["medium"])

    # 2. AI sinh quiz
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=QuizResponse)

    prompt = PromptTemplate(
        template="""
Bạn là giảng viên đại học. Dựa vào TÀI LIỆU sau, hãy tạo {n_questions} câu hỏi trắc nghiệm (MCQ)
về chủ đề: "{topic}".

Độ khó yêu cầu: {difficulty_desc}

TÀI LIỆU:
{context}

YÊU CẦU:
- Mỗi câu có đúng 4 lựa chọn: A, B, C, D
- Chỉ có 1 đáp án đúng
- Trường correct_answer chỉ chứa 1 ký tự: "A", "B", "C" hoặc "D"
- Giải thích ngắn gọn tại sao đáp án đó đúng (explanation)
- Câu hỏi phải bám sát vào nội dung tài liệu, không bịa đặt

{format_instructions}
""",
        input_variables=["topic", "n_questions", "difficulty_desc", "context"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    try:
        result = chain.invoke({
            "topic": request.topic,
            "n_questions": request.n_questions,
            "difficulty_desc": difficulty_desc,
            "context": context_text,
        })

        # Đảm bảo trường topic có mặt
        if isinstance(result, dict):
            result["topic"] = request.topic
            questions = [QuizQuestion(**q) for q in result.get("questions", [])]
        else:
            questions = result.questions

        return QuizResponse(topic=request.topic, questions=questions)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi sinh quiz: {str(e)}")
