# 🚀 Advanced RAG Roadmap — Kỹ thuật chưa triển khai

> Đây là 3 kỹ thuật Advanced RAG **chưa có trong codebase hiện tại**, cần được triển khai để nâng cấp hệ thống lên chuẩn Production và làm đẹp Portfolio xin thực tập AI Engineer.

---

## 🌟 Kỹ thuật 1: HyDE — Hypothetical Document Embedding

**Trạng thái:** `TODO` · Độ khó: ⭐⭐ · File: `backend/rag/retriever.py`

### Vấn đề hiện tại
Code hiện tại đem thẳng câu hỏi của user đi tìm kiếm trong Vector DB.  
Người dùng hay hỏi câu ngắn cộc lốc (VD: *"Tích phân?"*, *"Bayes?"*). Câu ngắn thiếu ngữ cảnh nên Vector Search hay bỏ sót tài liệu quan trọng.

### Cơ chế HyDE

```
Câu hỏi của user: "Tích phân?"
        │
        ▼
[LLM] Viết ra câu trả lời nháp:
  "Tích phân là một phép toán trong giải tích, dùng để tính diện tích..."
        │
        ▼
[Embedder] Nhúng câu TRẢ LỜI NHÁP thành vector
        │
        ▼
[Vector DB] Tìm kiếm bằng vector của câu trả lời nháp
        │ (câu trả lời nháp giống văn bản trong sách hơn câu hỏi ngắn)
        ▼
Kết quả: Lôi được đúng tài liệu, độ chính xác tăng cao
```

### Điểm đánh đổi (Trade-offs)
| | Trước HyDE | Sau HyDE |
|---|---|---|
| Context Recall | ~60% | ~80-85% |
| Độ trễ (Latency) | ~0.5s | ~1.5-2s (thêm 1 lần gọi Gemini) |
| Chi phí API | Thấp | Tăng nhẹ |

### Đoạn code cần thêm vào `retriever.py`
```python
from langchain_google_genai import ChatGoogleGenerativeAI

def generate_hypothetical_answer(query: str) -> str:
    """Dùng LLM sinh câu trả lời nháp (HyDE) từ câu hỏi ngắn."""
    llm = ChatGoogleGenerativeAI(model=GEMINI_MODEL, google_api_key=GEMINI_API_KEY)
    hyde_prompt = f"Viết một đoạn văn bản học thuật ngắn (3-5 câu) trả lời cho câu hỏi sau:\n{query}"
    response = llm.invoke(hyde_prompt)
    return response.content

def retrieve_context_hyde(query: str, k: int = 5, doc_id: str = None) -> list[dict]:
    """Truy xuất dùng HyDE thay vì câu hỏi gốc."""
    hypothetical_answer = generate_hypothetical_answer(query)
    # Tìm kiếm bằng câu trả lời nháp thay vì câu hỏi gốc
    return retrieve_context(hypothetical_answer, k=k, doc_id=doc_id)
```

---

## 🚀 Kỹ thuật 2: Semantic Chunking

**Trạng thái:** `TODO` · Độ khó: ⭐ · File: `backend/ingestion/chunker.py`

### Vấn đề hiện tại
Code đang dùng `RecursiveCharacterTextSplitter` — cắt PDF theo số ký tự cố định (1000 chars).  
Nếu một định lý quan trọng đang ở cuối đoạn 998 ký tự, nó sẽ bị cắt ngang lưng, mất ngữ cảnh.

### Cơ chế Semantic Chunking

```
Thay vì:  [1000 chars] [1000 chars] [1000 chars]  ← cắt cứng, không hiểu nghĩa
          ↑ Định lý bị cắt ngang ↑

Dùng:     [Câu 1. Câu 2. Câu 3.]  [Câu 4. Câu 5. Câu 6.]  ← cắt theo ý nghĩa
                └─ Mỗi đoạn = Một ý hoàn chỉnh ─┘
```

### Thư viện đề xuất
- `langchain_experimental.text_splitter.SemanticChunker` — dùng Embedding để đo độ tương đồng giữa các câu, cắt khi "ngữ nghĩa thay đổi".

