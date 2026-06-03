# E-Learning AI Assistant API

Tài liệu này mô tả cách test các API chính của backend FastAPI.

Base URL khi chạy local:

```text
http://localhost:8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

Chạy backend:

```powershell
uvicorn backend.main:app --reload
```

## 1. Health Check

### 1.1 Kiểm tra server

```http
GET /health
```

Response: `200 OK`

```json
{
  "status": "ok",
  "message": "Hệ thống đang hoạt động tốt!"
}
```

Dùng để kiểm tra backend đã chạy và FastAPI route hoạt động.

## 2. Ingestion

### 2.1 Upload PDF

```http
POST /api/v1/ingest
```

Form-data:

```text
file: sample.pdf
```

Response: `200 OK`

```json
{
  "status": "success",
  "doc_id": "sha256_hash",
  "filename": "sample.pdf",
  "total_pages": 10,
  "total_chunks_saved": 35,
  "duplicate": false
}
```

Nếu upload lại cùng file, response có thể là:

```json
{
  "status": "success",
  "doc_id": "sha256_hash",
  "filename": "sample.pdf",
  "total_pages": 0,
  "total_chunks_saved": 0,
  "duplicate": true
}
```

Ghi chú:
- Lưu lại `doc_id` để test chat, query, quiz và slides.
- File PDF sẽ được lưu vào `data/raw/`.
- Chunks được embed và lưu vào ChromaDB local tại `data/chroma_db/`.

## 3. Documents

### 3.1 Xem danh sách tài liệu đã ingest

```http
GET /api/v1/documents
```

Response: `200 OK`

```json
{
  "documents": [
    {
      "doc_id": "sha256_hash",
      "filename": "sample.pdf",
      "chunk_count": 35
    }
  ]
}
```

Dùng endpoint này để lấy lại `doc_id` nếu bạn quên sau khi upload.

## 4. Query RAG

### 4.1 Hỏi đáp một câu không có memory

```http
POST /api/v1/query
```

Body:

```json
{
  "question": "Tài liệu này nói về nội dung gì?",
  "doc_id": "sha256_hash"
}
```

Response: `200 OK`

```json
{
  "answer": "Câu trả lời dựa trên tài liệu...",
  "citations": [
    {
      "source": "sample.pdf",
      "page": "1",
      "doc_id": "sha256_hash"
    }
  ]
}
```

Ghi chú:
- `doc_id` là optional. Nếu bỏ trống, hệ thống search trên toàn bộ ChromaDB.
- Endpoint này phù hợp để test RAG đơn lẻ, không cần lịch sử hội thoại.

### 4.2 Test validation

Body lỗi:

```json
{
  "question": ""
}
```

Response mong đợi: `422 Unprocessable Entity`

## 5. Chat

### 5.1 Tạo conversation mới

```http
POST /api/v1/chat
```

Body:

```json
{
  "question": "Tài liệu này nói về nội dung gì?",
  "doc_id": "sha256_hash"
}
```

Response: `200 OK`

```json
{
  "conversation_id": "uuid",
  "answer": "Câu trả lời dựa trên tài liệu...",
  "citations": [
    {
      "source": "sample.pdf",
      "page": "1",
      "doc_id": "sha256_hash"
    }
  ],
  "history": [
    {
      "role": "user",
      "content": "Tài liệu này nói về nội dung gì?"
    },
    {
      "role": "assistant",
      "content": "Câu trả lời dựa trên tài liệu..."
    }
  ]
}
```

Ghi chú:
- Copy `conversation_id` để test câu hỏi tiếp theo.
- Chat memory hiện lưu trong RAM, restart server sẽ mất history.

### 5.2 Hỏi tiếp trong cùng conversation

```http
POST /api/v1/chat
```

Body:

```json
{
  "conversation_id": "uuid",
  "question": "Giải thích thêm phần đó",
  "doc_id": "sha256_hash"
}
```

Response: `200 OK`

Kiểm tra:
- `conversation_id` giống lần đầu.
- `history` tăng từ 2 messages lên 4 messages.
- Thứ tự message là `user`, `assistant`, `user`, `assistant`.

### 5.3 Xem lịch sử conversation

```http
GET /api/v1/chat/{conversation_id}/history
```

Response: `200 OK`

```json
{
  "conversation_id": "uuid",
  "history": [
    {
      "role": "user",
      "content": "Tài liệu này nói về nội dung gì?"
    },
    {
      "role": "assistant",
      "content": "Câu trả lời..."
    }
  ],
  "message_count": 2
}
```

### 5.4 Xóa lịch sử conversation

```http
DELETE /api/v1/chat/{conversation_id}
```

Response: `200 OK`

```json
{
  "status": "success",
  "conversation_id": "uuid",
  "cleared": true,
  "message": "Conversation history cleared."
}
```

Cách kiểm tra xóa thành công:
1. Gọi `POST /api/v1/chat` tạo conversation.
2. Gọi tiếp cùng `conversation_id` để `history` có 4 messages.
3. Gọi `DELETE /api/v1/chat/{conversation_id}`.
4. Gọi `GET /api/v1/chat/{conversation_id}/history`.
5. `message_count` phải là `0`.

## 6. Voice Chat

### 6.1 Chat bằng file audio

```http
POST /api/v1/chat/voice
```

Form-data:

```text
file: question.wav
conversation_id: uuid
doc_id: sha256_hash
```

Trong đó:
- `file` là bắt buộc.
- `conversation_id` optional. Bỏ trống để tạo conversation mới.
- `doc_id` optional. Nên truyền vào để giới hạn search trong một tài liệu.

Response: `200 OK`

```json
{
  "transcribed_text": "Tài liệu này nói về nội dung gì?",
  "conversation_id": "uuid",
  "answer": "Câu trả lời dựa trên tài liệu...",
  "citations": [
    {
      "source": "sample.pdf",
      "page": "1",
      "doc_id": "sha256_hash"
    }
  ],
  "history": [
    {
      "role": "user",
      "content": "Tài liệu này nói về nội dung gì?"
    },
    {
      "role": "assistant",
      "content": "Câu trả lời dựa trên tài liệu..."
    }
  ]
}
```

Ghi chú:
- Nên test bằng `.wav` trước.
- `.mp3` hoặc `.m4a` có thể cần cài `ffmpeg`.
- Lần đầu gọi endpoint có thể chậm vì Whisper model được load.

### 6.2 Test audio không nhận diện được

Upload file audio im lặng hoặc quá nhỏ tiếng.

Response mong đợi: `400 Bad Request`

```json
{
  "detail": "Không nhận diện được nội dung giọng nói. Vui lòng thử lại với audio rõ hơn."
}
```

## 7. Quiz

### 7.1 Sinh câu hỏi trắc nghiệm

```http
POST /api/v1/quiz/generate
```

Body:

```json
{
  "topic": "Nội dung chính của tài liệu",
  "n_questions": 5,
  "difficulty": "standard",
  "doc_id": "sha256_hash"
}
```

Response: `200 OK`

```json
{
  "questions": [
    {
      "question": "Câu hỏi trắc nghiệm?",
      "options": [
        "Lựa chọn A",
        "Lựa chọn B",
        "Lựa chọn C",
        "Lựa chọn D"
      ],
      "answer": "Lựa chọn đúng",
      "explanation": "Giải thích ngắn gọn vì sao đúng."
    }
  ],
  "citations": [
    {
      "source": "sample.pdf",
      "page": "2",
      "doc_id": "sha256_hash"
    }
  ]
}
```

Giá trị hợp lệ:

```text
difficulty: basic | standard | advanced
n_questions: 1..20
```

Nếu topic không có trong tài liệu:

```text
404 Not Found
```

## 8. Slides

### 8.1 Sinh file PowerPoint

```http
POST /api/v1/slides/generate
```

Body:

```json
{
  "topic": "Nội dung chính của tài liệu",
  "n_slides": 5,
  "template_name": "corporate",
  "grade_level": "Đại học",
  "difficulty": "standard",
  "mode": "standard",
  "language": "vi",
  "include_speaker_notes": true,
  "doc_id": "sha256_hash"
}
```

Response: `200 OK`

```json
{
  "status": "success",
  "filename": "noi_dung_chinh_cua_tai_lieu.pptx",
  "file_path": "D:\\path\\to\\data\\slides\\noi_dung_chinh_cua_tai_lieu.pptx",
  "download_url": "/api/v1/slides/download/noi_dung_chinh_cua_tai_lieu.pptx",
  "slide_count": 5,
  "citations": [
    {
      "source": "sample.pdf",
      "page": "3",
      "doc_id": "sha256_hash"
    }
  ]
}
```

Giá trị hợp lệ:

```text
template_name: academic | corporate | minimal
difficulty: basic | standard | advanced
mode: standard
language: vi | en
n_slides: 1..20
```

Ghi chú:
- Máy cần cài Node.js.
- Thư mục `backend/slides/node_modules` cần có dependency `pptxgenjs`.
- File output nằm trong `data/slides/`.

### 8.2 Download file PowerPoint

```http
GET /api/v1/slides/download/{filename}
```

Response: `200 OK`

Content-Type:

```text
application/vnd.openxmlformats-officedocument.presentationml.presentation
```

Nếu file không tồn tại:

```text
404 Not Found
```

## 9. Quy trình test demo đề xuất

Chạy theo thứ tự này để demo end-to-end:

```text
1. GET /health
2. POST /api/v1/ingest
3. GET /api/v1/documents
4. POST /api/v1/query
5. POST /api/v1/chat
6. POST /api/v1/chat với conversation_id cũ
7. GET /api/v1/chat/{conversation_id}/history
8. POST /api/v1/chat/voice
9. POST /api/v1/quiz/generate
10. POST /api/v1/slides/generate
11. GET /api/v1/slides/download/{filename}
12. DELETE /api/v1/chat/{conversation_id}
```

## 10. Chạy automated tests

Chạy các test API liên quan:

```powershell
python -m pytest tests/test_api.py tests/test_chat.py tests/test_voice.py tests/test_citations.py -q
```

Chạy toàn bộ tests:

```powershell
python -m pytest tests -q
```

Ghi chú:
- Test chat và voice nên mock Gemini, Chroma và Whisper để không gọi model thật.
- Test ingestion có thể skip nếu không có `data/raw/sample.pdf`.
- Test slides có thể skip nếu máy chưa cài Node.js.
