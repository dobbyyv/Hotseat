# Architecture

## Layout Strategy

The entire viewport is locked at `h-screen overflow-hidden` on the root `<main>` element. Every interior container uses `h-full` to form an unbroken flex chain down to the deepest scrollable region (`flex-1 min-h-0 overflow-y-auto`). This guarantees that chat panels and result cards never push the bottom navigation bar off‑screen, regardless of message count.

## State Flow

```
Zustand Store (persisted to localStorage)
 ├─ user / group / streak / lang     ← survives page reloads
 ├─ currentQuestion / groupAnswers   ← fetched fresh from API on mount
 └─ UI flags (isLoading, error)      ← ephemeral, never persisted

Socket.IO
 ├─ join_room / leave_room           ← membership validated against DB on every join
 ├─ send_message → receive_message   ← broadcast + PostgreSQL persistence
 └─ answer_submitted                 ← triggers store.fetchGroupAnswers() client‑side
```

## Background Rendering Stack (z‑index order)

| Layer | z‑index | Role |
|---|---|---|
| Static ambient orbs (blurred divs) | `z‑0` | Atmospheric depth |
| `<OrbField />` canvas | `z‑0` | Interactive physics particles with shadowBlur glow |
| Spotlight grid + cursor torch | `z‑[5]` | Mouse‑tracked radial mask over 18px dot grid |
| Film grain SVG | `z‑50` | `mix‑blend‑overlay` at 3% opacity |
| Foreground UI container | `z‑10` | Routes, panels, bottom nav — all above canvas |

The canvas sits behind the UI. Semi‑transparent glassmorphic panels (`bg‑zinc‑900/60 backdrop‑blur‑2xl`) diffuse the orb glow natively via the GPU compositor — no JavaScript DOM tracking needed.