### Đoạn code thay thế trong `chunker.py`
```python
# TRƯỚC (cũ)
from langchain.text_splitter import RecursiveCharacterTextSplitter
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

# SAU (Semantic Chunking)
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
splitter = SemanticChunker(
    embeddings,
    breakpoint_threshold_type="percentile",  # cắt khi ngữ nghĩa thay đổi >95th percentile
    breakpoint_threshold_amount=95
)
```

### Cài đặt thêm
```bash
pip install langchain-experimental
```

---

## 👑 Kỹ thuật 3: CRAG — Corrective RAG (Agentic Workflow)

**Trạng thái:** `TODO` · Độ khó: ⭐⭐⭐ · File mới: `backend/agents/crag_agent.py`

### Vấn đề hiện tại
Khi tài liệu nội bộ (PDF đã upload) không chứa câu trả lời, AI trả về *"Không tìm thấy trong tài liệu"* và dừng lại.  
Người học bị bỏ rơi, trải nghiệm rất kém.

### Cơ chế CRAG (dùng LangGraph)

```
User hỏi
    │
    ▼
[Retriever] Tìm trong Vector DB nội bộ
    │
    ▼
[Grading Node] LLM tự chấm điểm:
  "Tài liệu này có liên quan đến câu hỏi không?"
    │
    ├─ RELEVANCE = HIGH → Trả lời dựa trên tài liệu nội bộ ✅
    │
    └─ RELEVANCE = LOW  → Kích hoạt Web Search (Tavily API)
              │
              ▼
          [Web Search] Tìm trên Internet
              │
              ▼
          [Generator] Tổng hợp cả tài liệu nội bộ + kết quả web
              │
              ▼
          Trả lời kèm nguồn (nội bộ + web) 🌐
```

### Thư viện cần cài
```bash
pip install langgraph tavily-python
```

### Cấu trúc file mới
```
backend/
└── agents/
    ├── __init__.py
    └── crag_agent.py   ← File mới cần tạo
```

### Skeleton code `crag_agent.py`
```python
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from tavily import TavilyClient
from typing import TypedDict, List

class AgentState(TypedDict):
    question: str
    documents: List[dict]
    web_results: str
    answer: str
    relevance: str  # "high" | "low"

def grade_documents(state: AgentState) -> AgentState:
    """LLM chấm điểm xem tài liệu có liên quan không."""
    # TODO: Implement grading logic
    ...

def web_search(state: AgentState) -> AgentState:
    """Tìm kiếm web khi tài liệu nội bộ không đủ."""
    client = TavilyClient(api_key=TAVILY_API_KEY)
    results = client.search(state["question"])
    # TODO: Implement web search logic
    ...

def generate_answer(state: AgentState) -> AgentState:
    """Sinh câu trả lời từ tài liệu đã được lọc."""
    # TODO: Implement generation logic
    ...

# Xây dựng LangGraph workflow
workflow = StateGraph(AgentState)
workflow.add_node("grade", grade_documents)
workflow.add_node("web_search", web_search)
workflow.add_node("generate", generate_answer)
# ... thêm edges và conditions
```

---

## 📋 Bảng tổng hợp

| # | Kỹ thuật | File cần sửa/tạo | Độ khó | Tác động lên Ragas |
|---|----------|-----------------|--------|-------------------|
| 1 | **HyDE** | `backend/rag/retriever.py` | ⭐⭐ | ↑ Context Recall |
| 2 | **Semantic Chunking** | `backend/ingestion/chunker.py` | ⭐ | ↑ Context Precision |
| 3 | **CRAG (LangGraph Agent)** | `backend/agents/crag_agent.py` *(NEW)* | ⭐⭐⭐ | ↑ Answer Relevancy, loại bỏ "Không biết" |

## 🗓️ Đề xuất thứ tự triển khai

```
Tuần 1: Semantic Chunking  ← Dễ nhất, ít rủi ro, impact ngay lên chất lượng chunk
    │
    ▼
Tuần 2: HyDE               ← Trung bình, chỉ thêm 1 hàm vào retriever.py
    │
    ▼
Tuần 3: CRAG Agent         ← Phức tạp nhất, cần học LangGraph, thêm môi trường Tavily
```

---

*Advanced RAG Roadmap · v1.0 · Tài liệu nội bộ dự án E-Learning AI Assistant*
