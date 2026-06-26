import os
import sys
import shutil
from pathlib import Path

# để nó import được conda 
sys.path.append(str(Path(__file__).resolve().parents[2]))

from backend.db.vector_store import init_vector_store, add_chunks_to_db
from backend.ingestion.pdf_parser import parse_pdf
from backend.ingestion.chunker import chunk_text, reset_chunker_cache
from backend.api.routers.ingest import compute_file_hash
from backend.rag.retriever import reset_bm25_index, build_bm25_index
from backend.core.config import CHROMA_DIR

'''
    Chúng ta sẽ đi rebuild lại vector DB = Semantic Chunking chứ ko phải cắt theo đệ quy nữa 
'''
def rebuild_database():
    print("=== REBUILDING VECTOR DATABASE WITH SEMANTIC CHUNKING ===")
    
    # xóa cái db cũ 
    if CHROMA_DIR.exists():
        print(f"Clearing old vector database at {CHROMA_DIR}...")
        shutil.rmtree(CHROMA_DIR, ignore_errors=True)
    
    db = init_vector_store()
    
    #  tìm tất cả các file pdf trong data/raw
    raw_dir = Path("data/raw")
    if not raw_dir.exists():
        print(f"Directory {raw_dir} does not exist. Nothing to ingest.")
        return
        
    pdf_files = list(raw_dir.glob("*.pdf"))
    if not pdf_files:
        print("No PDF files found to ingest.")
        return
        
    total_chunks = 0
    
    for pdf_path in pdf_files:
        print(f"\n--- Processing {pdf_path.name} ---")
        doc_id = compute_file_hash(str(pdf_path))
        
        pages = parse_pdf(str(pdf_path))
        print(f"Parsed {len(pages)} pages.")
        
        chunks = chunk_text(pages)
        
        # thêm metadata
        for chunk in chunks:
            chunk["metadata"]["doc_id"] = doc_id
            chunk["metadata"]["filename"] = pdf_path.name
            
        added = add_chunks_to_db(chunks)
        total_chunks += added
        
    print(f"\n=== FINISHED INGESTION ===")
    print(f"Total files processed: {len(pdf_files)}")
    print(f"Total semantic chunks saved: {total_chunks}")
    
    # 3. Build BM25 index
    print("\n--- Building BM25 Index ---")
    reset_bm25_index()
    build_bm25_index()
    
    print("\nDATABASE REBUILD COMPLETE!")

if __name__ == "__main__":
    rebuild_database()
