# EduMind — Strategic Upgrade Roadmap
### Từ *Multimodal RAG Platform* → *Agentic Multimodal Learning Platform*

> Phân tích dựa trên codebase thực tế (2026-06-25).
> Mục tiêu: CV AI Engineer Intern với portfolio nổi bật.

---

## 🗺️ Vị trí hiện tại của dự án

```
PDF Chatbot          ← Level 1 (đã qua lâu)
Multimodal RAG       ← Level 2 (đang ở đây)
Agentic AI Platform  ← Level 3 (đang hướng tới)
```

### ✅ Đã có trong codebase (thực sự, đã verify)

| Component | File thực tế | Trạng thái |
|---|---|---|
| LangGraph Agent | `backend/agent/graph.py` | ✅ Đang chạy |
| Router Node | `backend/agent/nodes.py` | ✅ router → rag / quiz |
| Hybrid RAG (BM25+Dense+Rerank) | `backend/rag/retriever.py` | ✅ Full pipeline |
| HyDE | `backend/rag/retriever.py` | ✅ `generate_hypothetical_document()` |
| Cross-Encoder Reranker | `backend/rag/retriever.py` | ✅ BAAI/bge-reranker-v2-m3 |
| Quiz Generator + Self-Correction | `backend/agent/graph.py` | ✅ evaluate_quiz loop |
| Slide Generator | `backend/slides/` | ✅ pptx + visual story |
| Voice Transcription | `backend/voice/transcriber.py` | ✅ Whisper |
| Qdrant | `backend/db/vector_store.py` | ✅ đã migrate |
| JWT Auth | `backend/api/` | ✅ middleware stack |
| Citation | `backend/agent/nodes.py` | ✅ metadata tracking |

### ❌ Chưa có (xác nhận từ code + docs)

- Agent với nhiều hơn 2 node specialist (chỉ có router → rag/quiz)
- ColPali / Visual Embedding (image hiện chỉ → Gemini Vision → text)
- Video Understanding (Whisper chỉ transcribe audio riêng lẻ)
- Adaptive Quiz (không có student model / history)
- Knowledge Graph / GraphRAG
- Celery + Redis Task Queue
- CI/CD pipeline
- Multi-tenancy isolation

---

## 🎯 Phân tích 7 Hướng — Honest Assessment

---

### Hướng 1 — ColPali / ColQwen2 Visual Retrieval

**Gap thực tế:** `backend/ingestion/pdf_parser.py` + `ingestion/chunker.py` hiện tại:
```
PDF → PyMuPDF → Text → BGE-M3 Embed → Qdrant
Image → Gemini Vision → Text Description → BGE-M3 Embed → Qdrant
```
Embedded images trong PDF **không được extract**. Layout, bảng, biểu đồ → mất hết.

**Giải pháp ColPali:**
```
PDF Page → render thành image → ColPali/ColQwen2 → late interaction embedding → Qdrant
```

**Trade-offs thực tế:**
| | Hiện tại | ColPali |
|---|---|---|
| GPU requirement | CPU OK | VRAM 8-16GB (ColQwen2-2B) |
| Indexing speed | Nhanh | 5-10x chậm hơn |
| Layout/Table/Chart | Mất | Giữ nguyên |
| Hosting cost | Thấp | Cao hơn |

> [!IMPORTANT]
> ColPali cần GPU có VRAM 8GB+. Nếu chỉ có CPU/free tier, dùng **ColQwen2-2B** (quantized) hoặc fallback sang **PDF → image → GPT-4o Vision** cho prototype nhanh.

**CV Impact:** ⭐⭐⭐⭐⭐ Rất cao — ColPali là SOTA 2024-2025, interviewer sẽ ấn tượng.

**Độ khó:** Medium-Hard (phụ thuộc vào GPU)

**File cần tạo/sửa:**
```
backend/ingestion/colpali_parser.py    [NEW]
backend/db/vector_store.py             [MODIFY] — thêm collection riêng cho visual embeddings
backend/rag/retriever.py               [MODIFY] — hybrid: text + visual retrieval
```

---

### Hướng 2 — Agentic Learning System (LangGraph Multi-Agent)

**Gap thực tế:** `backend/agent/graph.py` hiện tại chỉ có:
```python
router → rag       (nếu intent != "quiz")
router → generate_quiz → evaluate_quiz   (nếu intent == "quiz")
```

Không có: Tutor Agent, Slide Agent, Research Agent, Learning Coach.

**Kiến trúc đề xuất:**
```
User Query
    ↓
Router Agent (phân loại intent)
    ├─ "explain" → Tutor Agent    → RAG + Socratic prompting
    ├─ "quiz"    → Quiz Agent     → generate + evaluate (đã có)
    ├─ "slide"   → Slide Agent    → topic extract + slide gen (đã có)
    ├─ "search"  → Research Agent → RAG + Web fallback (DuckDuckGo)
    └─ "coach"   → Coach Agent    → review history + learning plan
```

**Điều quan trọng:** Các "agent" này không cần model riêng. Đây là **LangGraph nodes** với system prompt và tools khác nhau. Bạn đã có LangGraph rồi (`langgraph==1.2.5` trong requirements.txt).

