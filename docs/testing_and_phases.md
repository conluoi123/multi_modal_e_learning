# ✅ Testing Checklist & Hướng Phát Triển Từng Phase

> **E-Learning AI Assistant** — Multimodal RAG System  
> Mỗi phase phải pass hết checklist trước khi chuyển sang phase tiếp theo.

---

## Tổng Quan Các Phase

```
Phase 0          Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
Foundation   →   Core RAG     →   Image +      →   Advanced     →   Production   →   Hardening
(Tuần 1–2)       (Tuần 3–4)       Slide Gen    →   RAG          →   Deploy +         & Security
                                  (Tuần 5–7)       (Tuần 8–9)       Eval + Quiz      (Vượt chuẩn)
                                                                    (Tuần 10)

Setup môi         Text RAG         Vision +         Hybrid search    Docker +         Async queue
trường +          thuần text       Slide            Reranker +       RAGAS +          Rate limit
hiểu khái         trên PDF         Generator        Citation         Streamlit UI     Redis cache
niệm cốt lõi      đầy đủ           pipeline         chính xác        hoàn chỉnh       SSE stream
```

---

## Phase 0 — Foundation (Tuần 1–2)

### 🎯 Mục tiêu
Hiểu các khái niệm nền tảng, setup môi trường không lỗi, chạy được "Hello World" của từng component.

### 📚 Cần học trước
- Token, temperature, system prompt, context window là gì
- Embedding vector là gì — tại sao 2 câu gần nghĩa lại có vector gần nhau
- Cosine similarity hoạt động ra sao
- Vector database khác relational database ở điểm nào

### 🔧 Hướng phát triển

```
Tuần 1:
├── Cài Python 3.11 + venv + pip
├── Lấy Gemini API key (Google AI Studio — free)
├── Gọi Gemini Flash API bằng Python, in ra response
├── Cài Ollama → pull llama3.1:8b → chat thử trong terminal
└── Thực hành thay đổi system prompt, quan sát kết quả thay đổi

Tuần 2:
├── Load BAAI/bge-m3 từ HuggingFace
├── Embed 20 câu khác nhau → print vector shape (1024,)
├── Tính cosine similarity thủ công giữa các cặp câu
├── Visualize bằng matplotlib (PCA 2D) — thấy cluster ngữ nghĩa
└── Cài ChromaDB → insert 50 docs → query similarity search
```

### ✅ Test Checklist Phase 0

#### Môi trường
- [ ] `python --version` trả về 3.11.x
- [ ] `pip install langchain chromadb sentence-transformers` không lỗi
- [ ] Gemini API key hợp lệ, gọi được chat completion
- [ ] Ollama chạy được, `ollama run llama3.1:8b` respond trong < 60s

#### Hiểu khái niệm (tự kiểm tra — trả lời được không)
- [ ] Giải thích được tại sao chunk_overlap quan trọng
- [ ] Giải thích được cosine similarity = 1.0 nghĩa là gì
- [ ] Biết phân biệt embedding model và LLM (chat model)
- [ ] Hiểu tại sao cùng nội dung nhưng embed khác ngôn ngữ → vector khác nhau

#### Kỹ thuật
- [ ] Script embed 1 câu → in ra vector có shape `(1024,)` ✓
- [ ] ChromaDB: insert 50 docs → query → trả về top-3 gần nhất đúng ngữ nghĩa ✓
- [ ] Cosine similarity(câu A, câu B gần nghĩa) > cosine similarity(câu A, câu C khác nghĩa) ✓

```python
# Test case cụ thể để verify
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

model = SentenceTransformer("BAAI/bge-m3")
sentences = [
    "Tích phân là gì?",                    # query
    "Tích phân là phép toán ngược của đạo hàm",   # liên quan
    "Thời tiết hôm nay rất đẹp",           # không liên quan
]
embeddings = model.encode(sentences)
sim_related = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
sim_unrelated = cosine_similarity([embeddings[0]], [embeddings[2]])[0][0]

assert sim_related > sim_unrelated, "FAIL: embedding không phân biệt được ngữ nghĩa"
assert sim_related > 0.7,          "FAIL: similarity câu liên quan phải > 0.7"
print(f"PASS ✓  related={sim_related:.3f}  unrelated={sim_unrelated:.3f}")
```

---

## Phase 1 — Core RAG trên Text (Tuần 3–4)

### 🎯 Mục tiêu
Xây được pipeline RAG hoàn chỉnh trên PDF: upload → chunk → embed → store → query → answer có nguồn. **Không dùng LangChain RAG chain — tự viết từng bước để hiểu.**

### 🔧 Hướng phát triển

```
Tuần 3 — Ingestion:
├── Viết pdf_parser.py: PyMuPDF extract text từng trang
├── Viết chunker.py: RecursiveCharacterTextSplitter
├── In ra chunk đầu tiên + metadata → đọc xem có hợp lý không
├── Embed tất cả chunks → insert vào ChromaDB
└── Kiểm tra: ChromaDB có đúng số chunk không

Tuần 4 — Retrieval & Generation:
├── Viết retriever.py: embed query → cosine search → top-5 chunks
├── Viết generator.py: format prompt + gọi LLM → response
├── Kết nối end-to-end: pdf → chunks → db → query → answer
├── Thêm source citation vào response
└── Wrap vào FastAPI: POST /ingest + POST /query
```

### ✅ Test Checklist Phase 1

#### Unit Tests

**pdf_parser.py**
- [ ] Parse PDF 50 trang → số chunk output > 0
- [ ] Mỗi chunk có đủ field: `text`, `source`, `page`, `chunk_id`
- [ ] Không có chunk nào có `text` rỗng hoặc chỉ toàn whitespace
- [ ] Page số đúng — chunk từ trang 3 phải có `metadata.page == 3`
- [ ] PDF scan (ảnh) → không crash, trả về empty hoặc OCR fallback

```python
# test_pdf_parser.py
def test_parser_basic():
    chunks = ingest_pdf("tests/fixtures/sample.pdf")
    assert len(chunks) > 0
    assert all(c["text"].strip() for c in chunks)
    assert all("page" in c["metadata"] for c in chunks)

def test_parser_page_numbers():
    chunks = ingest_pdf("tests/fixtures/sample.pdf")
    pages = [c["metadata"]["page"] for c in chunks]
    assert min(pages) >= 1
    assert max(pages) <= 100  # adjust to actual page count
```

