# EduMind — Development Roadmap

> Tài liệu theo dõi các tính năng và cải tiến cần triển khai tiếp theo.
> Cập nhật lần cuối: 2026-06-17

---

## 🔴 Bug / Vấn đề kỹ thuật cần fix ngay

### 1. Fix `app.invoke()` block Async Event Loop

**Vấn đề:** Trong `chat_stream`, hàm `app.invoke()` (đồng bộ) được gọi bên trong `async event_generator()`. Điều này làm **block toàn bộ Uvicorn server** trong suốt thời gian Agent xử lý (30–60 giây), không thể nhận request khác.

**Giải pháp:** Bọc `app.invoke()` vào `asyncio.to_thread()` để chạy trong thread riêng:

```python
# Thay vì:
result = app.invoke(initial_state)

# Dùng:
result = await asyncio.to_thread(app.invoke, initial_state)
```

**File cần sửa:** `backend/api/routers/chat.py`

> ✅ **ĐÃ XỬ LÝ** — Cả 2 endpoint `/chat` và `/chat/stream` đã dùng `asyncio.to_thread()`.

---

### 2. Fix Evaluator parse sai kiểu dữ liệu

**Vấn đề:** Groq trả về kết quả dạng `list` thay vì `dict`, khiến hàm `evaluate_quiz_question()` fail khi gọi `.strip()` trên list. Hậu quả là điểm Giám khảo luôn = 10 (liệt), vòng lặp Self-Correction không thực sự hoạt động.

**Log lỗi:**
```
Lỗi chấm điểm: 'list' object has no attribute 'strip'
[GIÁM KHẢO] Lỗi parse điểm, cho điểm liệt = 10
```

**File cần sửa:** `backend/quiz/evaluator.py` + `backend/agent/nodes.py`

> ✅ **ĐÃ XỬ LÝ** — Thêm `_extract_content()` xử lý list/string, dùng `re.search()` tìm JSON block, `nodes.py` đọc `total_score` trực tiếp từ dict.

---

## 🟡 Nâng cấp Retrieval Pipeline

### 3. Cài đặt và test BM25 Hybrid Search

**Trạng thái:** Code đã được viết vào `backend/rag/retriever.py` nhưng chưa test.

**Việc cần làm:**
1. ~~Thêm `rank-bm25` vào `requirements.txt`~~ ✅ Đã thêm `rank-bm25==0.2.2`
2. Cài thư viện: `pip install rank-bm25==0.2.2` (teammate cần chạy lần đầu)
3. Khởi động lại Uvicorn và test pipeline qua giao diện Chat
4. Kiểm tra log terminal: phải thấy `BM25 Index đã sẵn sàng với X chunks`

**Kiến trúc Hybrid Search:**
```
Query
 ├── BM25 Sparse Search  (weight = 0.35) → Top 10 candidates
 └── Dense Vector Search (weight = 0.65) → Top 10 candidates (+ HyDE)
                ↓
     Weighted Score Fusion (merge & deduplicate)
                ↓
     Cross-Encoder Reranker (BAAI/bge-reranker-v2-m3)
                ↓
           Top K final chunks
```

---

### 4. Implement Semantic Chunking

**Vấn đề hiện tại:** `RecursiveCharacterTextSplitter` cắt theo độ dài ký tự cố định (600 chars), bất kể ngữ nghĩa — đôi khi cắt đứt giữa câu/đoạn văn hoàn chỉnh.

**Giải pháp:** Dùng `SemanticChunker` của LangChain — cắt dựa trên điểm gián đoạn ngữ nghĩa (breakpoints) bằng cách so sánh embedding của các câu liền kề.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings

