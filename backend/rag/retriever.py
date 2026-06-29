'''
    Nhận câu hỏi -> biến thành vector -> tra cứu trong ChromaDB -> lấy ra top K 

    Pipeline v3 - Hybrid BM25 + Dense Search:
    User Query
      ├── [BM25 Sparse Search]  → top candidates (weight 0.35)
      └── [Dense Vector Search + HyDE] → top candidates (weight 0.65)
           ↓
      [Score Fusion (weighted combination)]
           ↓
      [Cross-Encoder Reranker] → Top K final results
'''
import os
from typing import Optional
from langchain_core.prompts import PromptTemplate
from backend.db.vector_store import init_vector_store
from backend.rag.generator import get_llm
from langchain_groq import ChatGroq
try:
    from sentence_transformers import CrossEncoder
    _reranker_available = True
except ImportError:
    _reranker_available = False
try:
    from rank_bm25 import BM25Okapi
    _bm25_available = True
except ImportError:
    _bm25_available = False
    print("CẢNH BÁO: rank_bm25 chưa được cài đặt. Chạy: pip install rank_bm25")

from dotenv import load_dotenv
load_dotenv()

_reranker = None

# --- BM25 Index Cache ---
_bm25_index = None
_bm25_corpus = None      # List[str]: danh sách text của các chunk
_bm25_metadatas = None   # List[dict]: metadata tương ứng


def get_reranker():
    global _reranker
    if not _reranker_available:
        print("CẢNH BÁO: sentence_transformers chưa được cài đặt, bỏ qua Reranker.")
        return None
        
    if _reranker is None:
        print("Loading Cross-Encoder Reranker (BAAI/bge-reranker-v2-m3)...")
        _reranker = CrossEncoder('BAAI/bge-reranker-v2-m3')
    return _reranker


def build_bm25_index(doc_id: Optional[str] = None):
    """
    Build (hoặc rebuild) BM25 index từ toàn bộ chunks trong ChromaDB.
    Cache lại trong bộ nhớ để tránh build lại mỗi lần.
    """
    global _bm25_index, _bm25_corpus, _bm25_metadatas

    if not _bm25_available:
        return None

    if _bm25_index is not None:
        return _bm25_index

    print("Đang build BM25 Index từ ChromaDB...")
    db = init_vector_store()
    collection = db._collection

    # Lấy toàn bộ documents từ ChromaDB
    where_filter = {"doc_id": doc_id} if doc_id else None
    results = collection.get(where=where_filter, include=["documents", "metadatas"])

    if not results or not results["documents"]:
        print("CẢNH BÁO: ChromaDB trống, không thể build BM25 Index.")
        return None

    _bm25_corpus = results["documents"]
    _bm25_metadatas = results["metadatas"]

    # Tokenize đơn giản bằng cách split whitespace (phù hợp tiếng Việt)
    tokenized_corpus = [text.lower().split() for text in _bm25_corpus]
    _bm25_index = BM25Okapi(tokenized_corpus)

    print(f"BM25 Index đã sẵn sàng với {len(_bm25_corpus)} chunks.")
    return _bm25_index


def reset_bm25_index():
    """Xóa BM25 cache — gọi hàm này sau khi upload tài liệu mới."""
    global _bm25_index, _bm25_corpus, _bm25_metadatas
    _bm25_index = None
    _bm25_corpus = None
    _bm25_metadatas = None
    print("BM25 Index đã được reset.")


def bm25_search(query: str, k: int = 10, doc_id: Optional[str] = None) -> list[dict]:
    """
    Tìm kiếm bằng BM25 Sparse Search.
    Trả về list[dict] với keys: text, metadata, bm25_score
    """
    index = build_bm25_index(doc_id)
    if index is None:
        return []

    tokenized_query = query.lower().split()
    scores = index.get_scores(tokenized_query)

    # Lấy top k indices
    import numpy as np
    top_indices = np.argsort(scores)[::-1][:k]

    results = []
    for idx in top_indices:
        if scores[idx] > 0:  # Bỏ qua các chunk có score = 0
            results.append({
                "text": _bm25_corpus[idx],
                "metadata": _bm25_metadatas[idx],
                "bm25_score": float(scores[idx]),
            })
    return results


def generate_hypothetical_document(query: str) -> str:
    """
    Sinh ra một câu trả lời giả định (HyDE) bằng LLM để cải thiện độ khớp từ khóa khi search VectorDB.
    """
    fast_llm = ChatGroq(
        model_name="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7
    )
    template = """
    Bạn là một trợ lý AI thông minh trong hệ thống E-Learning.
    Nhiệm vụ của bạn là viết một đoạn văn ngắn (khoảng 3-4 câu) trực tiếp trả lời câu hỏi sau đây.
    Đừng giải thích, đừng xin chào, chỉ viết đoạn văn chứa kiến thức chuyên môn. Có thể dựa vào kiến thức nền của bạn.

    Câu hỏi: {question}

    Trả lời:
    """
    prompt = PromptTemplate(input_variables=["question"], template=template.strip())
    final_prompt = prompt.format(question=query)

    print("Đang sinh câu trả lời giả định (HyDE)...")
    response = fast_llm.invoke(final_prompt)
    return response.content