**chunker.py**
- [ ] chunk_size=600: không có chunk nào vượt quá 700 tokens
- [ ] chunk_overlap=120: 2 chunk liên tiếp có ít nhất 80 token trùng nhau
- [ ] Không tách câu ở giữa (splitter ưu tiên ngắt theo `\n\n` trước)

**retriever.py**
- [ ] Query câu liên quan → chunk top-1 có cosine score > 0.75
- [ ] Query câu hoàn toàn không liên quan → top-1 score < 0.5
- [ ] Trả về đúng K chunks (K=5)
- [ ] Metadata đính kèm đầy đủ trong kết quả

**generator.py**
- [ ] Response không rỗng với context hợp lệ
- [ ] Khi context rỗng → LLM trả lời "không tìm thấy thông tin" (không hallucinate)
- [ ] Citation xuất hiện trong response khi có source_documents

#### Integration Tests (End-to-End)

```
Test E2E 1 — Happy path:
  Input:  sample.pdf (50 trang về Giải tích)
          Query: "Đạo hàm của hàm hợp là gì?"
  Expect: - Answer có chứa "chain rule" hoặc "quy tắc dây chuyền"
          - Citation trỏ đúng trang trong PDF
          - Latency < 15s (CPU)

Test E2E 2 — Out-of-scope query:
  Input:  sample.pdf (Giải tích)
          Query: "Lịch sử Việt Nam thời Lý"
  Expect: - Answer thừa nhận không tìm thấy
          - KHÔNG bịa thông tin về lịch sử

Test E2E 3 — Multi-doc retrieval:
  Input:  giai_tich.pdf + xac_suat.pdf (2 file khác nhau)
          Query: "Phân phối chuẩn liên quan gì đến tích phân?"
  Expect: - Chunks đến từ CẢ HAI file trong context
          - Citation ghi rõ file nào, trang nào
```

#### API Tests

```bash
# Test ingestion
curl -X POST http://localhost:8000/api/v1/ingest \
  -F "file=@sample.pdf"
# Expected: {"status":"ok","chunks":47,"doc_id":"abc123"}

# Test query
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Đạo hàm là gì?","doc_id":"abc123"}'
# Expected: {"answer":"...","citations":[{"file":"sample.pdf","page":12}]}

# Test health
curl http://localhost:8000/health
# Expected: {"status":"healthy","vector_db":"connected","llm":"connected"}
```

#### Performance Benchmarks Phase 1

| Metric | Ngưỡng chấp nhận | Lý tưởng |
|--------|-----------------|---------|
| Ingestion 50-trang PDF | < 60s | < 20s |
| Query latency (no rerank) | < 10s | < 5s |
| Embedding throughput | > 10 chunks/s | > 50 chunks/s |
| ChromaDB insert 500 chunks | < 5s | < 2s |

---

## Phase 2 — Image Pipeline + Slide Generator (Tuần 5–7)

### 🎯 Mục tiêu
Mở rộng pipeline hỗ trợ ảnh (Vision LLM) và triển khai tính năng **sinh slide bài học từ nội dung tài liệu** — tính năng phân biệt hệ thống này với RAG thông thường.

### 🔧 Hướng phát triển

```
Tuần 5 — Image Pipeline:
├── Setup Gemini Flash API (đã có từ Phase 0)
├── Viết image_describer.py: encode ảnh base64 → gọi Gemini Vision
├── Test với 5 loại ảnh: sơ đồ, biểu đồ, bài toán, bảng, text scan
├── Embed description → insert vào ChromaDB
└── Flow: user upload ảnh + câu hỏi → describe → augment query → RAG

Tuần 6 — Slide Generator Core:
├── Viết slide_generator.py với Pydantic schema (SlideContent, SlidePresentation)
├── Implement 2-step LLM: outline → per-slide content generation
├── Tham số hoá: grade_level, difficulty → thay đổi prompt
├── Test: 5 topic khác nhau → verify schema hợp lệ
└── Cài python-pptx → render SlidePresentation → file .pptx

Tuần 7 — Tích hợp & Test:
├── Wrap Slide Generator vào FastAPI: POST /api/v1/slides/generate
├── GET /api/v1/slides/download/{job_id} → trả về file .pptx
├── Verify citation đúng nguồn tài liệu
├── Xử lý edge case: topic không có trong DB, số slide quá lớn
└── Preview slide trong Streamlit (HTML render)
```

### ✅ Test Checklist Phase 2

#### Image Tests

**image_describer.py (Gemini Vision)**
- [ ] Ảnh sơ đồ tam giác → description chứa "tam giác", "góc", hoặc ký tự hình học
- [ ] Ảnh bảng số liệu → description chứa các con số từ bảng
- [ ] Ảnh bài toán có công thức → description chứa LaTeX hoặc ký hiệu toán
- [ ] Ảnh mờ/tối → trả về best-effort description, không crash
- [ ] Ảnh không liên quan học tập → vẫn mô tả được, không từ chối

```python
# test_image.py
def test_image_with_formula():
    desc = describe_image("tests/fixtures/integral_formula.png")
    assert len(desc) > 50, "Description quá ngắn"
    math_indicators = ["∫", "integral", "tích phân", "dx", "="]
    assert any(ind in desc for ind in math_indicators), \
        f"Không nhận ra công thức toán trong ảnh. Got: {desc[:200]}"

def test_image_augmented_query():
    desc = describe_image("tests/fixtures/diagram.png")
    query = "Giải thích sơ đồ này"
    augmented = f"{query}\n[Nội dung ảnh: {desc}]"
    result = rag_query(augmented)
    assert len(result["answer"]) > 100
```

**Cross-modality retrieval**
- [ ] Query liên quan đến ảnh đã upload → ít nhất 1 trong top-5 là image chunk
- [ ] Query liên quan đến PDF → ít nhất 1 trong top-5 là text chunk
- [ ] Metadata filter `source_type=image` → chỉ trả về image chunks

#### Slide Generator Tests

