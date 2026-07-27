# Hotseat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A real-time daily question platform for friend groups. One question drops every day at 9:00 AM CET. Everyone submits their answer privately. Once you've answered, the results unlock and you can see what your friends said — alongside a live group chat, GIF search, and push notifications.

**Live Demo:** [hotseat.site](https://hotseat.site)

## Architecture Overview

```
hotseat/
├── hotseat-backend/               # Express API server + static file hosting
│   ├── server.js                  # Entry point — middleware, route mounting, Socket.IO, cron init
│   ├── config/
│   │   ├── db.js                  # PostgreSQL connection pool + idempotent schema migrations
│   │   └── env.js                 # Environment variable validation (dotenv)
│   ├── routes/
│   │   ├── authRoutes.js          # Join, password, recovery, profile picture upload
│   │   ├── groupRoutes.js         # Create/join/leave groups, rename, kick members
│   │   ├── answerRoutes.js        # Daily question, submit answer, calendar, recap, push subscribe
│   │   └── chatRoutes.js          # Chat history fetch, chat image upload
│   ├── sockets/
│   │   └── socketHandler.js       # Socket.IO: room management, chat broadcast, push notifications
│   ├── middleware/
│   │   ├── rateLimiter.js         # Express rate limiters (general, strict, suggestion)
│   │   ├── logger.js              # Request/response logging with status-coloured output
│   │   └── upload.js              # Multer config for profile picture and chat image uploads
│   ├── cron/
│   │   └── dailyDrop.js           # 9:00 AM daily question rotation + push notification broadcast
│   ├── .env.example               # Backend environment variable template
│   └── uploads/                   # User-uploaded avatars and chat media (gitignored)
├── hotseat-frontend/              # React SPA (Vite + TailwindCSS)
│   ├── src/
│   │   ├── store/useStore.js      # Zustand global state (persisted to localStorage)
│   │   ├── pages/                 # Route-level page components
│   │   ├── components/            # Shared UI components (BottomNav)
│   │   ├── useSFX.js              # Sound effects hook
│   │   ├── pushUtility.js         # Web push subscription client
│   │   └── translations.js        # i18n dictionary (English / Italian)
│   ├── .env.example               # Frontend environment variable template
│   └── dist/                      # Production build output (gitignored)
├── .gitignore                     # Comprehensive ignore rules (env, secrets, uploads, DB dumps, etc.)
├── LICENSE                        # MIT License
└── README.md
```

## Design Philosophy

- **Single-instance server** — The Express API serves both the REST layer and the production React build from a single Node.js process. No separate static file server or reverse proxy required.
- **Idempotent infrastructure** — Schema migrations use `IF NOT EXISTS` guards exclusively. The server boot sequence (`config/db.js → initDatabase()`) is safe to run repeatedly under PM2 restarts without corrupting existing data.
- **Thin middleware pipeline** — Each middleware module (rate limiting, logging, file upload) is isolated in its own file. Route handlers delegate to dedicated router modules, keeping `server.js` under 70 lines.
- **State lives in the database** — No Redis, no in-memory caches. Group membership, answers, and chat history are all queryable via parameterized SQL. The Zustand frontend store acts as a local cache only, hydrated from API responses.
- **Push over poll** — Real-time updates (chat, answer submissions, group changes) are delivered via WebSocket events rather than client-side polling. Web push notifications serve as the offline fallback channel.

## Core Features

- **Daily question drop** — A cron job selects a random question each day at 9:00 AM CET, with support for multiple UI types (text, slider, multiple choice, tag-a-friend) and targeted questions (personalized by inserting the target's name).
- **Multi-group support** — Users belong to one or more groups, each with its own invite code, roster, and daily question stream.
- **Real-time results** — Once a user answers, they see other members' answers with staggered reveal animations. Tag-type questions show a ranked vote breakdown with progress bars and voter avatars.
- **Live group chat** — WebSocket-powered chat with text messages, image uploads, GIPHY search, and typing indicators. Chat history persists across sessions and resets daily.
- **Answer archive & calendar** — Every answer is archived daily. Users can browse a monthly calendar grid to revisit past questions and answers per day.
- **Weekly/Monthly recaps** — Leaderboard-style awards: MVP, Novelist (longest answers), Speedster (fastest to answer), Ghost (least active), and Hottest Day.
- **Push notifications** — Web push (VAPID) for daily question alerts and group activity. Users subscribe from the results page.
- **Account recovery** — Optional bcrypt-hashed password lets users recover their account across devices or after clearing browser data.
- **Admin controls** — Any group member can manage the roster (kick members), rename the group, and leave.
- **i18n** — English and Italian translations via a runtime dictionary.
- **Rate limiting** — Express rate limiters protect join, answer, upload, and suggestion endpoints.
- **Security headers** — Helmet middleware sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and other security headers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 4, Framer Motion 11, React Router DOM 6, Zustand 5 |
| Backend | Node.js, Express 5, Socket.IO 4, node-cron, bcrypt 6, multer, web-push |
| Database | PostgreSQL via node-postgres (pg) |

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Clone & Install

```bash
git clone <repo-url>
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

Tables are created automatically on server start via the idempotent schema auto-patch in `config/db.js` (`initDatabase()`). All `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` statements are safe to run on every restart.

### 3. Seed Questions (Optional)

The question bank must be populated manually via `psql` or a database GUI. The `questions` table expects:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `text` | TEXT | Question text (English) |
| `text_it` | TEXT | Question text (Italian, optional) |
| `ui_type` | VARCHAR | `text`, `slider`, `choice`, or `tag` |
| `is_targeted` | BOOLEAN | If true, `{TARGET}` in text is replaced with a user's name |
| `options` | JSONB | Array of strings for choice-type questions |
| `category` | VARCHAR | Display label (optional) |
| `is_active` | BOOLEAN | Automatically managed by the server |
| `used_date` | DATE | Automatically managed by the server |
| `injected_text` | TEXT | Automatically managed (final text with targets resolved) |
| `injected_text_it` | TEXT | Automatically managed |

### 4. Run

```bash
# Terminal 1 — Backend (port 5000)
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
# Output goes to hotseat-frontend/dist/
# The backend serves this folder as static files.
```

## Environment Variables

### Backend (`hotseat-backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_NAME` | Yes | PostgreSQL database name |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_PORT` | No | PostgreSQL port (default: 5432) |
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key for web push |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key for web push |
| `VAPID_EMAIL` | Yes | Contact email for VAPID (mailto: format) |
| `CORS_ORIGIN` | Yes | Frontend origin (e.g. `https://hotseat.site`) |
| `SERVER_PORT` | No | HTTP port (default: 5000) |

### Frontend (`hotseat-frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SERVER_URL` | Yes | Backend API URL (no trailing slash) |
| `VITE_GIPHY_KEY` | No | GIPHY API key for GIF search in chat |
| `VITE_VAPID_PUBLIC_KEY` | No | Must match backend `VAPID_PUBLIC_KEY` for push notifications |

## API Routes

All routes are prefixed with `/api/`. Rate-limited routes use stricter limits.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/daily-question` | No | Returns the currently active question |
| POST | `/api/join` | No | Creates a user and joins/creates a group |
| POST | `/api/join-group` | No | Adds an existing user to a group by code |
| POST | `/api/create-group` | No | Creates a new group for an existing user |
| GET | `/api/user-groups/:user_id` | No | Lists all groups a user belongs to |
| POST | `/api/answer` | Member | Submits today's answer for a group |
| GET | `/api/answers/:group_id/:question_id` | Member | Fetches answers for a group/question |
| GET | `/api/chat/:group_id` | Member | Fetches today's chat messages |
| POST | `/api/upload-pfp` | No | Uploads a profile picture (max 5 MB) |
| POST | `/api/chat-image` | No | Uploads a chat image (max 10 MB) |
| POST | `/api/leave-group` | No | Removes user from a group |
| POST | `/api/update-group` | Member | Renames a group (broadcast via WS) |
| POST | `/api/admin/kick-member` | Member | Removes a user from the group |
| GET | `/api/group-members/:group_id` | Member | Lists all members of a group |
| POST | `/api/set-password` | No | Sets a bcrypt-hashed recovery password |
| POST | `/api/recover-account` | No | Recovers account by name + password |
| POST | `/api/suggest-question` | No | Submits a suggested question (5/hr limit) |
| POST | `/api/push/subscribe` | No | Stores a push notification subscription |
| GET | `/api/calendar/:group_id` | Member | Lists dates with archived answers |
| GET | `/api/calendar/:group_id/:date` | Member | Lists archived answers for a specific date |
| GET | `/api/recap/:group_id/:period` | Member | Weekly/monthly recap stats |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Joins a group room (validated against DB) |
| `leave_room` | Client → Server | Leaves a group room |
| `send_message` | Client → Server | Broadcasts a chat message to the room + persists to DB |
| `receive_message` | Server → Client | Incoming chat message |
| `typing_start` | Client → Server | Signals typing has begun |
| `typing_end` | Client → Server | Signals typing has stopped |
| `user_typing` | Server → Client | Another user is typing |
| `user_stopped_typing` | Server → Client | Another user stopped typing |
| `answer_submitted` | Server → Group | Notifies group that a new answer was submitted |
| `group_name_updated` | Server → Group | Notifies group that the group name changed |
| `user_kicked` | Server → Client | Notifies a user they were removed from the group |

## Author

Built by **Karam** — Computer Engineering student.

[GitHub](https://github.com/dobbyyv)
