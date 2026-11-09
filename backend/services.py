import asyncio
import base64
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

import requests
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone, ImageContent
from emergentintegrations.llm.openai import OpenAITextToSpeech, OpenAISpeechToText
from typesafe_sdk import AsyncTypeSafeClient, RetryPolicy, Choice, Noul, TypeSafeError

logger = logging.getLogger("aegis.ai")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
PROXY = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
APP = "aegis-os"
MODELS = {"openai": "gpt-6-luna", "anthropic": "claude-sonnet-5-5", "gemini": "gemini-3-flash-preview"}
ALLOWED = {
    "openai": {"gpt-6-luna", "gpt-5.6-terra", "gpt-5.4-mini"},
    "anthropic": {"claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"},
    "gemini": {"gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-2.5-flash"},
}


def pick_model(provider: Optional[str], model: Optional[str]) -> tuple[str, str]:
    p = provider if provider in MODELS else "openai"
    m = model if model in ALLOWED[p] else MODELS[p]
    return p, m


async def llm_stream(provider, model, system, text, images: Optional[list[str]] = None):
    p, m = pick_model(provider, model)
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"aegis-{uuid.uuid4().hex}", system_message=system).with_model(p, m)
    files = [ImageContent(image_base64=b) for b in (images or [])]
    msg = UserMessage(text=text, file_contents=files) if files else UserMessage(text=text)
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            yield ev.content
        elif isinstance(ev, StreamDone):
            break


async def llm_collect(provider, model, system, text, images=None) -> str:
    out = []
    async for t in llm_stream(provider, model, system, text, images):
        out.append(t)
    return "".join(out)


def parse_json(text: str) -> Any:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t)
    m = re.search(r"[\[{].*[\]}]", t, re.S)
    return json.loads(m.group(0) if m else t)


# ---------- TTS / STT ----------
async def tts(text: str) -> bytes:
    return await OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY).generate_speech(text=text[:4000], model="tts-1", voice="onyx")


async def stt(data: bytes, filename: str) -> str:
    import io
    f = io.BytesIO(data)
    f.name = filename
    res = await OpenAISpeechToText(api_key=EMERGENT_LLM_KEY).transcribe(file=f, model="whisper-1", response_format="json", language="en")
    return res.text


# ---------- Jev ----------
_jev: Optional[AsyncTypeSafeClient] = None


def jev() -> AsyncTypeSafeClient:
    global _jev
    if _jev is None:
        _jev = AsyncTypeSafeClient(api_key=EMERGENT_LLM_KEY, base_url=f"{PROXY}/llm/typesafe",
                                   retry=RetryPolicy(max_retries=2, respect_retry_after=False))
    return _jev


INTENTS = {
    "plan": "Plan the day, study schedule, use free slots, exam prep",
    "task": "Create, break down or manage tasks and subtasks",
    "quiz": "Quiz, MCQ, revision questions, exam topics",
    "health": "Sleep, steps, water, caffeine, energy, workouts",
    "timetable": "Classes, timetable changes, rooms, add a lecture or lab",
    "general": "Anything else or small talk",
}
DSA_TAGS = ["Graph", "DP", "Tree", "Two Pointers", "Binary Search", "Greedy", "Strings", "Heap", "Backtracking", "Sliding Window", "Stack", "Union-Find"]


async def jev_intent(text: str) -> Optional[str]:
    try:
        r = await jev().system_one(model="jev-latest", state={"message": text[:600]},
                                   questions={"intent": Choice(instructions="What is the student asking their AI chief-of-staff to do?", criteria=INTENTS)})
        return r.choices["intent"].choice
    except Exception as exc:
        logger.warning("jev intent failed: %s", exc)
        return None


async def jev_decide(kind: str, payload: dict) -> dict:
    if kind == "task_priority":
        q = {"priority": Choice(instructions="How important and time-critical is this task for a CSE university student?",
                                criteria={"high": "Exams, graded assignments, deadlines within days, critical project work",
                                          "med": "Practice, regular study, routine coursework",
                                          "low": "Nice-to-have, personal, optional or far-off"})}
        r = await jev().system_one(model="jev-latest", state={"task": payload.get("title", "")[:300]}, questions=q)
        c = r.choices["priority"]
        return {"priority": c.choice, "confidence": c.confidence, "ai_classified": True}
    if kind == "dsa_tags":
        q = {f"t{i}": Noul(instructions=f"Is '{t}' a core technique/pattern for solving this problem?") for i, t in enumerate(DSA_TAGS)}
        r = await jev().system_one(model="jev-latest", state={"problem": payload.get("title", ""), "notes": payload.get("notes", "")[:500]}, questions=q)
        tags = [t for i, t in enumerate(DSA_TAGS) if r.nouls[f"t{i}"].noul >= 0.5]
        return {"tags": tags[:4], "ai_classified": True}
    if kind == "alert_urgency":
        q = {"urgent": Noul(instructions="Should this alert interrupt the student with a device notification right now (time-critical class, exam, deadline, health risk)?")}
        r = await jev().system_one(model="jev-latest", state={"title": payload.get("title", ""), "body": payload.get("body", "")[:300]}, questions=q)
        p = r.nouls["urgent"].noul
        return {"urgent": p >= 0.6, "probability": p, "ai_classified": True}
    if kind == "webhook_result":
        return await jev_webhook(payload.get("status", 0), payload.get("body", ""))
    raise ValueError("unknown kind")