**CV Impact:** ⭐⭐⭐⭐⭐ Cao nhất — JD AI Engineer luôn hỏi "multi-agent", "tool calling", "workflow".

**Độ khó:** Medium (bạn đã biết LangGraph)

**File cần sửa:**
```
backend/agent/graph.py    [MODIFY] — mở rộng thêm nodes
backend/agent/nodes.py    [MODIFY] — thêm tutor_node, slide_node, research_node
backend/agent/state.py    [MODIFY] — thêm fields: intent_detail, agent_name, tool_calls
```

> [!TIP]
> **Quick win:** Chỉ cần tách `rag_node` thành `tutor_node` (với Socratic system prompt) và thêm `research_node` (rag + web fallback) là đã có "3 chuyên gia AI" để demo.

---

### Hướng 3 — Lecture Video Understanding

**Gap thực tế:** `backend/voice/transcriber.py` có Whisper nhưng chỉ transcribe audio input, không xử lý video file.

**Kiến trúc đầy đủ:**
```
Lecture Video (.mp4)
    ↓
Extract Audio → Whisper → Transcript với timestamps
    ↓
Slide Detection (frame sampling + CLIP/VGG)
    ↓
Chunk theo segment (mỗi "topic change" = 1 chunk)
    ↓
Embed transcript + timestamp metadata → Qdrant
    ↓
Query: "Thầy giải thích Gradient Descent ở đâu?"
Answer: "Video: Lecture_03.mp4 | Timestamp: 00:13:42"
```

**CV Impact:** ⭐⭐⭐⭐ Cao — tính năng độc đáo, ít người làm.

**Độ khó:** Medium (Whisper đã có, thêm ffmpeg + timestamp parsing)

**File cần tạo:**
```
backend/ingestion/video_parser.py    [NEW]
backend/api/routers/ingest.py        [MODIFY] — accept .mp4
```

---

### Hướng 4 — Visual Question Answering (VQA)

**Gap thực tế:** `backend/ingestion/pdf_parser.py` dùng Gemini Flash Vision để convert image → text description. VQA là bước tiếp theo: cho phép hỏi trực tiếp về hình ảnh.

**Pipeline đề xuất (dùng Gemini — không cần model riêng):**
```
User upload image + câu hỏi
    ↓
Gemini Flash Vision (multimodal input)
    ↓
Trả lời câu hỏi với context từ RAG
```

**CV Impact:** ⭐⭐⭐ Trung bình — Gemini Vision đã làm được, nhưng cần expose thành endpoint riêng.

**Độ khó:** Easy (Gemini API đã có trong project)

**File cần sửa:**
```
backend/api/routers/chat.py    [MODIFY] — accept image input kèm query
backend/agent/nodes.py         [MODIFY] — multimodal rag_node
```

---

### Hướng 5 — Adaptive Quiz Generation

**Gap thực tế:** `backend/quiz/` + agent `generate_quiz_node` chỉ dùng topic → questions. Không có student model.

**Schema cần thêm (SQLite/Postgres):**
```sql
CREATE TABLE student_performance (
    user_id     TEXT,
    topic       TEXT,
    score       REAL,
    difficulty  TEXT,   -- easy/medium/hard
    created_at  TIMESTAMP
);
```

**Adaptive Logic:**
```python
weak_topics = get_weak_topics(user_id, threshold=0.6)
mastery = calculate_mastery(user_id, topic)
difficulty = "hard" if mastery > 0.8 else "medium" if mastery > 0.5 else "easy"
quiz = generate_quiz(topic=weak_topics[0], difficulty=difficulty)
```

**CV Impact:** ⭐⭐⭐⭐ Cao — giống Duolingo, rất hợp EdTech narrative.

**Độ khó:** Medium (cần thêm DB schema + tracking logic)

**File cần tạo/sửa:**
```
backend/db/student_model.py    [NEW]
backend/quiz/adaptive.py       [NEW]
backend/api/routers/quiz.py    [MODIFY]
```

---

### Hướng 6 — Knowledge Graph RAG (GraphRAG)

**Gap thực tế:** Retrieval pipeline đã tốt (BM25 + Dense + HyDE + Reranker). GraphRAG là upgrade research-level.

**Kiến trúc:**
```
Chunks → spaCy/LLM → Entity Extraction → Neo4j Graph
                                            ↓
Query → Entity Recognition → Graph Traversal → Relevant Subgraph
                                            ↓
                                       Generator LLM
```

**CV Impact:** ⭐⭐⭐ Trung bình — ấn tượng về research nhưng ít intern JD yêu cầu.

**Độ khó:** Hard — cần Neo4j, entity extraction pipeline, graph traversal logic.

> [!WARNING]
> GraphRAG là "nice to have" cuối cùng. Đừng làm trước Hướng 1-3, nó tốn thời gian nhiều mà không tỉ lệ với CV impact cho intern level.

---

### Hướng 7 — MLOps & Production Hardening