**slide_generator.py — Schema validation**
- [ ] Generate 8 slide về topic có trong DB → đúng 8 SlideContent object
- [ ] Mỗi SlideContent có: `title` không rỗng, `bullets` có 3–5 phần tử, `speaker_notes` > 50 ký tự
- [ ] `slide_number` tăng dần từ 1 đến n, không trùng
- [ ] `sources` không rỗng — phải có ít nhất 1 citation từ tài liệu

```python
# test_slide_generator.py
from pydantic import BaseModel

def test_slide_schema():
    result = generate_slides(
        topic="Đạo hàm hàm hợp",
        grade_level="Lớp 12",
        difficulty="standard",
        n_slides=6
    )
    pres = SlidePresentation(**result)
    assert len(pres.slides) == 6
    for slide in pres.slides:
        assert len(slide.title) > 5
        assert 3 <= len(slide.bullets) <= 5
        assert len(slide.speaker_notes) > 50
    assert len(pres.sources) > 0

def test_slide_numbers_sequential():
    result = generate_slides(topic="Xác suất", grade_level="Đại học",
                             difficulty="basic", n_slides=5)
    pres = SlidePresentation(**result)
    nums = [s.slide_number for s in pres.slides]
    assert nums == list(range(1, 6)), f"slide_number không sequential: {nums}"
```

**slide_generator.py — Grade & Difficulty adjustment**
- [ ] grade_level="Lớp 10": bullets không chứa ký hiệu toán phức tạp (∂, ∇, ∑)
- [ ] grade_level="Đại học": bullets có thể chứa notation chuyên sâu
- [ ] difficulty="basic": không có bài tập trong speaker_notes
- [ ] difficulty="advanced": speaker_notes có đề cập đến bài tập hoặc câu hỏi mở

```python
# test_slide_difficulty.py
def test_basic_no_exercises():
    result = generate_slides(topic="Xác suất", grade_level="Lớp 12",
                             difficulty="basic", n_slides=4)
    pres = SlidePresentation(**result)
    exercise_keywords = ["bài tập", "exercise", "làm bài", "tính toán sau"]
    for slide in pres.slides:
        notes_lower = slide.speaker_notes.lower()
        # basic mode: không nên có bài tập trong notes
        has_exercise = any(k in notes_lower for k in exercise_keywords)
        # Chỉ warn, không fail cứng vì LLM không deterministic
        if has_exercise:
            print(f"WARNING: slide {slide.slide_number} có exercise trong basic mode")
```

**python-pptx rendering**
- [ ] Generate → render .pptx → file tồn tại và size > 5KB
- [ ] .pptx mở được bằng LibreOffice/PowerPoint không lỗi
- [ ] Số slide trong file .pptx = `n_slides` yêu cầu
- [ ] Title của mỗi slide trong .pptx khớp với `SlideContent.title`

```python
# test_pptx_render.py
from pptx import Presentation
import os

def test_pptx_file_valid():
    job_id = generate_and_render(topic="Đạo hàm", grade_level="Lớp 12",
                                  difficulty="standard", n_slides=5)
    path = f"data/slides/{job_id}.pptx"
    assert os.path.exists(path)
    assert os.path.getsize(path) > 5000  # > 5KB

    prs = Presentation(path)
    assert len(prs.slides) == 5
```

**API endpoint**
- [ ] `POST /api/v1/slides/generate` → 200 với `job_id`, `download` URL, `slide_count`
- [ ] `GET /api/v1/slides/download/{job_id}` → trả về file .pptx (Content-Type: application/vnd.openxmlformats...)
- [ ] Topic không có trong DB → 200 với warning message, không crash
- [ ] n_slides > 20 → 400 Bad Request (giới hạn hợp lý)

```bash
# Test slide generation API
curl -X POST http://localhost:8000/api/v1/slides/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Định lý Bayes","grade_level":"Đại học","difficulty":"standard","n_slides":6}'
# Expected: {"job_id":"uuid-xxx","slide_count":6,"download":"/api/v1/slides/download/uuid-xxx","sources":["xac_suat.pdf p.23"]}

# Download file
curl -O http://localhost:8000/api/v1/slides/download/uuid-xxx
# Expected: file .pptx được tải về
```

#### Performance Benchmarks Phase 2

| Metric | Ngưỡng chấp nhận | Lý tưởng |
|--------|-----------------|---------|
| Image describe (Gemini Vision) | < 5s/ảnh | < 3s/ảnh |
| Slide generation 8 slides | < 60s | < 40s |
| .pptx render (python-pptx) | < 3s | < 1s |
| Augmented image query | < 15s total | < 8s total |

---

## Phase 3 — Advanced RAG (Tuần 8–9)

### 🎯 Mục tiêu
Nâng accuracy lên đáng kể bằng hybrid search, reranking, và HyDE. Implement citation chính xác đến trang. Đạt ngưỡng RAGAS để pass.

### 🔧 Hướng phát triển

```
Tuần 8 — Hybrid Search + Reranker:
├── Cài rank_bm25: pip install rank-bm25
├── Xây BM25 index song song với vector index
├── Implement RRF (Reciprocal Rank Fusion) để merge kết quả
├── Cài CrossEncoder: sentence-transformers/ms-marco-MiniLM-L-12-v2
└── Đo RAGAS trước/sau → so sánh delta

Tuần 9 — HyDE + Citation + Query History:
├── Implement HyDE: query → LLM generate hypothetical answer → embed
├── Implement context compression: loại bỏ câu không liên quan trong chunk
├── Citation chính xác: response ghi [file, trang X]
├── Conversation history: multi-turn Q&A nhớ context cũ
└── Streamlit UI: hiển thị citations có thể click expand
```

### ✅ Test Checklist Phase 3

#### Hybrid Search Tests
- [ ] Query từ khoá cụ thể (tên định lý, số liệu): BM25 score > vector score
- [ ] Query ngữ nghĩa (paraphrase): vector score > BM25 score
- [ ] RRF merge: top-5 sau merge tốt hơn top-5 chỉ dùng vector (đo RAGAS)
- [ ] BM25 index rebuild khi thêm document mới