async def jev_webhook(status: int, body: str) -> dict:
    try:
        q = {"verdict": Choice(instructions="Did this remote script/webhook call succeed?",
                               criteria={"success": "Completed as expected", "warning": "Ran but returned partial results, warnings or odd output",
                                         "failure": "Errored, unreachable, rejected or crashed"})}
        r = await jev().system_one(model="jev-latest", state={"http_status": status, "body": body[:1200]}, questions=q)
        c = r.choices["verdict"]
        return {"verdict": c.choice, "confidence": c.confidence, "ai_classified": True}
    except TypeSafeError as exc:
        logger.warning("jev webhook failed: %s", exc)
        return {"verdict": "success" if 200 <= status < 300 else "failure", "ai_classified": False}


# ---------- Object storage ----------
STORAGE_URL = f"{PROXY}/objstore/api/v1/storage"
_storage_key: Optional[str] = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    r.raise_for_status()
    _storage_key = r.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(), "Content-Type": content_type}, data=data, timeout=120)
    if r.status_code == 404:
        r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(True), "Content-Type": content_type}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path: str) -> tuple[bytes, str]:
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


async def save_file(db, user_id: str, data: bytes, content_type: str, filename: str, kind: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    path = f"{APP}/uploads/{user_id}/{uuid.uuid4()}.{ext}"
    res = await asyncio.to_thread(put_object, path, data, content_type)
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "storage_path": res["path"], "original_filename": filename,
           "content_type": content_type, "size": res.get("size", len(data)), "kind": kind, "is_deleted": False,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.files.insert_one(dict(doc))
    return doc


# ---------- Fal media (Universal Key) ----------
# Fal Universal Key supports queue inference through the Emergent proxy only, not Fal Platform APIs.
FAL_BASE = f"{PROXY}/api/v1/fal"
FAL_QUEUE = f"{FAL_BASE}/queue"
IMAGE_MODEL = "fal-ai/nano-banana-pro"
VIDEO_MODEL = "fal-ai/kling-video/v3/standard/text-to-video"


class MediaError(Exception):
    pass


def _fal_headers(extra=None):
    h = {"Authorization": f"Bearer {EMERGENT_LLM_KEY}", "Content-Type": "application/json"}
    if os.environ.get("job_id"):
        h["X-App-ID"] = h["X-Job-ID"] = os.environ["job_id"]
    if os.environ.get("run_id"):
        h["X-Environment-ID"] = os.environ["run_id"]
    h.update(extra or {})
    return h


def _trusted(url: str) -> str:
    c, q = urlparse(url), urlparse(FAL_QUEUE)
    if c.scheme != q.scheme or c.netloc != q.netloc or c.username or c.password or c.fragment or not c.path.startswith(q.path.rstrip("/") + "/"):
        raise MediaError("Untrusted media queue URL")
    return url


def _get_retry(url, timeout, deadline):
    delay = 1
    for attempt in range(5):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise MediaError("Timed out waiting for media generation")
        try:
            return requests.get(url, headers=_fal_headers(), timeout=min(timeout, remaining))
        except (requests.ConnectTimeout, requests.ReadTimeout, requests.ConnectionError) as exc:
            if attempt == 4:
                raise MediaError("Polling failed after network errors") from exc
            time.sleep(min(delay, max(0.1, deadline - time.monotonic())))
            delay *= 2
    raise MediaError("unreachable")


def run_media(endpoint: str, payload: dict, timeout_s: int = 900) -> dict:
    r = requests.post(f"{FAL_BASE}/proxy", headers=_fal_headers({"X-Fal-Target-Url": f"https://queue.fal.run/{endpoint}"}), json=payload, timeout=60)
    if r.status_code == 402:
        raise MediaError("Insufficient Universal Key credits — add balance in Profile → Universal Key")
    r.raise_for_status()
    sub = r.json()
    status_url, response_url = _trusted(sub["status_url"]), _trusted(sub["response_url"])
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        s = _get_retry(status_url, 30, deadline)
        s.raise_for_status()
        body = s.json()
        st = (body.get("status") or "").upper()
        if st in {"COMPLETED", "OK"}:
            if body.get("error"):
                raise MediaError(f"Generation failed: {body['error']}")
            res = _get_retry(response_url, 60, deadline)
            res.raise_for_status()
            return res.json()
        if st in {"FAILED", "CANCELLED", "CANCELED", "ERROR"}:
            raise MediaError(f"Generation failed: {st}")
        time.sleep(3)
    raise MediaError("Timed out waiting for media generation")


def media_payload(kind: str, prompt: str) -> tuple[str, dict]:
    if kind == "image":
        return IMAGE_MODEL, {"prompt": prompt, "aspect_ratio": "16:9", "num_images": 1, "output_format": "png", "resolution": "1K"}
    return VIDEO_MODEL, {"prompt": prompt, "duration": "5", "aspect_ratio": "16:9", "generate_audio": False}


def media_url(kind: str, result: dict) -> str:
    if kind == "image":
        return result["images"][0]["url"]
    return result["video"]["url"]


async def run_media_job(db, job_id: str, user_id: str, kind: str, prompt: str):
    try:
        endpoint, payload = media_payload(kind, prompt)
        result = await asyncio.to_thread(run_media, endpoint, payload)
        url = media_url(kind, result)
        dl = await asyncio.to_thread(requests.get, url, timeout=120)
        dl.raise_for_status()
        ctype = dl.headers.get("Content-Type") or ("image/png" if kind == "image" else "video/mp4")
        f = await save_file(db, user_id, dl.content, ctype, "thumbnail.png" if kind == "image" else "clip.mp4", kind)
        await db.media_jobs.update_one({"id": job_id}, {"$set": {"status": "done", "file_id": f["id"], "content_type": ctype}})
    except Exception as exc:
        logger.error("media job %s failed: %s", job_id, exc)
        await db.media_jobs.update_one({"id": job_id}, {"$set": {"status": "error", "error": str(exc)[:300]}})


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode()
