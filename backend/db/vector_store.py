'''
Mô hình BGE-M3 (BAAI General Embedding) là lựa chọn hàng đầu cho các hệ thống RAG (Truy xuất tăng cường thế hệ) cần tính linh hoạt. Nên dùng model này khi cần truy xuất lai (hybrid retrieval) (kết hợp cả tìm kiếm ngữ nghĩa và tìm kiếm từ khóa), xử lý đa ngôn ngữ (bao gồm Tiếng Việt), hoặc cần tự lưu trữ hoàn toàn để bảo mật dữ liệu

'''
import os 
from langchain_huggingface import HuggingFaceEmbeddings 
from langchain_community.vectorstores import Chroma 

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.path.join(BASE_DIR, "data", "chroma_db")


def get_embedder(): 
    '''
        Khởi tạo mô hình 
    '''
    print(f"Đang tải mô hình từ HuggingFace về")
    return HuggingFaceEmbeddings(
        model_name = "BAAI/bge-m3", 
        model_kwargs={'device': 'cpu'}
    )

def init_vector_store(): 
    '''
        Khởi tạo Vector Store từ tài liệu
    '''
    embedder = get_embedder()
    os.makedirs(PATH, exist_ok=True)
    print(f"Đang kết nối Chroma DB ở {PATH}")
    vectorstore = Chroma(
        persist_directory = PATH, 
        embedding_function = embedder,
        collection_name = 'elearning_docs'
    )   
    return vectorstore

def add_chunks_to_db(chunks_data: list[dict]): 
    """
    Thêm các chunk đã xử lý vào Vector Store
    """
    db = init_vector_store()

    texts = [chunk["text"] for chunk in chunks_data]
    metadatas = [chunk["metadata"] for chunk in chunks_data]
    print(f"Nhúng và lưu {len(texts)} chunks vào DB....")
    db.add_texts(texts=texts, metadatas=metadatas)
    print(f"Đã lưu xong vào ChromaDB")

if __name__ == "__main__":
    from backend.ingestion.pdf_parser import parse_pdf
    from backend.ingestion.chunker import chunk_text
    
    test_pdf = "data/raw/sample.pdf"
    if os.path.exists(test_pdf):
        pages = parse_pdf(test_pdf)
        chunks = chunk_text(pages)
        
        # Test: Lưu toàn bộ chunks vào DB
        add_chunks_to_db(chunks)
        
        # Kiểm tra lại xem DB đang có bao nhiêu chunk
        db = init_vector_store()
        print(f"\n=> Hiện tại ChromaDB đang chứa tổng cộng {db._collection.count()} chunks.")
    
