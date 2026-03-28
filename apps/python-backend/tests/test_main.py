from fastapi.testclient import TestClient

from app.server import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert data.get("version") == "1.0.0"


def test_openapi_docs_available():
    r = client.get("/api/docs")
    assert r.status_code == 200