**Gap thực tế** (từ architecture.md `Production Gap Tracker`):
- ❌ Async Task Queue (Celery/ARQ) — slide gen block request thread
- ❌ Redis Cache — same query embed lại mỗi lần
- ❌ Rate Limit cho Gemini API (15 req/min)
- ❌ Batch Embedding khi ingest
- ❌ Docker Production + CI/CD

**Stack đề xuất:**
```
FastAPI → Celery Worker → Redis (broker + cache)
               ↓
         Qdrant (vector) + SQLite→Postgres (metadata)
```

**CV Impact:** ⭐⭐⭐⭐ Cao — "Production-ready" là keyword trong mọi AI Engineer JD.

**Độ khó:** Medium — Docker + Celery khá template-izable.

---

## 📋 Thứ tự ưu tiên — Tối ưu cho CV AI Engineer Intern

```
PHASE 1 — "Agentic" (2-3 tuần)         Impact/Effort ratio: CAO NHẤT
├─ [1a] Mở rộng LangGraph: thêm Tutor, Research, Coach nodes
├─ [1b] Web Search Fallback (DuckDuckGo) cho Research Agent
└─ [1c] Expose agent name + tool calls trong response (transparency)

PHASE 2 — "Multimodal Upgrade" (2-3 tuần)
├─ [2a] VQA endpoint (image + query → Gemini Vision → answer)
└─ [2b] ColPali pipeline (nếu có GPU) HOẶC PDF→image→GPT4o-mini (nếu không)

PHASE 3 — "Lecture Video" (1-2 tuần)
└─ [3a] Video ingestion: ffmpeg + Whisper timestamp → Qdrant

PHASE 4 — "Adaptive Learning" (1-2 tuần)
├─ [4a] Student performance DB schema
└─ [4b] Adaptive quiz difficulty

PHASE 5 — "MLOps" (1-2 tuần, song song với các phase trên)
├─ [5a] Docker Compose (backend + frontend + redis + qdrant)
├─ [5b] Celery + Redis cho long tasks (slide gen, video ingestion)
└─ [5c] GitHub Actions CI

PHASE 6 — "Research" (optional, sau khi có job)
└─ [6a] GraphRAG với Microsoft GraphRAG hoặc LlamaIndex
```

---

## 🏆 Kết quả kỳ vọng

### Sau Phase 1+2:
```
CV Headline:
"Agentic Multimodal E-Learning Platform với LangGraph Multi-Agent,
ColPali Visual Retrieval, và Hybrid RAG (BM25+Dense+HyDE+Reranker)"
```

### Sau Phase 1+2+3:
```
CV Headline:
"Full-stack AI Learning Platform: Multi-Agent (LangGraph), 
Lecture Video RAG với Whisper timestamp indexing,
ColPali Visual Retrieval, Adaptive Quiz Engine"
```

---

## ⚠️ Open Questions cần quyết định

> [!IMPORTANT]
> **Q1: GPU availability cho ColPali?**
> - Có GPU (VRAM 8GB+): dùng ColQwen2-2B natively
> - Không có GPU: dùng Gemini 1.5 Flash để render page → describe → embed (cheaper but loses layout)
> - Prototype nhanh: dùng GPT-4o-mini Vision API per page (trả phí nhưng không cần GPU)

> [!IMPORTANT]
> **Q2: Deployment target cho intern portfolio?**
> - Local demo only → Bỏ qua Celery, Redis
> - Cloud deploy (Render/Railway) → Cần Docker + Redis
> - Full production → Cần tất cả Phase 5

> [!NOTE]
> **Q3: Adaptive Quiz — dùng DB nào?**
> - SQLite (đơn giản, đang có) → OK cho demo
> - Postgres (production) → Cần Docker

> [!NOTE]
> **Q4: LLaVA / MiniCPM-V hay Gemini cho VQA?**
> - Gemini Flash Vision (đang có API key) → deploy ngay, không cần server
> - LLaVA / MiniCPM-V → cần GPU, self-hosted, ấn tượng CV hơn nhưng phức tạp hơn nhiều

---

## 📊 Ma trận quyết định cuối

| Hướng | CV Impact | Độ khó | Thời gian | Khuyến nghị |
|---|:---:|:---:|:---:|:---:|
| 1. Agentic LangGraph | ⭐⭐⭐⭐⭐ | Medium | 2-3 tuần | ✅ **Làm ngay** |
| 2. ColPali Visual | ⭐⭐⭐⭐⭐ | Hard | 2-3 tuần | ✅ **Sau Phase 1** |
| 3. Video RAG | ⭐⭐⭐⭐ | Medium | 1-2 tuần | ✅ **Phase 3** |
| 4. Adaptive Quiz | ⭐⭐⭐⭐ | Medium | 1-2 tuần | ✅ **Phase 4** |
| 4b. VQA | ⭐⭐⭐ | Easy | < 1 tuần | ✅ **Quick win Phase 2** |
| 5. MLOps | ⭐⭐⭐⭐ | Medium | 1-2 tuần | ✅ **Song song** |
| 6. GraphRAG | ⭐⭐⭐ | Hard | 3-4 tuần | ⏳ **Sau khi có job** |

---

*Cập nhật: 2026-06-25 | Dựa trên codebase verify thực tế*
