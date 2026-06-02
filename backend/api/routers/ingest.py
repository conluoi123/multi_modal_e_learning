from fastapi import APIRouter, UploadFile, File 
import shutil 
import os 

from backend.ingestion.pdf_parser import parse_pdf
from backend.ingestion.chunker import chunk_text
from backend.db.vector_store import add_chunks_to_db

router = APIRouter(prefix="/api/v1", tags=["Ingestion"])

@router.post("/ingest")
async def ingest_file(file: UploadFile = File(...)): 
    '''
        API support upload file và xử lí đưa vào chromadb 
    '''
    os.makedirs("data/raw", exist_ok=True)
    file_path = os.path.join("data/raw", file.filename)

    with open(file_path, "wb") as buffer: 
        shutil.copyfileobj(file.file, buffer) 

    pages = parse_pdf(file_path)
    chunks = chunk_text(pages)
    add_chunks_to_db(chunks)

    return {
        "status": "success", 
        "filename": file.filename, 
        "total_chunks_saved" : len(chunks)
    }


    