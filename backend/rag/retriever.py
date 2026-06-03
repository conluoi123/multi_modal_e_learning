'''
    Nhận câu hỏi -> biến thành vector -> tra cứu trong ChromaDB -> lấy ra top K 
'''
from typing import Optional
from backend.db.vector_store import init_vector_store

def retrieve_context(
    query: str,
    k: int = 3,
    doc_id: Optional[str] = None,
) -> list[dict]:
    """
    Truy xuất các chunk liên quan nhất từ ChromaDB.

    Nếu có doc_id, chỉ tìm trong tài liệu tương ứng.
    Nếu không có doc_id, tìm trên toàn bộ collection.
    """
    db = init_vector_store()

    search_kwargs = {}
    if doc_id:
        search_kwargs["filter"] = {"doc_id": doc_id}

    results = db.similarity_search(query, k=k, **search_kwargs)

    retrieved_chunks = []
    for doc in results:
        retrieved_chunks.append(
            {
                "text": doc.page_content,
                "metadata": doc.metadata,
            }
        )

    return retrieved_chunks

if __name__ == "__main__":
    # Test thử 1 câu hỏi
    query = "Đồ án này yêu cầu làm những gì?"
    print(f"Đang tìm kiếm tài liệu cho câu hỏi: '{query}'\n")
    
    chunks = retrieve_context(query, k=2) # Thử lấy top 2 chunk tốt nhất
    
    for i, chunk in enumerate(chunks):
        source = chunk['metadata'].get('source')
        page = chunk['metadata'].get('page')
        print(f"--- Tìm thấy ở: {source} (Trang {page}) ---")
        print(chunk["text"])
        print("="*60)