```python
# test_hybrid_search.py
def test_keyword_query_benefits_from_bm25():
    query = "Euler-Lagrange 1744"      # tên + năm → keyword search mạnh hơn
    vector_results = vector_search(query, k=5)
    hybrid_results = hybrid_search(query, k=5)
    ground_truth_chunk_id = "euler_lagrange_p24_c1"
    vector_rank = get_rank(vector_results, ground_truth_chunk_id)
    hybrid_rank = get_rank(hybrid_results, ground_truth_chunk_id)
    assert hybrid_rank <= vector_rank, \
        f"Hybrid ({hybrid_rank}) không tốt hơn vector ({vector_rank}) cho keyword query"
```

#### Reranker Tests
- [ ] Top-5 sau rerank có Faithfulness score cao hơn trước rerank (đo thủ công 10 câu)
- [ ] Reranker latency < 3s cho 15 candidates (CPU)
- [ ] Reranker score: relevant chunk > 0.7, irrelevant chunk < 0.3

#### HyDE Tests
- [ ] Query mơ hồ: HyDE retrieval tốt hơn direct query retrieval (test 5 câu mơ hồ)
- [ ] Query rõ ràng: HyDE không làm tệ hơn (regression test)
- [ ] HyDE không làm tăng latency quá 5s

#### Citation Tests
- [ ] Mọi response đều có ít nhất 1 citation
- [ ] Citation của text chunk: có `file` và `page` (integer)
- [ ] Citation của image chunk: có `file` và `description_preview`
- [ ] Không có citation trỏ đến chunk không nằm trong context (phantom citation)

```python
# test_citation.py
def test_citations_match_retrieved_chunks():
    result = rag_query("Định lý Bayes là gì?")
    cited_chunk_ids = [c["chunk_id"] for c in result["citations"]]
    retrieved_chunk_ids = [c["chunk_id"] for c in result["source_documents"]]
    for cid in cited_chunk_ids:
        assert cid in retrieved_chunk_ids, \
            f"Citation {cid} không có trong retrieved chunks (phantom citation)"
```

#### RAGAS Evaluation — Ngưỡng Pass Phase 3

```python
# eval/ragas_phase3.py
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall

results = evaluate(test_dataset, metrics=[
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall
])

# Ngưỡng PHẢI ĐẠT để pass Phase 3
assert results["faithfulness"]      >= 0.75, "Faithfulness quá thấp → LLM đang hallucinate"
assert results["answer_relevancy"]  >= 0.70, "Answer relevancy thấp → trả lời lạc đề"
assert results["context_precision"] >= 0.65, "Precision thấp → retrieve quá nhiều noise"
assert results["context_recall"]    >= 0.60, "Recall thấp → bỏ sót thông tin quan trọng"
```

| Metric | Phase 1 (baseline) | Phase 3 (target) |
|--------|--------------------|-----------------| 
| Faithfulness | ~0.55 | ≥ 0.75 |
| Answer Relevancy | ~0.60 | ≥ 0.70 |
| Context Precision | ~0.50 | ≥ 0.65 |
| Context Recall | ~0.55 | ≥ 0.60 |

---

## Phase 4 — Production Ready (Tuần 10)

### 🎯 Mục tiêu
Đóng gói hoàn chỉnh: Docker Compose, Streamlit UI đầy đủ (Chat + Quiz + Slide), Quiz Generator, README + demo video. Người khác clone về và chạy được trong 5 phút.

### 🔧 Hướng phát triển

```
Tuần 10:
├── Docker Compose: backend + qdrant + postgres
├── Streamlit UI hoàn chỉnh:
│   ├── Tab Chat: upload file + hỏi đáp + citation panel
│   ├── Tab Documents: danh sách file đã upload, xoá, re-index
│   ├── Tab Quiz: chọn topic → generate → làm quiz → xem điểm
│   └── Tab Slides: nhập topic, lớp, mode (Standard/Visual Story)
├── Quiz Generator:
│   ├── Structured output với Pydantic schema
│   ├── 3 loại câu: MCQ, True/False, Fill-in-blank
│   └── Auto-grade MCQ + True/False
├── Slide Generator — Visual Story Mode (Bonus):
│   ├── Tích hợp Pollinations.ai sinh ảnh 512x512 free
│   ├── Dùng Pillow ghép 4 ảnh comic panel + overlay text caption
│   └── Xuất file ảnh .png / .pdf
├── README.md: quick start < 5 bước
├── Demo video 3 phút (record Loom)
└── RAGAS evaluation report: in ra số liệu final
```

### ✅ Test Checklist Phase 4

#### Quiz Generator Tests
- [ ] Generate 5 MCQ từ 1 topic → 5 câu, mỗi câu có đúng 4 option
- [ ] Correct answer index nằm trong [0, 1, 2, 3]
- [ ] Explanation ghi rõ tại sao đáp án đúng
- [ ] Source citation trong quiz trỏ đúng về tài liệu gốc
- [ ] Generate câu hỏi về topic không có trong DB → thông báo "không đủ dữ liệu"

```python
# test_quiz.py
from pydantic import BaseModel

class QuizQuestion(BaseModel):
    question: str
    options: list[str]   # đúng 4 phần tử
    correct: int          # 0-3
    explanation: str
    source: str

def test_quiz_schema():
    result = generate_quiz(topic="Xác suất có điều kiện", n=5)
    assert len(result["questions"]) == 5
    for q in result["questions"]:
        validated = QuizQuestion(**q)   # raise nếu schema sai
        assert 0 <= validated.correct <= 3
        assert len(validated.options) == 4
        assert len(validated.question) > 20
```

#### Slide Generator UI Tests (Streamlit)
- [ ] Form render đúng: text input, dropdown (Lớp), radio (basic/advanced), radio mode (Standard/Visual Story)
- [ ] Sau khi submit → spinner xuất hiện trong quá trình generate
- [ ] Standard Mode: Download button → file .pptx được tải về với đúng tên file
- [ ] Visual Story Mode: Hiển thị ảnh comic 4 panel và tải về được file .png/.pdf
- [ ] Error message khi topic rỗng hoặc không có trong DB

#### Docker / Deployment Tests
- [ ] `docker compose up -d` → tất cả service healthy sau 60s
- [ ] `docker compose ps` → không có service nào ở trạng thái `Exit`
- [ ] Qdrant: `curl localhost:6333/health` → `{"status":"ok"}`
- [ ] FastAPI: `curl localhost:8000/health` → `{"status":"healthy",...}`
- [ ] Streamlit: `curl localhost:8501` → HTTP 200
- [ ] Restart containers: data trong Qdrant không bị mất (volume persist)

