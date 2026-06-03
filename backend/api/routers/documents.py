from collections import defaultdict

from fastapi import APIRouter

from backend.db.vector_store import init_vector_store
from backend.models.schemas import DocumentInfo, DocumentsResponse

router = APIRouter(prefix="/api/v1", tags=["Documents"])


@router.get("/documents", response_model=DocumentsResponse)
async def list_documents():
    db = init_vector_store()

    result = db._collection.get(include=["metadatas"])
    metadatas = result.get("metadatas", [])

    documents = defaultdict(lambda: {"filename": "", "chunk_count": 0})

    for metadata in metadatas:
        if not metadata:
            continue

        doc_id = metadata.get("doc_id")
        if not doc_id:
            continue

        filename = metadata.get("filename") or metadata.get("source") or "unknown"

        documents[doc_id]["filename"] = filename
        documents[doc_id]["chunk_count"] += 1

    items = [
        DocumentInfo(
            doc_id=doc_id,
            filename=data["filename"],
            chunk_count=data["chunk_count"],
        )
        for doc_id, data in documents.items()
    ]

    return DocumentsResponse(documents=items)