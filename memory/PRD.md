# Aegis OS — Product Requirements Document

## Original Problem Statement

Build a production-ready, offline-first, ultra-fast 60FPS Personal AI Command Center PWA called "Aegis OS", featuring an integrated AI Chief-of-Staff agent named "Zero".

## Tech Stack

- Frontend: React (CRA), Tailwind CSS, PWA (service worker + manifest), LocalStorage/IndexedDB offline fallback
- Backend: FastAPI (async), MongoDB (Motor), JWT auth
- 60FPS UI: pure CSS radial-gradients, hardware-accelerated transitions, NO heavy backdrop-blur
- Integrations: Emergent Universal Key → OpenAI/Claude/Gemini/fal.ai/STT/TTS, Jev (TypeSafe) routing, Emergent Managed Google Auth, Emergent Object Storage

## Modules (A–G)

- A: Morning Briefing Dashboard (KPI bento cards, Pomodoro)
- B: Timetable OCR & Class Alerts (15-min web notifications)
- C: Zero AI (HUD drawer, voice/chat UI)
- D: Academic Quiz Hub (10-MCQ Rapid Quiz)
- E: Coding & DSA Vault (GitHub streak, Spaced-repetition)
- F: Health Hub (Google Fit sync, step ring, sleep chart)
- G: Local Webhook Panel (HTTP trigger buttons)

## What's Implemented (as of 2026-02)

- Backend: `server.py` + `services.py` with routes for auth (email/password + Google), zero chat, tasks, state sync, fit daily, webhooks
- Frontend: Routing shell + all 9 page components (Home, Timetable, ZeroPage, Academics, Coding, Health, Ops, Settings, Login)
- PWA manifest + service worker
- Seed CSE student data on first load; mock fallback when Gemini key missing
- Jev integration (TypeSafe) wired with GPT 6 Luna classifier

## Auth

- Email/password: see `/app/memory/test_credentials.md`
- Emergent Managed Google Sign-In enabled
- Demo login: `POST /api/auth/demo`

## Backlog / Next

- P0: Runtime E2E validation across all 7 modules (testing_agent frontend pass)
- P1: Verify PWA offline-first flows (service worker + state sync)
- P1: Google Fit real sign-in + step sync verification
- P1: 15-minute class notification engine end-to-end
- P1: Jev routing coverage for the 5 chosen use cases
- P2: Timetable OCR real pipeline with mock fallback
- P2: Fal.ai video/image generation UI wiring in Zero drawer

## Health

- Services up: backend, frontend, mongodb
- `/api/` returns `{"system":"Aegis OS","zero":"online"}` ✅
- No automated QA loops have been run yet (per user instruction)
