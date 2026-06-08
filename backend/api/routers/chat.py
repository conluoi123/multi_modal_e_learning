import os
import shutil
import tempfile

import json
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from backend.models.schemas import ChatClearResponse, ChatRequest, ChatResponse, ChatHistoryResponse, ChatMessage, VoiceChatResponse
from backend.rag.citations import build_citations
from backend.rag.generator import generate_chat_answer, generate_chat_answer_stream
from backend.rag.memory import add_message, clear_history, create_conversation_id, get_history, get_all_conversations
from backend.rag.retriever import retrieve_context
from backend.voice.transcriber import transcribe_audio

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    conversation_id = request.conversation_id or create_conversation_id()
    history = get_history(conversation_id)

    chunks = retrieve_context(request.question, k=3, doc_id=request.doc_id)
    answer = generate_chat_answer(request.question, chunks, history)
    citations = build_citations(chunks)

    add_message(conversation_id, "user", request.question)
    add_message(conversation_id, "assistant", answer)

    return ChatResponse(
        conversation_id=conversation_id,
        answer=answer,
        citations=citations,
        history=get_history(conversation_id),
    )

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    conversation_id = request.conversation_id or create_conversation_id()
    history = get_history(conversation_id)

    chunks = retrieve_context(request.question, k=3, doc_id=request.doc_id)
    citations = build_citations(chunks)

    # We must save the user's message immediately
    add_message(conversation_id, "user", request.question)

    async def event_generator():
        full_answer = ""
        # stream text chunks
        for text_chunk in generate_chat_answer_stream(request.question, chunks, history):
            full_answer += text_chunk
            # Format as SSE
            yield f"data: {json.dumps({'type': 'chunk', 'content': text_chunk})}\n\n"
        
        # Save assistant message
        add_message(conversation_id, "assistant", full_answer)

        # Yield final metadata (citations, etc.)
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
