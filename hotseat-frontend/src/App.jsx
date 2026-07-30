import { useEffect, useState, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { io } from 'socket.io-client'

import BottomNav from './components/BottomNav'

import JoinPage from './pages/JoinPage'
import HubPage from './pages/HubPage'
import HomePage from './pages/HomePage'
import AnswerPage from './pages/AnswerPage'
import ResultsPage from './pages/ResultsPage'
import ProfilePage from './pages/ProfilePage'
import ManageGroup from './pages/ManageGroup'
import InfoPage from './pages/InfoPage'

import useStore from './store/useStore'

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function AnimatedRoutes() {
  const location = useLocation()
  const { user, group: activeGroup } = useStore()
  const hasIdentity = !!user
  const isFullyAuthenticated = hasIdentity && !!activeGroup

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={hasIdentity ? <Navigate to="/hub" /> : <JoinPage />} />
          <Route path="/hub" element={hasIdentity ? <HubPage /> : <Navigate to="/" />} />
          <Route path="/home" element={isFullyAuthenticated ? <HomePage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
          <Route path="/answer" element={isFullyAuthenticated ? <AnswerPage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
          <Route path="/results" element={isFullyAuthenticated ? <ResultsPage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
          <Route path="/profile" element={hasIdentity ? <ProfilePage /> : <Navigate to="/" />} />
          <Route path="/manage-group" element={isFullyAuthenticated ? <ManageGroup /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
          <Route path="/info" element={isFullyAuthenticated ? <InfoPage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function App() {
  const { user, group: activeGroup } = useStore()
  
  const hasIdentity = !!user;
  const isFullyAuthenticated = hasIdentity && !!activeGroup;

  // ── Living Atmosphere: Mouse-tracking spotlight grid ──
  // useRef to avoid scheduling a React state update on every mousemove frame;
  // we sync the ref value into state via rAF for the spotlight to follow smoothly.
  const mouseRef = useRef({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const rafRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setMousePos(mouseRef.current)
        rafRef.current = null
      })
    }
  }, [])

  // Global WebSocket connection for real-time group updates
  useEffect(() => {
    if (!isFullyAuthenticated) return;

    const socket = io(SERVER_URL);
    socket.emit('join_room', { groupId: activeGroup.id, userId: user.id });

    socket.on('group_name_updated', (data) => {
      const currentGroup = useStore.getState().group;
      if (currentGroup && currentGroup.id === activeGroup.id) {
        useStore.getState().setGroup({ ...currentGroup, name: data.newName });
      }
    });

    socket.on('user_kicked', (data) => {
      if (data.target_user_id === user.id) {
        alert("You have been removed from this group.");
        useStore.getState().setGroup(null);
      }
    });

    return () => {
      socket.emit('leave_room', { groupId: activeGroup.id });
      socket.disconnect();
    }
  }, [isFullyAuthenticated, user?.id, activeGroup?.id]);

  return (
    <BrowserRouter>
      <main
        onMouseMove={handleMouseMove}
        className="relative min-h-screen w-full bg-[#08080c] text-zinc-50 overflow-hidden font-sans selection:bg-white/20 selection:text-white"
      >
        {/* ═══════════════════════════════════════════
            LAYER 1 — Ambient Depth Orbs
            Massive, slow-drifting blurred spheres that banish
            the dead black void and give organic 3D depth.
            ═══════════════════════════════════════════ */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Top-left warm orb */}
          <div
            className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-zinc-800/15 blur-[160px] pointer-events-none"
            style={{ animation: 'drift-orb-1 20s ease-in-out infinite alternate' }}
          />
          {/* Bottom-right cool orb */}
          <div
            className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-slate-900/20 blur-[160px] pointer-events-none"
            style={{ animation: 'drift-orb-2 24s ease-in-out infinite alternate' }}
          />
          {/* Center accent orb — subtle warm bloom */}
          <div
            className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-zinc-700/10 blur-[140px] pointer-events-none"
            style={{ animation: 'drift-orb-3 18s ease-in-out infinite alternate' }}
          />
        </div>

        {/* ═══════════════════════════════════════════
            LAYER 2 — Technical Grid
            Balanced 36px blueprint grid revealed around
            the cursor via a tight 180px radial mask.
            Clean, readable technical layout.
            ═══════════════════════════════════════════ */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(249,250,251,0.02) 1px, transparent 1px), ' +
              'linear-gradient(to bottom, rgba(249,250,251,0.02) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            // Hardware-accelerated: CSS custom properties avoid React re-renders
            '--x': `${mousePos.x}px`,
            '--y': `${mousePos.y}px`,
            maskImage: 'radial-gradient(180px circle at var(--x) var(--y), rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.05) 80%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(180px circle at var(--x) var(--y), rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.05) 80%, transparent 100%)',
          }}
        />

        {/* ═══════════════════════════════════════════
            LAYER 3 — Instant Cursor Torch
            A focused 180px pocket of warm light that
            tracks the cursor with zero perceived delay.
            No CSS transitions — driven by CSS custom
            properties for GPU-composited instant updates.
            ═══════════════════════════════════════════ */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            '--x': `${mousePos.x}px`,
            '--y': `${mousePos.y}px`,
            background: 'radial-gradient(180px circle at var(--x) var(--y), rgba(255,255,255,0.08), transparent 80%)',
          }}
        />

        {/* ═══════════════════════════════════════════
            LAYER 4 — Ultra-Slow Fluid Gradient Drift
            A subtle 40s ambient gradient pan that creates
            organic, imperceptible light shifts — like
            clouds passing over the sun. Zero flicker,
            purely hardware-accelerated background-position
            animation on a composite layer.
            ═══════════════════════════════════════════ */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(250,250,250,0.015) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 70% 80%, rgba(200,200,210,0.012) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
            animation: 'ambient-drift 40s ease-in-out infinite alternate',
          }}
        />

        {/* ═══════════════════════════════════════════
            LAYER 5 — Cinematic Film Grain (SVG Noise)
            Fixed overlay that eliminates digital color
            banding and gives the dark background physical
            texture — like a 35mm print. Static opacity,
            perfectly stable.
            ═══════════════════════════════════════════ */}
        <svg
          className="fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay pointer-events-none"
          aria-hidden="true"
        >
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        {/* Foreground container — responsive, centered */}
        <div className="relative z-10 w-full max-w-4xl mx-auto p-6 md:p-12 min-h-screen">
          <AnimatedRoutes />
        </div>

        {/* Bottom navigation — always on top */}
        <BottomNav />
      </main>
    </BrowserRouter>
  )
}

export default App