```bash
# smoke_test.sh — chạy sau khi docker compose up
#!/bin/bash
set -e

echo "Testing Qdrant..."
curl -f http://localhost:6333/health

echo "Testing FastAPI..."
curl -f http://localhost:8000/health

echo "Testing ingest..."
RESP=$(curl -sf -X POST http://localhost:8000/api/v1/ingest \
  -F "file=@tests/fixtures/sample.pdf")
DOC_ID=$(echo $RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['doc_id'])")

echo "Testing query..."
curl -sf -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"Đạo hàm là gì?\",\"doc_id\":\"$DOC_ID\"}" | \
  python3 -c "import sys,json; r=json.load(sys.stdin); assert r['answer'], 'Empty answer'"

echo "Testing slide generation..."
SRESP=$(curl -sf -X POST http://localhost:8000/api/v1/slides/generate \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"Đạo hàm\",\"grade_level\":\"Lớp 12\",\"difficulty\":\"basic\",\"n_slides\":4}")
JOB_ID=$(echo $SRESP | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")
curl -sf -O http://localhost:8000/api/v1/slides/download/$JOB_ID

echo "All smoke tests PASSED ✓"
```

#### User Acceptance Tests (UAT)
- [ ] Người khác (không biết code) clone repo → chạy được trong < 5 bước
- [ ] Upload PDF 100 trang → hỏi 5 câu → 4/5 câu trả lời chính xác và có citation
- [ ] Upload ảnh bài toán toán → nhận được lời giải từng bước
- [ ] Quiz: 10 câu MCQ → auto-grade cho điểm đúng
- [ ] Slide: nhập "Định lý Bayes", Đại học, standard, 6 slide → download .pptx mở được

#### Final RAGAS Report

```
┌─────────────────────────────────────────────────────┐
│              FINAL EVALUATION REPORT                │
│                                                     │
│  Dataset:     50 Q&A pairs (tự tạo từ test docs)   │
│  Documents:   3 PDF + 5 images                      │
│                                                     │
│  Faithfulness:       0.XX  (target: ≥ 0.75) ✓/✗   │
│  Answer Relevancy:   0.XX  (target: ≥ 0.70) ✓/✗   │
│  Context Precision:  0.XX  (target: ≥ 0.65) ✓/✗   │
│  Context Recall:     0.XX  (target: ≥ 0.60) ✓/✗   │
│                                                     │
│  Avg Query Latency:       X.Xs                      │
│  Avg Slide Gen (8 slides): XXs                      │
│  Ingestion Speed:         XX chunks/s               │
└─────────────────────────────────────────────────────┘
```

---

## Tổng Hợp — Gate Conditions (Điều kiện chuyển Phase)

```
Phase 0 → Phase 1:
  ✓ Môi trường setup không lỗi
  ✓ Tự giải thích được embedding và cosine similarity
  ✓ ChromaDB query test PASS

Phase 1 → Phase 2:
  ✓ E2E PDF RAG: 3 test case đều PASS
  ✓ API /ingest và /query trả về đúng format
  ✓ Out-of-scope query KHÔNG hallucinate

Phase 2 → Phase 3:
  ✓ Image pipeline: ảnh bài toán → giải được
  ✓ Slide generator: schema test PASS (6 slide, đúng format)
  ✓ .pptx render: file mở được, đúng số slide
  ✓ Cross-modality retrieval: citations từ ≥ 2 loại source (text + image)

Phase 3 → Phase 4:
  ✓ RAGAS Faithfulness ≥ 0.75
  ✓ RAGAS Answer Relevancy ≥ 0.70
  ✓ Citation test: không có phantom citation

Phase 4 — Done:
  ✓ Docker Compose smoke test PASS
  ✓ UAT: người khác dùng được
  ✓ Quiz Generator schema test PASS
  ✓ Slide Generator: download .pptx thành công
  ✓ README: clone → chạy trong < 5 bước

Phase 4 → Phase 5 (Production Hardening):
  ✓ Phase 4 được hoàn thành và deploy thành công
  ✓ Đã xác định rõ các production gaps cần fix

Phase 5 — Production-Grade:
  ✓ Async task queue: slide gen không block request thread
  ✓ Rate limit + retry: không crash khi hit Gemini quota
  ✓ Batch embedding: 500 chunks < 20s
  ✓ Deduplication: re-upload không tạo duplicate vectors
  ✓ Embedded image extraction: PDF toán có hình được xử lý
  ✓ Redis cache: same query không embed lại
  ✓ Docker Compose đầy đủ: postgres + redis + nginx + healthchecks
  ✓ Multi-tenancy: user_id filter trong mọi Qdrant query
  ✓ SSE streaming: LLM trả lời real-time
  ✓ Conversation guardrail: context không overflow
  ✓ Load test: 20 concurrent users không crash
  ✓ Prompt injection test: tất cả PASS
  ✓ Visual Story Mode: đủ test cases
  ✓ CI/CD: GitHub Actions chạy tự động khi push
```

---

## Phase 5 — Production Hardening (Vượt chuẩn)

### 🎯 Mục tiêu
Fix 13 production gaps được xác định. Hệ thống chạy tốt với concurrent users, không crash khi hit quota, data isolation đúng, UX real-time.

### ✅ Test Checklist Phase 5

#### 🔴 Gap 1 — Async Task Queue
- [ ] `POST /api/v1/slides/generate` trả về `{job_id}` trong < 200ms (không còn đợi 60s)
- [ ] `GET /api/v1/slides/status/{job_id}` trả về `{status: "pending|running|done|failed"}`
- [ ] 5 users cùng request slide cùng lúc → server không treo, tất cả 5 job eventually done
- [ ] Worker crash → job được retry tự động (max 3 lần)
- [ ] Job timeout sau 5 phút → status = `"failed"`, không hanging mãi

