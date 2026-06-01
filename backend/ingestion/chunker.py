'''
    Vì một 1 trang pdf có thể có rất nhiều chữ. Nếu đưa vào hết cho LLM thì sẽ bị "loãng" thông tin và tốn nhiều Token. Do đó, chúng ta cần phải chia nhỏ các trang pdf thành các "Chunk" (khối) nhỏ hơn để đưa vào LLM.
    Quy tắc: 
    - Mỗi chunk có độ dài khoảng 600 chữ 
    - Sử dụng RecursiveCharacterTextSplitter 
    - Ưu tiên cắt \n -> . -> space 
'''

from langchain.text_splitter import RecursiveCharacterTextSplitter 


def chunk_text(pages_data: list[dict], chunk_size: int = 600, chunk_overlap: int = 120) -> list[dict]:
    """
    Cắt text từ các trang PDF thành các đoạn (chunk) nhỏ hơn.
    Vẫn giữ nguyên metadata (source, page) để sau này trích dẫn.
    """
    # Khởi tạo công cụ cắt chữ của LangChain
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    
    chunks_data = []
    
    for page in pages_data:
        text = page["text"]
        metadata = page["metadata"]
        
        # Cắt chữ của trang này thành 1 list các đoạn văn
        chunks = text_splitter.split_text(text)
        
        for i, chunk in enumerate(chunks):
            # Tạo bản sao của metadata để tránh bị ghi đè
            chunk_meta = metadata.copy()
            # Thêm id cho chunk để dễ quản lý
            chunk_meta["chunk_index"] = i
            
            chunks_data.append({
                "text": chunk,
                "metadata": chunk_meta
            })
            
    return chunks_data
# --- Đoạn code để test thử ---
if __name__ == "__main__":
    from backend.ingestion.pdf_parser import parse_pdf
    import os
    
    test_pdf = "data/raw/sample.pdf"
    if os.path.exists(test_pdf):
        print("1. Bắt đầu đọc PDF...")
        pages = parse_pdf(test_pdf)
        
        print("\n2. Bắt đầu cắt Chunk...")
        chunks = chunk_text(pages)
        
        print(f"\n=> KẾT QUẢ: Từ {len(pages)} trang, đã cắt thành {len(chunks)} chunks.")
        
        print("\n--- XEM THỬ CHUNK SỐ 3 ---")
        print("Metadata:", chunks[2]["metadata"])
        print("Text dài:", len(chunks[2]["text"]), "ký tự")
        print("=" * 60)
        print(chunks[2]["text"])
