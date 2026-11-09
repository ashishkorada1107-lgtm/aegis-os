# Aegis OS — Personal AI Command Center

Aegis OS is an offline-first, ultra-fast 60FPS Personal AI Command Center PWA featuring an integrated AI Chief-of-Staff agent named **Zero**.

Designed following the Linear / Raycast / Cyber-Executive aesthetic with dense Bento grid layouts, hardware-accelerated transitions, and real-time offline synchronization.

---

## Features

- **Morning Briefing Dashboard:** Bento metric cards, today's schedule, Pomodoro focus timer with 20-20-20 eye strain protection protocol.
- **Timetable OCR & Class Alerts:** Interactive timetable management with class countdowns and 15-minute web notifications.
- **Zero AI Chief-of-Staff:** Integrated AI drawer (`Ctrl+K` command bar or slide-over HUD) running offline local inference or streaming via Gemini / Claude / GPT models.
- **Academic Quiz Hub:** 10-MCQ Rapid Quiz engine with course-wise tracking and review.
- **Coding & DSA Vault:** Spaced-repetition revision algorithm with GitHub streaks and problem difficulty tracking.
- **Bio-Performance & Health Hub:** Step counter ring, water tracker, sleep charts, and mental energy scoring.
- **Ops & Webhook Panel:** Quick-action HTTP triggers and creator utilities.
- **Settings & User Profiles:** Multi-user isolation, personalized command center state, and offline/cloud database backup.

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS, Craco, Lucide Icons, Sonner, PWA Service Worker + Web Manifest
- **Backend:** FastAPI, Motor (Async MongoDB), PyJWT, Bcrypt
- **Design:** Cyber-Executive Dark Theme (`#06080E`), Bento Cards (`#0D111A`), Cyan/Emerald/Violet accents

---

## Getting Started

### 1. Frontend Setup

```bash
cd frontend
yarn install
yarn start
```

To create an optimized production build:

```bash
cd frontend
yarn build
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```