```python
# test_async_queue.py
import asyncio, httpx

async def test_concurrent_slide_jobs():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Gửi 5 request cùng lúc
        tasks = [
            client.post("/api/v1/slides/generate",
                json={"topic": f"Chủ đề {i}", "grade_level": "Lớp 12",
                      "difficulty": "basic", "n_slides": 4})
            for i in range(5)
        ]
        responses = await asyncio.gather(*tasks)
        job_ids = [r.json()["job_id"] for r in responses]

        # Mọi response phải có job_id ngay (không đợi)
        for r in responses:
            assert r.status_code == 202  # Accepted, not 200
            assert "job_id" in r.json()
            elapsed = r.elapsed.total_seconds()
            assert elapsed < 1.0, f"Response quá chậm: {elapsed}s"
```

#### 🔴 Gap 2 — Rate Limit + Retry
- [ ] Ingest PDF 50 trang (~ 200 chunks có hình) → không crash `429 ResourceExhausted`
- [ ] `tenacity` retry được log: "Retrying Gemini call, attempt 2/5"
- [ ] GeminiRateLimiter: không gửi quá 15 req/60s (verify bằng log)
- [ ] Sau 5 retry thất bại → trả về lỗi có nội dung rõ ràng cho user

```python
# test_rate_limit.py
from unittest.mock import AsyncMock, patch

async def test_retry_on_429():
    call_count = 0
    async def mock_gemini(prompt):
        nonlocal call_count
        call_count += 1
        if call_count < 3:  # fail 2 lần đầu
            raise Exception("429 RESOURCE_EXHAUSTED")
        return "Success response"

    with patch("services.llm.gemini_client.generate", mock_gemini):
        result = await call_gemini_with_retry("Test prompt")
        assert result == "Success response"
        assert call_count == 3  # đã retry 2 lần
```

#### 🔴 Gap 3 — Batch Embedding
- [ ] Ingest 500 chunks → hoàn thành trong < 30s (từ ~250s xuống)
- [ ] Throughput ≥ 50 chunks/s với batch_size=64
- [ ] Kết quả embedding giống hệt với sequential (không đổi vị trí chunk)

```python
# test_batch_embedding.py
import time

def test_batch_speed():
    chunks = [{"text": f"Nội dung chunk {i}"} for i in range(500)]

    start = time.time()
    embed_batch(chunks)  # function mới dùng batch
    elapsed = time.time() - start

    assert elapsed < 30, f"Batch embedding quá chậm: {elapsed}s"
    throughput = 500 / elapsed
    assert throughput >= 50, f"Throughput quá thấp: {throughput:.1f} chunks/s"
```

#### 🔴 Gap 4 — Document Deduplication
- [ ] Upload cùng file 2 lần → lần 2 trả về `{"status": "duplicate", "doc_id": "..."}`
- [ ] Vector DB không có chunk nào bị duplicate sau re-upload
- [ ] Khác user upload cùng file → được xử lý bình thường (scope theo user_id)

```python
# test_deduplication.py
def test_same_file_twice():
    r1 = client.post("/api/v1/ingest", files={"file": open("sample.pdf","rb")})
    doc_id_1 = r1.json()["doc_id"]

    r2 = client.post("/api/v1/ingest", files={"file": open("sample.pdf","rb")})
    assert r2.json()["status"] == "duplicate"
    assert r2.json()["doc_id"] == doc_id_1

    # Kiểm tra vector DB không tăng
    count_before = qdrant_count()
    _ = client.post("/api/v1/ingest", files={"file": open("sample.pdf","rb")})
    count_after = qdrant_count()
    assert count_before == count_after, "Duplicate vectors đã được insert!"
```

#### 🔴 Gap 5 — Embedded Image Extraction
- [ ] PDF có 10 hình nhung → sau ingest: vector DB có ≥ 8 image chunks (bỏ icon < 5KB)
- [ ] Image chunk có metadata `source_type="image"` và `image_index` hợp lệ
- [ ] Description của hình toán học chứa chất toán hoặc kiý hiệu
- [ ] PDF không có hình → không crash, chỉ có text chunks

```python
# test_image_extraction.py
def test_pdf_with_embedded_images():
    # PDF có nhớn biết có hình
    r = client.post("/api/v1/ingest",
        files={"file": open("tests/fixtures/math_with_diagrams.pdf", "rb")})
    doc_id = r.json()["doc_id"]

    # Kiểm tra chunks
    chunks = qdrant_client.scroll(
        collection_name="documents",
        scroll_filter=Filter(must=[
            FieldCondition(key="doc_id", match=MatchValue(value=doc_id)),
            FieldCondition(key="source_type", match=MatchValue(value="image"))
        ])
    )[0]
    assert len(chunks) >= 1, "Không có image chunks nào!"
```

#### 🟡 Gap 6 — Redis Caching
- [ ] Query giống nhau 2 lần: lần 2 nhanh hơn ≥ 3x (cache hit)
- [ ] Redis key `embed:{md5}` tồn tại sau query đầu tiên
- [ ] Cache TTL được set đúng: embed=1h, llm=24h
- [ ] Cache miss → vẫn hoạt động bình thường (graceful fallback)

```python
# test_cache.py
import time

def test_cache_speedup():
    query = "Định lý Bayes là gì?"

    start1 = time.time()
    result1 = rag_query(query)
    time1 = time.time() - start1

    start2 = time.time()
    result2 = rag_query(query)  # lần 2: cache hit
    time2 = time.time() - start2

    assert time2 < time1 / 3, f"Cache không hiệu quả: lần 1={time1:.2f}s, lần 2={time2:.2f}s"
    assert result1["answer"] == result2["answer"]  # kết quả giống nhau
```

#### 🟡 Gap 7 — Docker Compose Production-Ready
- [ ] `docker compose up -d` → tất cả 7 service healthy sau < 90s
- [ ] `docker compose ps` → không có service nào `Exit` hay `Restarting`
- [ ] `postgres` service: `pg_isready` OK, volume persist sau restart
- [ ] `redis` service: `redis-cli ping` trả `PONG`, maxmemory config được set
- [ ] `nginx` service: :80 → redirect đúng, rate limit header có trong response
- [ ] Mỗi service có `healthcheck`, `depends_on` dùng `condition: service_healthy`
- [ ] `deploy.resources.limits` được cấu hình cho backend và worker

