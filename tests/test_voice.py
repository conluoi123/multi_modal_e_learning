from fastapi.testclient import TestClient

from backend.api.routers import chat as chat_router
from backend.main import app


client = TestClient(app)


def fake_chunks():
    return [
        {
            "text": "Voice lesson content",
            "metadata": {
                "doc_id": "doc-voice",
                "source": "voice_lesson.pdf",
                "page": 3,
            },
        }
    ]


def test_voice_chat_transcribes_and_answers(monkeypatch):
    monkeypatch.setattr(
        chat_router,
        "transcribe_audio",
        lambda file_path: "Tài liệu này nói về nội dung gì?",
    )
    monkeypatch.setattr(
        chat_router,
        "retrieve_context",
        lambda question, k=3, doc_id=None: fake_chunks(),
    )
    monkeypatch.setattr(
        chat_router,
        "generate_chat_answer",
        lambda question, chunks, history: "Đây là câu trả lời từ voice chat.",
    )

    response = client.post(
        "/api/v1/chat/voice",
        data={"doc_id": "doc-voice"},
        files={
            "file": (
                "test.wav",
                b"fake wav content",
                "audio/wav",
            )
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["transcribed_text"] == "Tài liệu này nói về nội dung gì?"
    assert data["conversation_id"]
    assert data["answer"] == "Đây là câu trả lời từ voice chat."
    assert data["citations"] == [
        {
            "source": "voice_lesson.pdf",
            "page": "3",
            "doc_id": "doc-voice",
        }
    ]
    assert len(data["history"]) == 2
    assert data["history"][0] == {
        "role": "user",
        "content": "Tài liệu này nói về nội dung gì?",
    }

    client.delete(f"/api/v1/chat/{data['conversation_id']}")


def test_voice_chat_reuses_conversation_id(monkeypatch):
    monkeypatch.setattr(
        chat_router,
        "transcribe_audio",
        lambda file_path: "Giải thích thêm phần đó",
    )
    monkeypatch.setattr(
        chat_router,
        "retrieve_context",
        lambda question, k=3, doc_id=None: fake_chunks(),
    )
    monkeypatch.setattr(
        chat_router,
        "generate_chat_answer",
        lambda question, chunks, history: f"History length: {len(history)}",
    )

    first = client.post(
        "/api/v1/chat/voice",
        files={"file": ("first.wav", b"fake audio", "audio/wav")},
    ).json()

    conversation_id = first["conversation_id"]

    second = client.post(
        "/api/v1/chat/voice",
        data={"conversation_id": conversation_id},
        files={"file": ("second.wav", b"fake audio", "audio/wav")},
    )

    assert second.status_code == 200
    data = second.json()

    assert data["conversation_id"] == conversation_id
    assert data["answer"] == "History length: 2"
    assert len(data["history"]) == 4

    client.delete(f"/api/v1/chat/{conversation_id}")


def test_voice_chat_returns_400_when_transcription_is_empty(monkeypatch):
    monkeypatch.setattr(
        chat_router,
        "transcribe_audio",
        lambda file_path: "",
    )

    response = client.post(
        "/api/v1/chat/voice",
        files={"file": ("silent.wav", b"fake silent audio", "audio/wav")},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Không nhận diện được nội dung giọng nói. Vui lòng thử lại với audio rõ hơn."
    }