from fastapi import APIRouter 
from backend.models.schemas import QueryRequest, QueryResponse
from backend.rag.citations import build_citations
from backend.rag.retriever import retrieve_context
from backend.rag.generator import generate_answer

router = APIRouter(prefix="/api/v1", tags=["RAQ Chat"])

@router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """
    API nhận câu hỏi và trả về câu trả lời dựa trên tài liệu.
    """
    chunks = retrieve_context(request.question, k=3, doc_id=request.doc_id)
    answer = generate_answer(request.question, chunks)
    citations = build_citations(chunks)

    return QueryResponse(answer=answer, citations=citations)
