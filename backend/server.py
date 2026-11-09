from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import logging
import os
import time
from contextlib import suppress
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

import bcrypt
import httpx
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
import json
import uuid
import services as svc
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'aegis_db')]
logger = logging.getLogger("aegis")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

JWT_ALG = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "aegis_dev_jwt_secret_change_in_production")

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "user_state": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "fit_daily": [IndexModel([("user_id", ASCENDING), ("day", ASCENDING)], name="user_day", unique=True)],
    "files": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("user_id", ASCENDING), ("created_at", ASCENDING)], name="user_created")],
    "media_jobs": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "user_sessions": [IndexModel([("session_token", ASCENDING)], name="session_token")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id: str, kind: str, ttl: timedelta, email: str = "") -> str:
    payload = {"sub": user_id, "email": email, "type": kind, "exp": datetime.now(timezone.utc) + ttl}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def user_out(u: dict) -> dict:
    return {"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""), "role": u.get("role", "user")}


def issue_session(response: Response, u: dict) -> dict:
    uid = str(u["_id"])
    access = make_token(uid, "access", timedelta(hours=12), u["email"])
    refresh = make_token(uid, "refresh", timedelta(days=30))
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=2592000, path="/")
    return {"user": user_out(u), "access_token": access, "refresh_token": refresh}


async def current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    return await user_from_token(token)


async def user_from_token(token: Optional[str]) -> dict:
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(401, "User not found")
    return user


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(LoginIn):
    name: str = "Operator"


class RefreshIn(BaseModel):
    refresh_token: Optional[str] = None


class StateIn(BaseModel):
    data: dict
    updated_at: int


class FitDay(BaseModel):
    day: str
    steps: int = Field(ge=0)
    distance_m: float = Field(ge=0)
    calories_kcal: float = Field(ge=0)


class FitIn(BaseModel):
    days: list[FitDay] = Field(min_length=1, max_length=31)


class WebhookIn(BaseModel):
    url: str
    method: str = "POST"
    payload: Optional[Any] = None
    headers: dict[str, str] = {}


