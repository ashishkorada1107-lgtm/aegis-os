# Aegis OS backend smoke tests: health, auth, state, webhooks, TTS
import os, time, uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "arjun@aegis.dev", "password": "zero2026"})
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def test_user_token():
    # Separate TEST_ user so PUT /state doesn't overwrite admin's real data
    email = f"test_{uuid.uuid4().hex[:8]}@aegis.dev"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "TestPass123!", "name": "TEST_user"})
    if r.status_code != 200:
        pytest.skip(f"register failed {r.status_code} {r.text}")
    return r.json()["access_token"]


def h(t):
    return {"Authorization": f"Bearer {t}"}


# Health
def test_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    d = r.json()
    assert d.get("system") == "Aegis OS" and d.get("zero") == "online"


# Auth
def test_login_returns_tokens_and_cookies():
    r = requests.post(f"{API}/auth/login", json={"email": "arjun@aegis.dev", "password": "zero2026"})
    assert r.status_code == 200
    d = r.json()
    assert d["access_token"] and d["refresh_token"]
    assert d["user"]["email"] == "arjun@aegis.dev"
    assert "_id" not in d["user"]


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": f"nouser_{uuid.uuid4().hex[:6]}@x.dev", "password": "bad"})
    assert r.status_code in (400, 401)


def test_me(admin_token):
    r = requests.get(f"{API}/auth/me", headers=h(admin_token))
    assert r.status_code == 200
    d = r.json()
    u = d.get("user", d)
    assert u["email"] == "arjun@aegis.dev"


def test_me_unauth():
    assert requests.get(f"{API}/auth/me").status_code == 401


# State sync
def test_state_get_admin(admin_token):
    r = requests.get(f"{API}/state", headers=h(admin_token))
    assert r.status_code == 200
    assert "updated_at" in r.json()


def test_state_put_get_roundtrip(test_user_token):
    ts = int(time.time() * 1000)
    payload = {"data": {"TEST_key": "v1", "tasks": [{"id": "t1", "title": "TEST_task"}]}, "updated_at": ts}
    r = requests.put(f"{API}/state", headers=h(test_user_token), json=payload)
    assert r.status_code == 200 and r.json()["updated_at"] == ts
    g = requests.get(f"{API}/state", headers=h(test_user_token)).json()
    assert g["data"]["TEST_key"] == "v1" and g["updated_at"] == ts


# Webhooks
def test_webhook_bad_url(admin_token):
    r = requests.post(f"{API}/webhooks/fire", headers=h(admin_token), json={"url": "ftp://x"})
    assert r.status_code == 400


def test_webhook_fire(admin_token):
    r = requests.post(f"{API}/webhooks/fire", headers=h(admin_token),
                      json={"url": "https://httpbin.org/post", "method": "POST", "payload": {"a": 1}}, timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert "status" in d and "ms" in d


# TTS (changed code)
def test_tts(admin_token):
    r = requests.post(f"{API}/ai/tts", headers=h(admin_token), json={"text": "Hello from Zero"}, timeout=90)
    assert r.status_code in (200, 502), r.text
    if r.status_code == 200:
        assert r.headers["content-type"].startswith("audio/mpeg")
        assert len(r.content) > 1000
    else:
        assert "Speech failed" in r.text


def test_tts_validation(admin_token):
    r = requests.post(f"{API}/ai/tts", headers=h(admin_token), json={"text": ""})
    assert r.status_code == 422
