from fastapi import APIRouter, HTTPException

from backend.models.schemas import QuizRequest, QuizResponse
from backend.quiz.quiz_generator import generate_quiz
from backend.quiz.evaluator import evaluate_quiz_question
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

    evaluated_questions = []
    for question in quiz_set.questions:
        # Chấm điểm từng câu hỏi
        eval_result = evaluate_quiz_question(
            context=context_text,
            question={
                "question": question.question,
                "options": question.options,
                "answer": question.answer
            }
        )
        evaluated_questions.append({
            "question": question.question,
            "options": question.options,
            "answer": question.answer,
            "explanation": question.explanation,
            "evaluation": eval_result
        })

    citations = build_citations(chunks)

    return QuizResponse(
        questions=evaluated_questions,
        citations=citations,
    )
