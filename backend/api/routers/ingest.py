import hashlib
import os
import re
import shutil

from fastapi import APIRouter, File, UploadFile

from backend.db.vector_store import add_chunks_to_db, init_vector_store
from backend.ingestion.chunker import chunk_text
from backend.ingestion.pdf_parser import parse_pdf
from backend.models.schemas import IngestResponse

router = APIRouter(prefix="/api/v1", tags=["Ingestion"])


def safe_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r"[^a-zA-Z0-9_.-]+", "_", filename)
    return filename or "uploaded.pdf"


def compute_file_hash(file_path: str) -> str:
    sha256 = hashlib.sha256()

    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            sha256.update(block)

    return sha256.hexdigest()


def document_exists(doc_id: str) -> bool:
    db = init_vector_store()
    results = db._collection.get(where={"doc_id": doc_id}, limit=1)
    return bool(results.get("ids"))


@router.post("/ingest", response_model=IngestResponse)
async def ingest_file(file: UploadFile = File(...)):
    os.makedirs("data/raw", exist_ok=True)

    filename = safe_filename(file.filename or "uploaded.pdf")
    file_path = os.path.join("data/raw", filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_id = compute_file_hash(file_path)

    if document_exists(doc_id):
        return IngestResponse(
            status="success",
            doc_id=doc_id,
            filename=filename,
            total_pages=0,
            total_chunks_saved=0,
            duplicate=True,
        )

    pages = parse_pdf(file_path)
    chunks = chunk_text(pages)

    for chunk in chunks:
        chunk["metadata"]["doc_id"] = doc_id
        chunk["metadata"]["filename"] = filename

    total_saved = add_chunks_to_db(chunks)

    return IngestResponse(
        status="success",
        doc_id=doc_id,
        filename=filename,
        total_pages=len(pages),
        total_chunks_saved=total_saved,
        duplicate=False,
    )