```bash
# test_docker_compose.sh
#!/bin/bash
set -e

docker compose up -d --build

# Chờ tất cả healthy
max_wait=90
for i in $(seq 1 $max_wait); do
  unhealthy=$(docker compose ps | grep -c "unhealthy\|Exit" || true)
  if [ "$unhealthy" -eq 0 ]; then
    echo "✓ All services healthy after ${i}s"
    break
  fi
  sleep 1
done

# Kiểm tra từng service
curl -f http://localhost:8000/health
curl -f http://localhost:6333/health
docker compose exec redis redis-cli ping | grep -q PONG
docker compose exec postgres pg_isready -U app

# Kiểm tra persist sau restart
docker compose restart postgres
sleep 10
docker compose exec postgres psql -U app -c "SELECT count(*) FROM documents;"

echo "All Docker Compose tests PASSED ✓"
```

#### 🟡 Gap 8 — Multi-tenancy
- [ ] User A upload file, User B không thấy file đó trong danh sách
- [ ] User A query → không có chunk nào của User B trong context
- [ ] `user_id` filter được áp dụng tại API gateway level (mình không thể bypass)

```python
# test_multi_tenancy.py
def test_user_isolation():
    # User A upload
    token_a = get_token("user_a")
    r = client.post("/api/v1/ingest",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": open("secret_doc.pdf", "rb")})
    assert r.status_code == 200

    # User B query về cùng topic
    token_b = get_token("user_b")
    result = client.post("/api/v1/query",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"question": "Nội dung trong secret_doc.pdf là gì?"})

    answer = result.json()["answer"].lower()
    # User B phải không biết gì về file này
    assert "không tìm thấy" in answer or "not found" in answer
    citations = result.json().get("citations", [])
    assert not any("secret_doc" in c.get("file", "") for c in citations)
```

#### 🟡 Gap 9 — SSE Streaming
- [ ] `POST /api/v1/query/stream` trả về `Content-Type: text/event-stream`
- [ ] Token đầu tiên nhận được trong < 2s (time to first token)
- [ ] Events có đúng format: `data: {"type": "token", "content": "..."}`
- [ ] Cuối stream có `data: [DONE]` và citations event
- [ ] Stream bị ngắt ơ giữa → không tạo zombie connection

```python
# test_sse_stream.py
import httpx, json

def test_sse_streaming():
    tokens = []
    with httpx.stream("POST", "http://localhost:8000/api/v1/query/stream",
                      json={"question": "Đạo hàm là gì?"}) as r:
        assert r.headers["content-type"] == "text/event-stream"
        for line in r.iter_lines():
            if line.startswith("data: ") and line != "data: [DONE]":
                event = json.loads(line[6:])
                if event["type"] == "token":
                    tokens.append(event["content"])

    assert len(tokens) > 0, "Không có token nào được stream"
    full_answer = "".join(tokens)
    assert len(full_answer) > 50, "Answer quá ngắn"
```

#### 🟡 Gap 10 — Conversation Memory Guardrail
- [ ] Hội thoại 30 turns → không crash `context_length_exceeded`
- [ ] Context được summarize khi > 3000 tokens (kiểm tra bằng log)
- [ ] User vẫn nhận được câu trả lời sau khi summarize (không mất context quan trọng)
- [ ] Summary chứa từ khóa của các turn cũ (đúợc)

```python
# test_conversation_guardrail.py
def test_long_conversation_no_crash():
    conv_id = create_conversation()
    questions = [
        f"Câu hỏi {i}: khái niệm liên quan đến toán {i}"
        for i in range(35)  # > ngưỡng 30
    ]
    for q in questions:
        r = client.post("/api/v1/query",
            json={"question": q, "conversation_id": conv_id})
        assert r.status_code == 200, f"Crash ở turn {questions.index(q)}: {r.text}"
        assert len(r.json()["answer"]) > 0
    print(f"✓ {len(questions)} turns hoàn thành không crash")
```

#### 🟢 Gap 11 — Load Testing
- [ ] 20 concurrent users query → server không trả về 5xx
- [ ] p95 latency < 20s dưới 20 concurrent users
- [ ] Không có memory leak sau 5 phút test (memory ổn định)
- [ ] Prompt injection: tất cả test cases PASS

```bash
# Chạy load test
locust -f tests/locustfile.py --headless -u 20 -r 5 --run-time 300s \
       --html reports/load_test.html

# Kiểm tra kết quả
python3 -c "
import json
with open('reports/load_test_stats.json') as f:
    stats = json.load(f)
failure_rate = stats['stats'][0]['fail_ratio']
p95 = stats['stats'][0]['response_times'].get('95', 0)
assert failure_rate < 0.01, f'Failure rate quá cao: {failure_rate:.1%}'
assert p95 < 20000, f'p95 latency quá cao: {p95}ms'
print(f'PASS ✓ failure={failure_rate:.1%}, p95={p95}ms')
"
```

#### 🟢 Gap 12 — Visual Story Mode Test Cases
- [ ] `generate_slides(mode="visual_story")` → 4 panels mỗi slide
- [ ] Mỗi panel có `image_prompt` (> 20 ký tự) và `caption` (> 0 ký tự)
- [ ] Pollinations.ai fetch thành công: image_bytes > 10KB
- [ ] Pillow render: output PNG là lưới 2x2 (1024x1024px)
- [ ] API endpoint trả về `.png` file đúng Content-Type

```python
# test_visual_story.py — xem chi tiết trong architecture.md Gap 12
def test_visual_story_full_pipeline():
    result = generate_slides(
        topic="Định lý Pythagoras", grade_level="Lớp 10",
        difficulty="basic", n_slides=4, mode="visual_story"
    )
    pres = SlidePresentation(**result)
    assert pres.mode == "visual_story"
    for slide in pres.slides:
        assert slide.panels is not None and len(slide.panels) == 4
        for panel in slide.panels:
            assert len(panel["image_prompt"]) > 20
            assert len(panel["caption"]) > 0

def test_visual_story_api_returns_png():
    r = client.post("/api/v1/slides/generate",
        json={"topic": "Tích phân", "mode": "visual_story",
              "grade_level": "Lớp 12", "difficulty": "basic", "n_slides": 4})
    job_id = r.json()["job_id"]
    # Poll đợi xong
    for _ in range(30):
        status = client.get(f"/api/v1/slides/status/{job_id}").json()
        if status["status"] == "done": break
        time.sleep(5)
    # Download
    dl = client.get(f"/api/v1/slides/download/{job_id}")
    assert dl.headers["content-type"] == "image/png"
    assert len(dl.content) > 10000
```

