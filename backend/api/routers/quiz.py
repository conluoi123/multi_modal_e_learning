from fastapi import APIRouter, HTTPException

from backend.models.schemas import QuizRequest, QuizResponse
from backend.quiz.quiz_generator import generate_quiz
from backend.rag.citations import build_citations
from backend.rag.retriever import retrieve_context

router = APIRouter(prefix="/api/v1/quiz", tags=["Quiz"])


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz_api(request: QuizRequest):
    chunks = retrieve_context(request.topic, k=5, doc_id=request.doc_id)
    context_text = "\n".join([chunk["text"] for chunk in chunks])

    if not context_text.strip():
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu liên quan")

    quiz_set = generate_quiz(
        topic=request.topic,
        context=context_text,
        n_questions=request.n_questions,
        difficulty=request.difficulty,
    )

    citations = build_citations(chunks)

    return QuizResponse(
        questions=[
            {
                "question": question.question,
                "options": question.options,
                "answer": question.answer,
                "explanation": question.explanation,
            }
            for question in quiz_set.questions
        ],
        citations=citations,
    )
