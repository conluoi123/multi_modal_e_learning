from collections import defaultdict
import os

from fastapi import APIRouter, HTTPException

from backend.db.vector_store import init_vector_store
from backend.models.schemas import DocumentDeleteResponse, DocumentInfo, DocumentsResponse

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


@router.delete("/documents/{doc_id}", response_model=DocumentDeleteResponse)
async def delete_document(doc_id: str):
    db = init_vector_store()

    result = db._collection.get(where={"doc_id": doc_id}, include=["metadatas"])
    ids = result.get("ids", [])
    metadatas = result.get("metadatas", [])

    if not ids:
        raise HTTPException(status_code=404, detail="Document not found")

    filenames = {
        metadata.get("filename") or metadata.get("source")
        for metadata in metadatas
        if metadata
    }

    db._collection.delete(ids=ids)

    deleted_files = []
    for filename in filenames:
        if not filename:
            continue

        safe_name = os.path.basename(filename)
        file_path = os.path.abspath(os.path.join("data", "raw", safe_name))

        if os.path.exists(file_path):
            os.remove(file_path)
            deleted_files.append(safe_name)

    return DocumentDeleteResponse(
        status="success",
        doc_id=doc_id,
        deleted_chunks=len(ids),
        deleted_files=deleted_files,
    )
