from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"


def test_openapi_schema_available():
    response = client.get("/openapi.json")

    assert response.status_code == 200
    data = response.json()

    assert "paths" in data
    assert "/api/v1/query" in data["paths"]
    assert "/api/v1/ingest" in data["paths"]
    assert "/api/v1/slides/generate" in data["paths"]
    assert "/api/v1/documents" in data["paths"]
    assert "/api/v1/quiz/generate" in data["paths"]
    assert "/api/v1/chat" in data["paths"]
    assert "/api/v1/chat/{conversation_id}" in data["paths"]
    assert "/api/v1/chat/{conversation_id}/history" in data["paths"]
    assert "/api/v1/chat/voice" in data["paths"]