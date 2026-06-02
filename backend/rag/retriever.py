'''
    Nhận câu hỏi -> biến thành vector -> tra cứu trong ChromaDB -> lấy ra top K 
'''

from backend.db.vector_store import init_vector_store

def retrive_context(query: str, k: int=3)-> list[dict]: 
    db = init_vector_store()

    results = db.similarity_search(query, k=k)
    retrived_chunks = []
    for doc in results:
        retrived_chunks.append({
            "text": doc.page_content,
            "metadata": doc.metadata
        })
    return retrived_chunks

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