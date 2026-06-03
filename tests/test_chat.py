from fastapi.testclient import TestClient

from backend.api.routers import chat as chat_router
from backend.main import app
from backend.rag.memory import get_history


client = TestClient(app)


def fake_chunks():
    return [
        {
            "text": "Lesson content",
            "metadata": {
                "doc_id": "doc-1",
                "source": "lesson.pdf",
                "page": 2,
            },
        }
    ]


def test_chat_starts_conversation(monkeypatch):
    monkeypatch.setattr(
        chat_router,
        "retrieve_context",
        lambda question, k=3, doc_id=None: fake_chunks(),
    )
    monkeypatch.setattr(
        chat_router,
        "generate_chat_answer",
        lambda question, chunks, history: "Answer from test context.",
    )

    response = client.post(
        "/api/v1/chat",
        json={"question": "What is this lesson about?", "doc_id": "doc-1"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["conversation_id"]
    assert data["answer"] == "Answer from test context."
    assert data["citations"] == [
        {"source": "lesson.pdf", "page": "2", "doc_id": "doc-1"}
    ]
    assert len(data["history"]) == 2

    client.delete(f"/api/v1/chat/{data['conversation_id']}")


def test_chat_reuses_conversation_id(monkeypatch):
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

    first = client.post("/api/v1/chat", json={"question": "First question"}).json()
    conversation_id = first["conversation_id"]

    second = client.post(
        "/api/v1/chat",
        json={"conversation_id": conversation_id, "question": "Follow up"},
    ).json()

    assert second["conversation_id"] == conversation_id
    assert second["answer"] == "History length: 2"
    assert len(second["history"]) == 4

    client.delete(f"/api/v1/chat/{conversation_id}")


def test_get_chat_history(monkeypatch):
    monkeypatch.setattr(
        chat_router,
        "retrieve_context",
        lambda question, k=3, doc_id=None: fake_chunks(),
    )
    monkeypatch.setattr(
        chat_router,
        "generate_chat_answer",
        lambda question, chunks, history: "Answer.",
    )

    created = client.post("/api/v1/chat", json={"question": "Start"}).json()
    conversation_id = created["conversation_id"]

    response = client.get(f"/api/v1/chat/{conversation_id}/history")

    assert response.status_code == 200
    data = response.json()

    assert data["conversation_id"] == conversation_id
    assert data["message_count"] == 2
    assert len(data["history"]) == 2

    client.delete(f"/api/v1/chat/{conversation_id}")


def test_clear_chat_history(monkeypatch):
    monkeypatch.setattr(
        chat_router,
        "retrieve_context",
        lambda question, k=3, doc_id=None: fake_chunks(),
    )
    monkeypatch.setattr(
        chat_router,
        "generate_chat_answer",
        lambda question, chunks, history: "Answer.",
    )

    created = client.post("/api/v1/chat", json={"question": "Start"}).json()
    conversation_id = created["conversation_id"]

    response = client.delete(f"/api/v1/chat/{conversation_id}")

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "conversation_id": conversation_id,
        "cleared": True,
        "message": "Conversation history cleared.",
    }
    assert get_history(conversation_id) == []