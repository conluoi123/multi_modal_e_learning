import os
import shutil
import tempfile

import json
import time
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from backend.models.schemas import ChatClearResponse, ChatRequest, ChatResponse, ChatHistoryResponse, ChatMessage, VoiceChatResponse
from backend.rag.citations import build_citations
from backend.rag.generator import generate_chat_answer, generate_chat_answer_stream
from backend.rag.memory import add_message, clear_history, create_conversation_id, get_history, get_all_conversations
from backend.rag.retriever import retrieve_context
from backend.voice.transcriber import transcribe_audio

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


from backend.agent.graph import app

# Helper function to extract text from list
def extract_text(msg):
    if isinstance(msg, list):
        return msg[0].get("text", str(msg)) if isinstance(msg[0], dict) else str(msg)
    return str(msg)

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    conversation_id = request.conversation_id or create_conversation_id()
    history = get_history(conversation_id)

    # 1. Chuyển bị State cho LangGraph
    messages = history + [{"role": "user", "text": request.question}]
    initial_state = {"messages": messages, "intent": "", "docs": []}

    # 2. Kích hoạt Trợ lý Tự chủ (Agent)
    result = app.invoke(initial_state)

    answer = extract_text(result["messages"][-1]["text"])
    
    # Giả lập citations từ docs để UI không bị lỗi
    citations = [{"page_content": doc, "metadata": {"source": "Tài liệu hệ thống", "page": 1}} for doc in result.get("docs", [])]

    add_message(conversation_id, "user", request.question)
    add_message(conversation_id, "assistant", answer)

    return ChatResponse(
        conversation_id=conversation_id,
        answer=answer,
        citations=citations,
        history=get_history(conversation_id),
    )

# @router.post("/stream")
# async def chat_stream(request: ChatRequest):
#     conversation_id = request.conversation_id or create_conversation_id()
#     history = get_history(conversation_id)

#     chunks = retrieve_context(request.question, k=3, doc_id=request.doc_id)
#     citations = build_citations(chunks)

#     # We must save the user's message immediately
#     add_message(conversation_id, "user", request.question)

#     async def event_generator():
#         full_answer = ""
#         # stream text chunks
#         for text_chunk in generate_chat_answer_stream(request.question, chunks, history):
#             full_answer += text_chunk
#             # Format as SSE
#             yield f"data: {json.dumps({'type': 'chunk', 'content': text_chunk})}\n\n"
        
#         # Save assistant message
#         add_message(conversation_id, "assistant", full_answer)

#         # Yield final metadata (citations, etc.)
#         yield f"data: {json.dumps({'type': 'end', 'citations': citations, 'conversation_id': conversation_id})}\n\n"

#     return StreamingResponse(event_generator(), media_type="text/event-stream")
import asyncio

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    conversation_id = request.conversation_id or create_conversation_id()
    history = get_history(conversation_id)

    messages = history + [{"role": "user", "text": request.question}]
    initial_state = {"messages": messages, "intent": "", "docs": []}

    async def event_generator():
        # Báo cho Frontend biết là Agent đang suy nghĩ để mở kết nối
        thinking_msg = json.dumps({'type': 'chunk', 'content': '🧠 [AGENT] Đang suy luận và xử lý...\n\n'})
        yield f"data: {thinking_msg}\n\n"
        await asyncio.sleep(0.1)

        # Gọi Agent (chạy đồng bộ)
        result = app.invoke(initial_state)
        
        final_answer = extract_text(result["messages"][-1]["text"])
        citations = [{"page_content": doc, "metadata": {"source": "Tài liệu hệ thống", "page": 1}} for doc in result.get("docs", [])]

        add_message(conversation_id, "user", request.question)
        add_message(conversation_id, "assistant", final_answer)

        # Fake Streaming để giữ hiệu ứng gõ chữ (Typewriter) trên Giao diện
        chunk_size = 15
        for i in range(0, len(final_answer), chunk_size):
            chunk = final_answer[i:i+chunk_size]
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            await asyncio.sleep(0.02)
        
        yield f"data: {json.dumps({'type': 'end', 'citations': citations, 'conversation_id': conversation_id})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/voice", response_model=VoiceChatResponse)
async def voice_chat(
    file: UploadFile = File(...),
    conversation_id: str | None = Form(default=None),
    doc_id: str | None = Form(default=None),
):
    suffix = os.path.splitext(file.filename or "")[-1] or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        question = transcribe_audio(tmp_path)

        if not question:
            raise HTTPException(
                status_code=400,
                detail="Không nhận diện được nội dung giọng nói. Vui lòng thử lại với audio rõ hơn.",
            )

        request = ChatRequest(
            question=question,
            conversation_id=conversation_id,
            doc_id=doc_id,
        )

        response = await chat(request)

        return VoiceChatResponse(
            transcribed_text=question,
            conversation_id=response.conversation_id,
            answer=response.answer,
            citations=response.citations,
            history=response.history,
        )
    finally:
        os.unlink(tmp_path)


@router.delete("/{conversation_id}", response_model=ChatClearResponse)
async def clear_chat(conversation_id: str):
    clear_history(conversation_id)
    return ChatClearResponse(
        status="success",
        conversation_id=conversation_id,
        cleared=True,
        message="Conversation history cleared.",
    )

@router.get("/{conversation_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(conversation_id: str):
    history = get_history(conversation_id)
    return ChatHistoryResponse(
        conversation_id=conversation_id,
        history=history,
        message_count=len(history),
    )

@router.get("/conversations")
async def get_conversations():
    return get_all_conversations()
