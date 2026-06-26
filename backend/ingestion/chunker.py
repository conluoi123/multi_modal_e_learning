'''
    Chunker v2 — Semantic Chunking với Fallback

    Chiến lược cắt chunk:
    - Ưu tiên: SemanticChunker (langchain-experimental) — cắt theo ranh giới ngữ nghĩa
    - Fallback: RecursiveCharacterTextSplitter — cắt theo độ dài ký tự cố định (600 chars)

    SemanticChunker so sánh embedding của các câu liền kề và tìm điểm gián đoạn ngữ nghĩa
    (semantic breakpoints) để quyết định nơi cắt — chunk tạo ra có nội dung nguyên vẹn hơn.
'''

from langchain_text_splitters import RecursiveCharacterTextSplitter


def _build_splitter(chunk_size: int = 600, chunk_overlap: int = 120):
    """
    Khởi tạo text splitter.
    Ưu tiên SemanticChunker, fallback sang RecursiveCharacterTextSplitter nếu thiếu thư viện.
    """
    try:
        from langchain_experimental.text_splitter import SemanticChunker
        from backend.db.vector_store import get_embedder

        embedder = get_embedder()
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        print("[CHUNKER]  Sử dụng RecursiveCharacterTextSplitter")
        return splitter, "recursive"

    except ImportError:
        print("[CHUNKER]   langchain-experimental chưa được cài. Fallback → RecursiveCharacterTextSplitter")
        print("[CHUNKER]    Để dùng SemanticChunker: pip install langchain-experimental")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        return splitter, "recursive"


# Cache splitter để không khởi tạo lại mỗi lần gọi
_splitter_cache = None
_splitter_type = None


def chunk_text(pages_data: list[dict], chunk_size: int = 600, chunk_overlap: int = 120) -> list[dict]:
    """
    Cắt text từ các trang PDF thành các đoạn (chunk) nhỏ hơn theo ngữ nghĩa (Semantic Chunking).
    Vẫn giữ nguyên metadata (source, page) để sau này trích dẫn nguồn.

    Args:
        pages_data: List các dict với keys 'text' và 'metadata' (từ pdf_parser)
        chunk_size: Độ dài tối đa mỗi chunk (chỉ dùng khi fallback về Recursive)
        chunk_overlap: Độ chồng lấp giữa 2 chunk liên tiếp (chỉ dùng khi fallback)

    Returns:
        List các dict với keys 'text' và 'metadata' (đã thêm chunk_index)
    """
    global _splitter_cache, _splitter_type

    if _splitter_cache is None:
        _splitter_cache, _splitter_type = _build_splitter(chunk_size, chunk_overlap)

    chunks_data = []

    for page in pages_data:
        text = page.get("text", "").strip()
        metadata = page.get("metadata", {})

        if not text:
            continue

        # Cắt chữ của trang này thành list các đoạn văn
        try:
            sub_chunks = _splitter_cache.split_text(text)
        except Exception as e:
            print(f"[CHUNKER] Lỗi khi cắt trang {metadata.get('page', '?')}: {e}")
            # Nếu SemanticChunker lỗi (ví dụ text quá ngắn), fallback thủ công
            sub_chunks = [text]

        for i, chunk in enumerate(sub_chunks):
            chunk = chunk.strip()
            if not chunk:
                continue

            # Tạo bản sao của metadata để tránh bị ghi đè chéo giữa các chunk
            chunk_meta = metadata.copy()
            chunk_meta["chunk_index"] = i
            chunk_meta["chunk_method"] = _splitter_type   # Ghi lại phương pháp đã dùng

            chunks_data.append({
                "text": chunk,
                "metadata": chunk_meta
            })

    print(f"[CHUNKER] Tổng cộng: {len(pages_data)} trang → {len(chunks_data)} chunks ({_splitter_type})")
    return chunks_data


def reset_chunker_cache():
    """Reset cache splitter — gọi khi cần đổi phương pháp chunking."""
    global _splitter_cache, _splitter_type
    _splitter_cache = None
    _splitter_type = None
    print("[CHUNKER] Cache đã được reset.")


# --- Test thử ---
if __name__ == "__main__":
    from backend.ingestion.pdf_parser import parse_pdf
    import os

    test_pdf = "data/raw/REIS.pdf"

    # Thử file đầu tiên trong data/raw nếu không có sample.pdf
    if not os.path.exists(test_pdf):
        raws = [f for f in os.listdir("data/raw") if f.endswith(".pdf")]
        test_pdf = f"data/raw/{raws[0]}" if raws else None

    if test_pdf and os.path.exists(test_pdf):
        print(f"1. Đọc PDF: {test_pdf}")
        pages = parse_pdf(test_pdf)

        print(f"\n2. Cắt chunks từ {len(pages)} trang...")
        chunks = chunk_text(pages)

        print(f"\n=== KẾT QUẢ ===")
        print(f"Số chunks: {len(chunks)}")
        print(f"Phương pháp: {chunks[0]['metadata'].get('chunk_method', 'N/A')}")

        # Thống kê độ dài chunk
        lengths = [len(c["text"]) for c in chunks]
        print(f"Độ dài chunk: min={min(lengths)}, max={max(lengths)}, avg={sum(lengths)//len(lengths)}")

        print(f"\n--- Xem thử Chunk #1 ---")
        print(f"Metadata: {chunks[0]['metadata']}")
        print(f"Text ({len(chunks[0]['text'])} ký tự):")
        print(chunks[0]["text"][:300], "...")
    else:
        print("Không tìm thấy file PDF nào trong data/raw/")