app = FastAPI(title="Aegis OS API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"system": "Aegis OS", "zero": "online"}


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.strip().lower()
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {"email": email, "password_hash": hash_password(body.password), "name": body.name, "role": "user",
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return issue_session(response, doc)


async def _login(email: str, password: str, request: Request, response: Response) -> dict:
    email = email.strip().lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    now = time.time()
    if att and att.get("locked_until", 0) > now:
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        count = (att or {}).get("count", 0) + 1
        upd = {"count": count, "locked_until": now + 900 if count >= 5 else 0}
        await db.login_attempts.update_one({"identifier": ident}, {"$set": upd}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_many({"identifier": ident})
    return issue_session(response, user)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    return await _login(body.email, body.password, request, response)


@api.post("/auth/demo")
async def demo_login(request: Request, response: Response):
    if os.environ.get("DEMO_LOGIN_ENABLED") != "true":
        raise HTTPException(403, "Demo login disabled")
    return await _login(os.environ.get("ADMIN_EMAIL", "arjun@aegis.dev"), os.environ.get("ADMIN_PASSWORD", "zero2026"), request, response)


@api.post("/auth/refresh")
async def refresh(body: RefreshIn, request: Request, response: Response):
    token = body.refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(401, "User not found")
    return issue_session(response, user)


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user_out(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/state")
async def get_state(user: dict = Depends(current_user)):
    doc = await db.user_state.find_one({"user_id": str(user["_id"])}, {"_id": 0})
    if not doc:
        return {"data": None, "updated_at": 0}
    return {"data": doc["data"], "updated_at": doc["updated_at"]}


@api.put("/state")
async def put_state(body: StateIn, user: dict = Depends(current_user)):
    uid = str(user["_id"])
    await db.user_state.update_one(
        {"user_id": uid},
        {"$set": {"data": body.data, "updated_at": body.updated_at, "synced_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "updated_at": body.updated_at}


@api.post("/fit/daily")
async def save_fit(body: FitIn, user: dict = Depends(current_user)):
    uid = str(user["_id"])
    for d in body.days:
        await db.fit_daily.update_one(
            {"user_id": uid, "day": d.day},
            {"$set": {"steps": d.steps, "distance_m": d.distance_m, "calories_kcal": d.calories_kcal}},
            upsert=True,
        )
    return {"saved": len(body.days)}


@api.post("/webhooks/fire")
async def fire_webhook(body: WebhookIn, user: dict = Depends(current_user)):
    if not body.url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    method = body.method.upper()
    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        raise HTTPException(400, "Unsupported method")
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as hc:
            kwargs = {"headers": body.headers}
            if method != "GET" and body.payload is not None:
                kwargs["json"] = body.payload
            r = await hc.request(method, body.url, **kwargs)
        ms = round((time.perf_counter() - started) * 1000)
        out = {"ok": r.is_success, "status": r.status_code, "ms": ms, "body": r.text[:4000]}
    except httpx.HTTPError as exc:
        ms = round((time.perf_counter() - started) * 1000)
        out = {"ok": False, "status": 0, "ms": ms, "body": f"{type(exc).__name__}: {exc}"}
    out.update(await svc.jev_webhook(out["status"], out["body"]))
    return out


class GoogleIn(BaseModel):
    session_id: str


@api.post("/auth/google")
async def google_session(body: GoogleIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Google session invalid or expired")
    g = r.json()
    email = g["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        doc = {"email": email, "name": g.get("name", ""), "picture": g.get("picture"), "role": "user",
               "user_id": f"user_{uuid.uuid4().hex[:12]}", "password_hash": hash_password(uuid.uuid4().hex),
               "created_at": datetime.now(timezone.utc).isoformat()}
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        user = doc
    else:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"picture": g.get("picture")}})
    await db.user_sessions.insert_one({"user_id": str(user["_id"]), "session_token": g.get("session_token"),
                                       "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                                       "created_at": datetime.now(timezone.utc)})
    return issue_session(response, user)


ZERO_SYSTEM = """You are Zero, the AI Chief-of-Staff inside Aegis OS for a B.Tech CSE student. Be crisp, tactical and warm; use short paragraphs or bullets; never mention being a language model.
You receive LIVE DATABASE CONTEXT (tasks, today's classes and free gaps, upcoming exams, weakest syllabus modules, due DSA revisions, sleep/steps/energy).
Detected intent: {intent}.
After your reply, if (and only if) a database write would help, output a line exactly `<<<ACTIONS>>>` followed by a JSON array of action objects. Allowed:
{{"type":"add_tasks","label":"short button label","items":[{{"title":"...","priority":"high|med|low","due":"YYYY-MM-DD"}}]}}
{{"type":"add_classes","label":"...","items":[{{"code":"CS301","name":"...","day":1,"start":"HH:MM","end":"HH:MM","room":"...","type":"lecture|lab"}}]}}   (day: 0=Sun..6=Sat)
{{"type":"add_exams","label":"...","items":[{{"course":"CS301","title":"...","date":"YYYY-MM-DD"}}]}}
{{"type":"set_mode","label":"...","mode":"normal|exam|emergency"}}
Study blocks are add_tasks items whose title starts with the time window, e.g. "14:00–16:00 · Deep work: OS Deadlocks"."""


class ChatIn(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    messages: list[dict] = Field(min_length=1, max_length=30)
    context: dict = {}


@api.post("/ai/chat")
async def ai_chat(body: ChatIn, user: dict = Depends(current_user)):
    last = str(body.messages[-1].get("text", ""))[:4000]
    history = "\n".join(f"{m.get('role', 'user').upper()}: {str(m.get('text', ''))[:1500]}" for m in body.messages[-9:-1])
    prompt = f"LIVE DATABASE CONTEXT:\n{json.dumps(body.context)[:9000]}\n\nRECENT CONVERSATION:\n{history or '(none)'}\n\nUSER: {last}"

    async def gen():
        intent = await svc.jev_intent(last) or "general"
        yield f"data: {json.dumps({'intent': intent})}\n\n"
        try:
            async for t in svc.llm_stream(body.provider, body.model, ZERO_SYSTEM.format(intent=intent), prompt):
                yield f"data: {json.dumps({'t': t})}\n\n"
        except Exception as exc:
            logger.error("ai chat failed: %s", exc)
            yield f"data: {json.dumps({'error': str(exc)[:200]})}\n\n"
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class QuizIn(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    subject: str
    topics: str = ""


@api.post("/ai/quiz")
async def ai_quiz(body: QuizIn, user: dict = Depends(current_user)):
    system = "You write rigorous university CSE MCQs. Output ONLY JSON."
    text = (f"Create exactly 10 MCQs for {body.subject}. Focus topics: {body.topics[:2000] or 'core syllabus'}.\n"
            'Return {"questions":[{"q":"...","options":["a","b","c","d"],"answer":0,"explain":"one sentence"}]}')
    try:
        data = svc.parse_json(await svc.llm_collect(body.provider, body.model, system, text))
        qs = [q for q in data.get("questions", []) if len(q.get("options", [])) == 4][:10]
        if len(qs) < 5:
            raise ValueError("too few questions")
        return {"questions": qs}
    except Exception as exc:
        raise HTTPException(502, f"Quiz generation failed: {exc}")


OCR_PROMPT = """Extract every class from this university timetable image. Return ONLY a JSON array:
[{"code":"CS301","name":"Operating Systems","day":1,"start":"09:00","end":"10:00","room":"LH-204","type":"lecture"}]
day: 0=Sun,1=Mon..6=Sat. 24h HH:MM. type is "lab" for labs/practicals else "lecture". Use "TBA" for missing room."""


@api.post("/ai/ocr")
async def ai_ocr(file: UploadFile = File(...), provider: str = Form("openai"), model: str = Form(""), user: dict = Depends(current_user)):
    data = await file.read()
    if len(data) > 8 * 1024 * 1024 or not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Upload a PNG/JPEG/WEBP image under 8 MB")
    saved = await svc.save_file(db, str(user["_id"]), data, file.content_type, file.filename or "timetable.png", "timetable")
    p = provider if provider in ("openai", "gemini") else "openai"
    try:
        raw = await svc.llm_collect(p, model or None, "You are a precise OCR + table parser.", OCR_PROMPT, [svc.b64(data)])
        rows = svc.parse_json(raw)
        if isinstance(rows, dict):
            rows = rows.get("classes", [])
        return {"file_id": saved["id"], "classes": rows}
    except Exception as exc:
        raise HTTPException(502, f"OCR failed: {exc}")


class TtsIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


@api.post("/ai/tts")
async def ai_tts(body: TtsIn, user: dict = Depends(current_user)):
    audio: bytes = b""
    try:
        audio = await svc.tts(body.text)
    except Exception as exc:
        raise HTTPException(502, f"Speech failed: {exc}")
    return Response(content=audio, media_type="audio/mpeg")


@api.post("/ai/stt")
async def ai_stt(file: UploadFile = File(...), user: dict = Depends(current_user)):
    data = await file.read()
    if len(data) > 24 * 1024 * 1024:
        raise HTTPException(400, "Audio too large")
    try:
        return {"text": await svc.stt(data, file.filename or "voice.webm")}
    except Exception as exc:
        raise HTTPException(502, f"Transcription failed: {exc}")


class JevIn(BaseModel):
    kind: str
    payload: dict


@api.post("/jev/decide")
async def jev_decide(body: JevIn, user: dict = Depends(current_user)):
    try:
        return await svc.jev_decide(body.kind, body.payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        logger.warning("jev decide failed: %s", exc)
        raise HTTPException(503, "Decision service is busy, try again shortly.")


@api.post("/files")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(current_user)):
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (20 MB max)")
    doc = await svc.save_file(db, str(user["_id"]), data, file.content_type or "application/octet-stream", file.filename or "file", "upload")
    doc.pop("_id", None)
    return doc


@api.get("/files")
async def list_files(user: dict = Depends(current_user)):
    return await db.files.find({"user_id": str(user["_id"]), "is_deleted": False}, {"_id": 0, "storage_path": 0}).sort("created_at", -1).to_list(200)


@api.get("/files/{file_id}/download")
async def download_file(file_id: str, request: Request, auth: Optional[str] = Query(None)):
    user = await user_from_token(auth) if auth else await current_user(request)
    rec = await db.files.find_one({"id": file_id, "user_id": str(user["_id"]), "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ctype = await asyncio.to_thread(svc.get_object, rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type") or ctype)


class MediaIn(BaseModel):
    kind: str = Field(pattern="^(image|video)$")
    prompt: str = Field(min_length=3, max_length=1500)


@api.post("/media/jobs")
async def create_media_job(body: MediaIn, user: dict = Depends(current_user)):
    job = {"id": str(uuid.uuid4()), "user_id": str(user["_id"]), "kind": body.kind, "prompt": body.prompt,
           "status": "running", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.media_jobs.insert_one(dict(job))
    asyncio.create_task(svc.run_media_job(db, job["id"], job["user_id"], body.kind, body.prompt))
    job.pop("user_id")
    return job


@api.get("/media/jobs/{job_id}")
async def get_media_job(job_id: str, user: dict = Depends(current_user)):
    job = await db.media_jobs.find_one({"id": job_id, "user_id": str(user["_id"])}, {"_id": 0, "user_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "arjun@aegis.dev").lower()
    if await db.users.find_one({"email": email}) is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(os.environ.get("ADMIN_PASSWORD", "zero2026")),
                                   "name": "Arjun", "role": "admin",
                                   "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info("Seeded admin %s", email)


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed_admin()
    try:
        await asyncio.to_thread(svc.init_storage)
        logger.info("Storage initialized")
    except Exception as exc:
        logger.error("Storage init failed: %s", exc)


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