#### 🟢 Gap 13 — CI/CD Pipeline
- [ ] GitHub Actions workflow tồn tại tại `.github/workflows/ci.yml`
- [ ] Push lên `main` → workflow chạy tự động
- [ ] Unit tests pass trong < 5 phút
- [ ] Integration tests pass (có Qdrant service)
- [ ] Docker build thành công + healthcheck pass
- [ ] Fail test → PR blóc (required status checks)
- [ ] Secret `GEMINI_API_KEY` được cấu hình trong GitHub repo secrets

```bash
# Kiểm tra CI config đúng
cat .github/workflows/ci.yml | grep -E "(on:|push:|pull_request:|pytest|docker)"

# Chạy local với act (mô phỏng GitHub Actions)
# act -j test --secret-file .secrets
```

---

## Phụ Lục — Test Fixtures Cần Chuẩn Bị

```
tests/
└── fixtures/
    ├── sample.pdf             # PDF 50 trang về Giải tích (MIT OCW)
    ├── sample_scan.pdf        # PDF scan (ảnh) để test OCR fallback
    ├── math_with_diagrams.pdf # PDF có hình nhúng (test Gap 5)
    ├── integral_formula.png   # Ảnh công thức toán
    ├── diagram.png            # Sơ đồ hình học
    ├── table_data.png         # Bảng số liệu
    └── qa_test_set.json       # 50 cặp Q&A chuẩn để RAGAS eval
```

**Cấu trúc `qa_test_set.json`:**
```json
[
  {
    "question":         "Quy tắc dây chuyền là gì?",
    "ground_truth":     "Quy tắc dây chuyền (chain rule) dùng để tính đạo hàm của hàm hợp...",
    "relevant_docs":    ["sample.pdf_p45_c2", "sample.pdf_p46_c1"]
  }
]
```

---

## Lộ Trình Phỏng Vấn AI Intern (3 Tháng)

> Lộ trình này nhằm mục đích biến dự án này thành điểm nhấn "chuẩn Senior" trong CV để xin vị trí AI Engineer Intern / Fresher.

### Tháng 1 — Lấp gap kỹ thuật + Nâng dự án hiện tại (Dự án 1 hoàn chỉnh)
- **Tuần 1–2: Thêm Evaluation vào RAG project**
  - Đây là điểm yếu lộ rõ nhất khi interview. Tích hợp **RAGAS** (pip install ragas) — đo faithfulness, answer relevancy, context precision.
  - Build test set nhỏ ~50 cặp (question, ground truth answer) từ tài liệu đã upload.
  - Vẽ kết quả thành bảng/chart rõ ràng, đưa vào README. (Khi hỏi "RAG của bạn tốt đến đâu?" — bạn có số cụ thể để trả lời).
- **Tuần 3–4: Thêm 1 tính năng multimodal có chiều sâu (Math Formula Recognition)**
  - User chụp ảnh bài toán viết tay → Gemini Vision OCR ra LaTeX + mô tả.
  - Embed cả hai vào Qdrant, query bình thường. Rất ấn tượng với startup EdTech/AI.
  - Demo video 2 phút: chụp ảnh → hỏi → AI trả lời với citation.

### Tháng 2 — Dự án thứ 2: Nhỏ nhưng có training
- **Mục tiêu:** Startup nhìn vào portfolio thấy 2 dự án khác nhau bản chất = bạn không phải người chỉ biết wrap API.
- **Tuần 5–8: Fine-tune một embedding model tiếng Việt**
  - Lấy `bge-m3` hoặc `Vietnamese-SBERT`, fine-tune trên dataset QA tiếng Việt (VD: UIT-ViQuAD).
  - Có training loop thật, dùng contrastive loss / triplet loss (Google Colab Pro hoặc Kaggle).
  - Hiểu sâu: tại sao embedding model cần contrastive learning, InfoNCE loss là gì, negative mining quan trọng thế nào.
  - Đo đạc: so sánh model gốc vs fine-tuned bằng retrieval recall@5 trên test set.
  - **Plug thẳng vào RAG project** (Tháng 1) để thay bge-m3 gốc → Hai dự án liên kết nhau!

### Tháng 3 — Prep interview + Polish portfolio
- **Tuần 9–10: Chuẩn bị câu hỏi kỹ thuật (Với nền tảng toán vững, bạn có lợi thế lớn)**
  - *Về RAG:* Tại sao cosine similarity? Tại sao cần reranker? HyDE hoạt động như thế nào? Chunk size ảnh hưởng gì đến retrieval?
  - *Về Embedding:* Contrastive learning là gì? Tại sao negative mining quan trọng? MTEB benchmark đo gì?
  - *Về LLM:* Attention mechanism ở mức trực giác, temperature vs top-p, context window trade-off, tại sao fine-tuning đắt hơn RAG?
  - *System design:* Thiết kế chatbot cho 1000 concurrent users (câu hỏi startup rất hay hỏi, bạn đã có kinh nghiệm từ dự án).
  - **Apply sớm từ tuần 10**, đừng đợi "hoàn chỉnh" mới apply.
- **Tuần 11–12: Portfolio & Viết Blog**
  - GitHub README của 2 dự án phải có: architecture diagram, benchmark numbers, demo GIF/video.
  - Viết 1 bài blog ngắn (trên Vietnam AI community, LinkedIn, hoặc Viblo) về một thứ bạn học được — ví dụ "Tại sao RAG của tôi cần reranker và kết quả thay đổi thế nào". (Startup cực thích người có khả năng communicate kỹ thuật).

### 📌 Tóm tắt Roadmap theo tuần
- **Tháng 1:** `[RAGAS eval]` → `[Math Formula feature]` → Dự án 1 hoàn chỉnh
- **Tháng 2:** `[Fine-tune embedding]` → `[Plug vào RAG]` → Dự án 2 hoàn chỉnh
- **Tháng 3:** `[Interview prep]` → `[Polish portfolio & Viết Blog]` → `[Apply]`

---

*E-Learning AI Assistant · Testing & Phase Development Guide · v3.0 (Phase 5 & Roadmap added)*
