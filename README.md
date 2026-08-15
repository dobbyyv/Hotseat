# Hotseat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A real-time daily question platform for friend groups. One question drops every day at 9:00 AM CET. Everyone submits their answer privately. Once you've answered, the results unlock and you can see what your friends said — alongside a live group chat, GIF search, and push notifications.

Hotseat started as a simple, zero-stress app built just for me and my friends to use daily. But as I kept working on it, it turned into an accidental playground for learning full-stack engineering. 

Instead of treating it like a static homework assignment, I started "min-maxing" it, diving down rabbit holes to figure out how real-time WebSockets actually behave under the hood, how to structure clean Express routing, and how to patch backend gaps, just to see how a robust system should be built. Not because it needed to be enterprise-grade. I just wanted to see how far I could take it.

**Live Demo:** [hotseat.site](https://hotseat.site) / Temporarily off 

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Author](#author)

## Features

### Daily Question Engine
- Cron-driven 9:00 AM CET question rotation with archived answer history
- Polymorphic question types: open‑ended text, ranked member voting, multiple choice, 0–100 sliders
- Legacy type aliasing (`tag` → `vote_member`) with keyword‑based type inference fallback
- Targeted questions — user names are injected at render time via `{TARGET}` placeholders
- User‑submitted question suggestions with per‑IP rate limiting

### Real‑Time Social Hub
- Socket.IO‑powered live group chat with message persistence in PostgreSQL
- Typing indicators with automatic timeout
- Image uploads (10 MB limit) and GIPHY GIF search via the Giphy API
- Quick emoji reactions and custom dark WebKit scrollbar styling
- Answer‑submitted notifications broadcast instantly to all room members

### Canvas Physics & Visual Atmosphere
- 48‑particle interactive physics engine (`OrbField`) — elastic collisions, wall bounce with energy damping, grab‑and‑fling pointer interaction with momentum trails
- Orbs cast a soft glow through the panels above them via `ctx.shadowBlur`
- Mouse‑tracked spotlight grid with radial mask and cursor torch, updated via a zero‑React‑rerender `requestAnimationFrame` loop writing CSS custom properties directly to the DOM
- SVG film grain overlay and static ambient depth orbs for layered atmosphere

### UI / UX Architecture
- Strict viewport‑locked layout (`h-screen` root with `overflow: hidden`) — zero global scroll bleed
- Flex chain (`h‑screen → h‑full → flex‑1 min‑h‑0`) ensures chat containers never overflow the viewport
- Text selection is disabled everywhere except in text inputs
- Animated route transitions via Framer Motion `AnimatePresence` with crossfade directionality
- Zinc monochrome design system with glassmorphic panels (`backdrop‑blur‑2xl`, semi‑transparent dark overlays)
- Zero‑padded odometer‑style countdown timer using `useMotionValueEvent` for spring‑driven number animation
- Sound effect system with cloned `Audio` nodes for gapless overlapping playback

### Account & Group Management
- Multi‑group support — users belong to one or more groups, each with its own invite code, roster, and daily question stream
- Admin controls — kick members, rename groups, leave groups (broadcast via WebSocket)
- Optional bcrypt‑hashed password for cross‑device account recovery
- Profile picture upload with UUID‑based safe filenames
- Zustand state management with `persist` middleware — auth state survives page reloads

### Data & Analytics
- Answer archive with calendar‑grid date browsing
- Weekly/monthly recap leaderboards (MVP, Novelist, Speedster, Ghost, Hottest Day) — Ghost is the member with the fewest answers
- Web push notifications (VAPID) for daily question alerts with stale subscription auto‑cleanup

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, Vite 5 |
| **Styling** | Tailwind CSS 4, `@tailwindcss/vite` |
| **Animation** | Framer Motion 11, HTML5 Canvas 2D |
| **Routing** | React Router DOM 6 |
| **State** | Zustand 5 (with `persist` middleware) |
| **Icons** | Lucide React |
| **Backend Runtime** | Node.js, Express 5 |
| **Real‑Time** | Socket.IO 4 |
| **Database** | PostgreSQL via `node-postgres` (`pg`) |
| **Scheduling** | `node-cron` |
| **Auth / Recovery** | `bcrypt` |
| **Push Notifications** | `web-push` (VAPID) |
| **File Uploads** | `multer` |
| **Security** | `helmet`, `express-rate-limit`, `cors` |
| **Testing** | Jest, Supertest |

## Architecture

For layout strategy, state flow, and the canvas rendering stack, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Project Structure

```
hotseat/
├── hotseat-backend/
│   ├── server.js                  # Express entry — middleware, routes, Socket.IO, cron
│   ├── config/
│   │   ├── db.js                  # PostgreSQL pool + idempotent schema auto‑patch
│   │   └── env.js                 # Environment variable validation
│   ├── routes/
│   │   ├── authRoutes.js          # Join, password, recovery, profile picture upload
│   │   ├── groupRoutes.js         # Create/join/leave groups, rename, kick members
│   │   ├── answerRoutes.js        # Daily question, submit answer, calendar, recap, push
│   │   └── chatRoutes.js          # Chat history fetch, chat image upload
│   ├── sockets/
│   │   └── socketHandler.js       # Room management, chat broadcast, push notifications
│   ├── middleware/
│   │   ├── rateLimiter.js         # General, strict, and suggestion rate limiters
│   │   ├── logger.js              # Status‑coloured request/response logging
│   │   └── upload.js              # Multer config (profile pictures, chat images)
│   ├── cron/
│   │   └── dailyDrop.js           # 9:00 AM question rotation + push broadcast
│   ├── .env.example
│   └── uploads/                   # User‑uploaded files (gitignored)
├── hotseat-frontend/
│   ├── src/
│   │   ├── App.jsx                # Root layout, background layers, mouse tracking, WebSocket init
│   │   ├── main.jsx               # ReactDOM entry + service worker registration
│   │   ├── store/useStore.js      # Zustand global state
│   │   ├── components/
│   │   │   ├── BottomNav.jsx      # Fixed bottom tab bar
│   │   │   ├── OrbField.jsx       # Canvas 2D physics particle system
│   │   │   ├── AnimatedNumber.jsx # Spring‑driven odometer component
│   │   │   ├── ErrorBoundary.jsx  # React error boundary
│   │   │   └── Toast.jsx          # Auto‑dismiss notification
│   │   ├── pages/
│   │   │   ├── JoinPage.jsx       # Onboarding + account recovery
│   │   │   ├── HubPage.jsx        # Group selection hub
│   │   │   ├── HomePage.jsx       # Today's question + countdown + CTA
│   │   │   ├── AnswerPage.jsx     # Answer submission (text / vote / choice / slider)
│   │   │   ├── ResultsPage.jsx    # Answer feed + vote breakdown + live chat
│   │   │   ├── ProfilePage.jsx    # User profile + group settings
│   │   │   ├── ManageGroup.jsx    # Admin panel (kick, rename, leave)
│   │   │   └── InfoPage.jsx       # Answer archive calendar + recaps
│   │   ├── hooks/
│   │   │   └── useTypingEffect.js # Typewriter animation hook
│   │   ├── lib/utils.js           # Shared utilities
│   │   ├── useSFX.js              # Sound effect playback hook
│   │   ├── pushUtility.js         # Web push subscription client
│   │   └── translations.js        # English / Italian i18n dictionary
│   ├── public/
│   │   ├── sw.js                  # Service worker (push notification handler)
│   │   └── sounds/                # Compressed .mp3 SFX files
│   ├── .env.example
│   └── dist/                      # Vite production build (gitignored)
├── .gitignore
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** 9+

### 1. Clone & Install

```bash
git clone https://github.com/dobbyyv/Hotseat.git
cd hotseat

# Backend
cd hotseat-backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials, VAPID keys, and CORS origin
npm install

# Frontend
cd ../hotseat-frontend
cp .env.example .env
# Edit .env with VITE_SERVER_URL, VITE_GIPHY_KEY, VITE_VAPID_PUBLIC_KEY
npm install
```

### 2. Database

Create a PostgreSQL database matching your `DB_NAME` in `.env`:

```sql
CREATE DATABASE hotseat_db;
CREATE USER hotseat_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hotseat_db TO hotseat_admin;
```

Tables are created automatically on server start via the idempotent schema auto‑patch in `config/db.js`. All `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements are safe to run on every restart.

### 3. Seed Questions (Optional)

Populate the `questions` table via `psql` or a database GUI:

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | Primary key |
| `text` | TEXT | Question text (English) |
| `text_it` | TEXT | Question text (Italian, optional) |
| `ui_type` | VARCHAR | `text`, `slider`, `choice`, `tag`, or `vote_member` |
| `is_targeted` | BOOLEAN | If true, `{TARGET}` in text is replaced with a user's name |
| `options` | JSONB | Array of strings for choice‑type questions |
| `category` | VARCHAR | Display label (optional) |
| `is_active` | BOOLEAN | Managed automatically by the server |
| `used_date` | DATE | Managed automatically by the server |
| `injected_text` | TEXT | Managed automatically (targets resolved) |
| `injected_text_it` | TEXT | Managed automatically (targets resolved) |

### 4. Run

```bash
# Terminal 1 — Backend (default port 5000)
cd hotseat-backend
node server.js

# Terminal 2 — Frontend dev server (default port 5173)
cd hotseat-frontend
npm run dev
```

### 5. Production Build

```bash
cd hotseat-frontend
npm run build
# Output → hotseat-frontend/dist/
# The backend serves this folder as static files — no separate web server needed.
```

## Environment Variables

### Backend (`hotseat-backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_NAME` | Yes | PostgreSQL database name |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_PORT` | No | PostgreSQL port (default: `5432`) |
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key for web push |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key for web push |
| `VAPID_EMAIL` | Yes | Contact email for VAPID (`mailto:` format) |
| `CORS_ORIGIN` | Yes | Frontend origin (e.g. `https://hotseat.site`) |
| `SERVER_PORT` | No | HTTP port (default: `5000`) |

### Frontend (`hotseat-frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SERVER_URL` | Yes | Backend API URL (no trailing slash) |
| `VITE_GIPHY_KEY` | No | GIPHY API key for GIF search in chat |
| `VITE_VAPID_PUBLIC_KEY` | No | Must match backend `VAPID_PUBLIC_KEY` for push notifications |

## API Reference

All routes are prefixed with `/api/`. Rate‑limited endpoints use stricter limits.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/daily-question` | — | Returns the currently active question |
| `POST` | `/api/join` | — | Creates a user and joins/creates a group |
| `POST` | `/api/join-group` | — | Adds an existing user to a group by code |
| `POST` | `/api/create-group` | — | Creates a new group for an existing user |
| `GET` | `/api/user-groups/:user_id` | — | Lists all groups a user belongs to |
| `POST` | `/api/answer` | Member | Submits today's answer for a group |
| `GET` | `/api/answers/:group_id/:question_id` | Member | Fetches answers for a group/question |
| `GET` | `/api/chat/:group_id` | Member | Fetches today's chat messages |
| `POST` | `/api/upload-pfp` | — | Uploads a profile picture (max 5 MB) |
| `POST` | `/api/chat-image` | — | Uploads a chat image (max 10 MB) |
| `POST` | `/api/leave-group` | — | Removes user from a group |
| `POST` | `/api/update-group` | Member | Renames a group (broadcast via WebSocket) |
| `POST` | `/api/admin/kick-member` | Member | Removes a user from the group |
| `GET` | `/api/group-members/:group_id` | Member | Lists all members of a group |
| `POST` | `/api/set-password` | — | Sets a bcrypt‑hashed recovery password |
| `POST` | `/api/recover-account` | — | Recovers account by name + password |
| `POST` | `/api/suggest-question` | — | Submits a suggested question (5/hr limit) |
| `POST` | `/api/push/subscribe` | — | Stores a push notification subscription |
| `GET` | `/api/calendar/:group_id` | Member | Lists dates with archived answers |
| `GET` | `/api/calendar/:group_id/:date` | Member | Archived answers for a specific date |
| `GET` | `/api/recap/:group_id/:period` | Member | Weekly/monthly recap stats |

## WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `join_room` | Client → Server | Joins a group room (validated against DB) |
| `leave_room` | Client → Server | Leaves a group room |
| `send_message` | Client → Server | Broadcasts a chat message + persists to DB |
| `receive_message` | Server → Client | Incoming chat message |
| `typing_start` | Client → Server | Signals typing has begun |
| `typing_end` | Client → Server | Signals typing has stopped |
| `user_typing` | Server → Client | Another user is typing |
| `user_stopped_typing` | Server → Client | Another user stopped typing |
| `answer_submitted` | Server → Group | Notifies group that a new answer was submitted |
| `group_name_updated` | Server → Group | Group name changed |
| `user_kicked` | Server → Client | User was removed from the group |

## Author

Built by **Karam** — Computer Engineering student.

[GitHub](https://github.com/dobbyyv)