embedder = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
splitter = SemanticChunker(embedder, breakpoint_threshold_type="percentile")
```

**File cần sửa:** `backend/ingestion/chunker.py`

> **Lưu ý:** Sau khi implement, cần **re-ingest toàn bộ tài liệu** để rebuild ChromaDB và BM25 Index với chunks mới.

---

## 📊 Đánh giá hệ thống (Evaluation)

### 5. Chạy Ragas đầy đủ — thêm `answer_relevancy`

**Hiện tại đang đo:** `context_precision`, `context_recall`, `faithfulness`

**Cần bổ sung:** `answer_relevancy` — đo mức độ câu trả lời có thực sự giải quyết câu hỏi của người dùng.

**File cần sửa:** `notebooks/03_evaluate_rag.ipynb`

```python
from ragas.metrics import (
    context_precision,
    context_recall,
    faithfulness,
    answer_relevancy,  # ← thêm cái này
)
```

---

### 6. So sánh 4 phiên bản RAG (Evaluation Matrix)

Sau khi có BM25 + Semantic Chunking, chạy lại Ragas để có bảng so sánh đầy đủ:

| Phiên bản | Chunking | Retrieval | Context Precision | Context Recall | Faithfulness | Answer Relevancy |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| **Basic RAG** | RecursiveChar | Dense Vector | `0.6204` | `0.6667` | `0.6458` | — |
| **Advanced RAG v1** | RecursiveChar | HyDE + Dense + Reranker | `0.7222` | `0.6000` | `0.6654` | — |
| **Advanced RAG v2** | RecursiveChar | HyDE + **BM25 Hybrid** + Reranker | ? | ? | ? | ? |
| **Advanced RAG v3** | **Semantic** | HyDE + BM25 Hybrid + Reranker | ? | ? | ? | ? |

---

### 7. Thêm Retrieval Metrics (IR Metrics) — Đo lường khả năng tìm kiếm độc lập

Để đánh giá Retrieval trực tiếp (không tốn chi phí gọi LLM API), chúng ta gán nhãn tập dữ liệu benchmark với `relevant_pages` (chứa trang chứa câu trả lời đúng).

**Cách tiếp cận & Thuật ngữ chuyên nghiệp:**
> *"Đánh giá offline trên bộ benchmark gồm X câu hỏi được gán nhãn từ các PDF đại diện. Dùng bộ benchmark này để so sánh tác động của từng chiến lược retrieval/chunking. Đối với các tài liệu mới do người dùng tải lên, hệ thống sẽ sử dụng online feedback và cơ chế LLM-as-a-Judge để theo dõi chất lượng."*

**Các chỉ số cần đo:**
* **Recall@5** (Quan trọng nhất): RAG cần tìm được ít nhất 1 chunk đúng trong Top 5.
* **MRR** (Mean Reciprocal Rank - Quan trọng nhất): Chunk đúng xuất hiện ở vị trí càng cao thì điểm càng tốt.
* **Hit Rate@5**: Tỷ lệ tìm thấy thông tin trong Top 5.
* **Precision@5** (Ít ưu tiên hơn vì dễ thấp và khó gán nhãn đầy đủ cho tất cả các chunk liên quan).

**Bảng Ma trận đánh giá độc lập Retrieval:**

| Version | Hit Rate@5 | Recall@5 | MRR | Ghi chú |
| :--- | :---: | :---: | :---: | :--- |
| **Basic RAG** | ? | ? | ? | Dense only |
| **Advanced v1** | ? | ? | ? | HyDE + Dense + Reranker |
| **Advanced v2** | ? | ? | ? | + BM25 Hybrid |
| **Advanced v3** | ? | ? | ? | + Semantic Chunking |

**File cần tạo:** `notebooks/04_evaluate_retrieval.ipynb`

---

## 🟢 Tính năng mới (Nice to have)

### 8. Kết nối Voice Chat vào Agent

**Vấn đề:** Endpoint `/api/v1/chat/voice` hiện vẫn gọi hàm RAG cũ, chưa đi qua LangGraph Agent.

**Giải pháp:** Sau khi Whisper transcribe audio thành text, thay vì gọi `await chat(request)`, inject thẳng vào `app.invoke()`.

**File cần sửa:** `backend/api/routers/chat.py` (hàm `voice_chat`)

---

### 9. Web Search Fallback Node

**Ý tưởng:** Khi RAG không tìm được chunk liên quan (Reranker score < threshold), Agent tự động fallback sang tìm kiếm web thay vì từ chối trả lời.

**Luồng:**
```
rag_node → confidence_check_node
                │
          Score thấp? → web_search_node (DuckDuckGo / Tavily)
          Score cao?  → trả kết quả RAG bình thường