'''
    Quy trình Retrieval sử dụng Hybrid Search: 
    
'''
def retrieve_context(
    query: str,
    k: int = 3,
    doc_id: Optional[str] = None,
    use_hyde: bool = True,
    use_reranker: bool = False,
    bm25_weight: float = 0.4,
    dense_weight: float = 0.6,
) -> list[dict]:
    """
    Hybrid Search: BM25 (0.35) + Dense Vector (0.65) → Pool → Cross-Encoder Reranker → Top K

    Quy trình:
    1. BM25 sparse search  → top candidates
    2. Dense vector search (query gốc + HyDE) → top candidates
    3. Merge candidates bằng Weighted Score Fusion
    4. Cross-Encoder Reranker chấm điểm lại → Top K
    """
    db = init_vector_store()
    search_kwargs = {}
    if doc_id:
        search_kwargs["filter"] = {"doc_id": doc_id}

    # Số lượng candidates lấy từ mỗi nguồn trước khi merge
    fetch_k = max(k * 3, 10)

    # ---------- Luồng 1: BM25 Sparse Search ----------
    bm25_results = []
    if _bm25_available:
        bm25_raw = bm25_search(query, k=fetch_k, doc_id=doc_id)
        # Normalize BM25 score về [0, 1]
        if bm25_raw:
            max_bm25 = max(r["bm25_score"] for r in bm25_raw)
            for r in bm25_raw:
                r["hybrid_score"] = bm25_weight * (r["bm25_score"] / max_bm25 if max_bm25 > 0 else 0)
            bm25_results = bm25_raw
            print(f"[BM25] Tìm được {len(bm25_results)} candidates.")

    # ---------- Luồng 2: Dense Vector Search ----------
    dense_docs = []
    # 2a. Search bằng query gốc
    raw_dense = db.similarity_search_with_relevance_scores(query, k=fetch_k, **search_kwargs)
    dense_docs.extend(raw_dense)

    # 2b. Search bằng HyDE document
    if use_hyde:
        try:
            hyde_doc = generate_hypothetical_document(query)
            print(f"Sử dụng HyDE Document để search: {hyde_doc[:100]}...")
            hyde_results = db.similarity_search_with_relevance_scores(hyde_doc, k=fetch_k, **search_kwargs)
            dense_docs.extend(hyde_results)
        except Exception as e:
            print(f"CẢNH BÁO: HyDE thất bại, fallback. Lỗi: {e}")

    # Gộp tất cả candidates vào một dict, dùng chunk text làm key
    merged: dict[str, dict] = {}

    # Thêm kết quả BM25 vào pool
    for r in bm25_results:
        key = r["text"][:200]
        if key not in merged:
            merged[key] = {"text": r["text"], "metadata": r["metadata"], "hybrid_score": 0.0}
        merged[key]["hybrid_score"] += r["hybrid_score"]

    # Thêm kết quả Dense vào pool, normalize cosine score về [0, 1]
    max_dense = max((score for _, score in dense_docs), default=1.0)
    max_dense = max(max_dense, 1e-9)  # Tránh chia 0
    for doc, score in dense_docs:
        key = doc.page_content[:200]
        norm_score = dense_weight * (score / max_dense)
        if key not in merged:
            merged[key] = {"text": doc.page_content, "metadata": doc.metadata, "hybrid_score": 0.0}
        merged[key]["hybrid_score"] += norm_score

    # Sắp xếp theo hybrid score và lấy top candidates
    candidates = sorted(merged.values(), key=lambda x: x["hybrid_score"], reverse=True)
    candidates = candidates[:fetch_k]

    print(f"[Hybrid] Pool {len(candidates)} candidates sau khi fusion (BM25+Dense).")

    # ---------- Cross-Encoder Reranker ----------
    if use_reranker and _reranker_available and candidates:
        reranker = get_reranker()
        if reranker:
            pairs = [[query, c["text"]] for c in candidates]
            print(f"Đang chạy Cross-Encoder Reranker để chấm điểm {len(candidates)} chunks...")
            scores = reranker.predict(pairs)

            for cand, score in zip(candidates, scores):
                cand["rerank_score"] = float(score)

            candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

    # Lấy Top K
    final = candidates[:k]

    return [
        {"text": c["text"], "metadata": c.get("metadata", {})}
        for c in final
    ]


if __name__ == "__main__":
    query = "Hệ thống thu thập dữ liệu với tần suất bao nhiêu?"
    print(f"Đang tìm kiếm tài liệu cho câu hỏi: '{query}'\n")

    chunks = retrieve_context(query, k=3)

    for i, chunk in enumerate(chunks):
        source = chunk['metadata'].get('source')
        page = chunk['metadata'].get('page')
        print(f"--- Top {i+1} | Source: {source} (Trang {page}) ---")
        print(chunk["text"])
        print("=" * 60)