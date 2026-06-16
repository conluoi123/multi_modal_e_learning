'''
    Nhận câu hỏi -> biến thành vector -> tra cứu trong ChromaDB -> lấy ra top K 


    Pipeline sau bổ sung: 
    User seaRCH -->   HyDE generate -> Chroma similarity_search -> Cross encoder để lấy top K -> top K-chunks 
    
    v2: Tối ưu thời gian sinh câu trả lời = cách ko sdung Gemini để sinh HyDE mà chuyển sang Groq 
    Output cho bước Retrieval 
'''
import os
from typing import Optional
from langchain.prompts import PromptTemplate
from backend.db.vector_store import init_vector_store
from backend.rag.generator import get_llm
from langchain_groq import ChatGroq
try:
    from sentence_transformers import CrossEncoder
    _reranker_available = True
except ImportError:
    _reranker_available = False
from dotenv import load_dotenv
load_dotenv()

_reranker = None

def get_reranker():
    global _reranker
    if not _reranker_available:
        print("CẢNH BÁO: sentence_transformers chưa được cài đặt, bỏ qua Reranker.")
        return None
        
    if _reranker is None:
        print("Loading Cross-Encoder Reranker (BAAI/bge-reranker-v2-m3)...")
        _reranker = CrossEncoder('BAAI/bge-reranker-v2-m3')
    return _reranker

def generate_hypothetical_document(query: str) -> str:
    """
    Sinh ra một câu trả lời giả định (HyDE) bằng LLM để cải thiện độ khớp từ khóa khi search VectorDB.
    """
    # llm = get_llm()
    fast_llm = ChatGroq(
        model_name = "llama-3.1-8b-instant", 
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

# tích hợp HyDE 
def retrieve_context(
    query: str,
    k: int = 3, # trích xuất top k, mặc định k = 3 
    doc_id: Optional[str] = None,
    use_hyde: bool = True,
    use_reranker: bool = True,
) -> list[dict]:
    """
    Truy xuất các chunk liên quan nhất từ ChromaDB.
    Kết hợp Original Query Search + HyDE Search + Deduplication + Cross-Encoder Reranking
    """
    db = init_vector_store()

    search_kwargs = {}
    if doc_id:
        search_kwargs["filter"] = {"doc_id": doc_id}

    fetch_k = 4 if (use_reranker and _reranker_available) else k
    
    # 1. Thực hiện Vector Search bằng Query Gốc
    results = []
    raw_results = db.similarity_search(query, k=fetch_k, **search_kwargs)
    results.extend(raw_results)

    # 2. Sinh hypothetical document để cải thiện semantic matching
    if use_hyde:
        try:
            hyde_doc = generate_hypothetical_document(query)
            print(f"Sử dụng HyDE Document để search: {hyde_doc[:100]}...")
            hyde_results = db.similarity_search(hyde_doc, k=fetch_k, **search_kwargs)
            results.extend(hyde_results)
        except Exception as e:
            print(f"CẢNH BÁO: Quá trình sinh HyDE thất bại, sử dụng fallback. Lỗi: {e}")

    # 3. Deduplicate (Loại bỏ các chunk trùng lặp giữa 2 luồng search)
    seen = set()
    unique_results = []
    for doc in results:
        # Dùng chunk_id nếu có, không thì lấy 200 ký tự đầu làm khóa deduplicate
        key = doc.metadata.get("chunk_id") or doc.page_content[:200]
        if key not in seen:
            seen.add(key)
            unique_results.append(doc)
            
    results = unique_results

    # 4. Cross-Encoder Reranker để chấm điểm và xếp hạng lại
    if use_reranker and _reranker_available and results:
        reranker = get_reranker()
        if reranker:
            pairs = [[query, doc.page_content] for doc in results]
            print(f"Đang chạy Cross-Encoder Reranker để chấm điểm {len(results)} chunks...")
            scores = reranker.predict(pairs)
            
            # Gắn điểm vào doc và sort
            for doc, score in zip(results, scores):
                doc.metadata["rerank_score"] = float(score)
                
            results.sort(key=lambda x: x.metadata["rerank_score"], reverse=True)
            results = results[:k] # Lấy lại đúng top k sau khi đã sort
    else:
        # Nếu không có reranker, lấy k phần tử đầu tiên (ưu tiên raw search)
        results = results[:k]

    # 5. Xuất kết quả
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
    # Test thử 1 câu hỏi "khó nhằn" (Ngắn, lắt léo)
    query = "Hệ thống thu thập dữ liệu với tần suất bao nhiêu?"
    print(f"Đang tìm kiếm tài liệu cho câu hỏi: '{query}'\n")
    
    chunks = retrieve_context(query, k=2, use_hyde=True, use_reranker=True)
    
    for i, chunk in enumerate(chunks):
        source = chunk['metadata'].get('source')
        page = chunk['metadata'].get('page')
        score = chunk['metadata'].get('rerank_score', 'N/A')
        print(f"--- Top {i+1} | Source: {source} (Trang {page}) | Score: {score} ---")
        print(chunk["text"])
        print("="*60)