```

**Thư viện:** `duckduckgo-search` (miễn phí, không cần API key) hoặc Tavily API

---

## 🐳 Docker & Deploy (Tinh gọn cho Intern)

### 1. Cấu hình Docker Compose tối giản (Mức nên làm ngay)
Tránh quá tải tài nguyên và giữ dự án tập trung vào AI, Docker Compose chỉ thiết lập 4 core services chính:
* `backend`: Dockerfile chạy FastAPI backend.
* `frontend`: Dockerfile chạy React (Vite) frontend.
* `redis`: Dùng làm caching layer.
* `chroma`/`qdrant`: Vector Database.

*(Chuyển các thành phần: Nginx, worker Celery/ARQ, Postgres, Cloudflare R2, resource limits, healthchecks đầy đủ xuống nhóm "Chưa cần ngay/Phase sau" để tránh biến dự án thành DevOps).*

### 2. Lộ trình triển khai 7 bước
1. Viết `Dockerfile` cho Backend.
2. Viết `Dockerfile` cho Frontend.
3. Cấu hình `docker-compose.yml` để chạy thử dưới local.
4. Cập nhật `README.md` hướng dẫn sử dụng: `docker compose up`.
5. Deploy Frontend lên **Vercel** (Miễn phí, CI/CD tự động từ GitHub).
6. Deploy Backend lên **Render/Railway** (Dưới dạng Docker container).
7. Thiết lập **GitHub Actions** (`.github/workflows/ci.yml`) để tự động chạy `pytest` và chạy thử `docker build` kiểm tra lỗi.

---

## 🏁 Hoàn thiện dự án

### 10. Merge branch vào `main`

**Hiện tại:** Toàn bộ tính năng đang ở branch `feature/chat-voice-api-docs`

```bash
git checkout main
git merge feature/chat-voice-api-docs
git push origin main
```

### 11. Pin versions trong `requirements.txt`

Đảm bảo `requirements.txt` có version cụ thể để người khác cài đặt được môi trường tương tự, tránh xung đột dependency.

> ✅ **ĐÃ XỬ LÝ** — `requirements.txt` đã được viết lại với đúng version thực tế từ môi trường `elearning` (bao gồm `langchain==1.3.9`, `langgraph==1.2.5`, `rank-bm25==0.2.2`...).

---

## Thứ tự ưu tiên đề xuất mới

```
1. Fix async blocking (Bug #1)          → ĐÃ XỬ LÝ
2. Fix Evaluator parse lỗi (Bug #2)     → ĐÃ XỬ LÝ (đảm bảo _extract_content)
3. Cài đặt & Tích hợp BM25 (#3)         → Đang thực hiện (Cập nhật requirements.txt & cài đặt)
4. Tích hợp Semantic Chunking (#4)      → Đang thực hiện (Cập nhật chunker.py)
5. Đo lường Retrieval & RAGAS (#5, #7)  → Chạy thử notebook 03 & 04 để ghi nhận các chỉ số Recall@5/MRR
6. Dockerize tinh gọn (4 services)      → Viết Dockerfile & docker-compose.yml chạy local
7. Triển khai CI/CD & Cloud Deploy      → Deploy Vercel/Railway + GitHub Actions
8. Voice Chat & RAG Web Search Fallback → Phát triển mở rộng (Nice to have)
```
