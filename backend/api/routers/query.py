from fastapi import APIRouter 
from backend.models.schemas import QueryRequest, QueryResponse
from backend.rag.retriever import retrive_context
from backend.rag.generator import generate_answer

router = APIRouter(prefix="/api/v1", tags=["RAQ Chat"])

@router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """
        API nhận câu hỏi và AI trả lời
    """
    chunks = retrive_context(request.question, k=3)
    answer = generate_answer(request.question, chunks)
    citations = [{"source": c["metadata"].get("source"), "page": str(c["metadata"].get("page"))} for c in chunks]
    return QueryResponse(answer=answer, citations=citations)

