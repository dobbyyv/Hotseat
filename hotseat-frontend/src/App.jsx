import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { io } from 'socket.io-client'

import BottomNav from './components/BottomNav'
import OrbField from './components/OrbField'

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
        className="h-full"
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

  const spotlightRef = useRef(null)

  useEffect(() => {
    const el = spotlightRef.current
    if (!el) return

    const onMove = (e) => {
      el.style.setProperty('--mouse-x', `${e.clientX}px`)
      el.style.setProperty('--mouse-y', `${e.clientY}px`)
    }

    el.style.setProperty('--mouse-x', '50%')
    el.style.setProperty('--mouse-y', '50%')
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

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
        className="relative h-screen w-full bg-[#050508] text-zinc-50 overflow-hidden font-sans select-none"
        style={{
          '--mouse-x': '50%',
          '--mouse-y': '50%',
        }}
      >
        {/* Ambient depth orbs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-zinc-800/12 blur-[160px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-slate-900/18 blur-[160px] pointer-events-none" />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-zinc-700/08 blur-[140px] pointer-events-none" />
        </div>

        {/* Interactive physics orbs */}
        <OrbField />

        {/* Spotlight grid — static background, CSS variable‑driven radial mask */}
        <div
          ref={spotlightRef}
          className="fixed inset-0 z-[5] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(249,250,251,0.04) 1px, transparent 1px), ' +
              'linear-gradient(to bottom, rgba(249,250,251,0.04) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            maskImage: 'radial-gradient(120px circle at var(--mouse-x) var(--mouse-y), rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(120px circle at var(--mouse-x) var(--mouse-y), rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
          }}
        />

        {/* Cursor torch — soft ambient glow via blur filter */}
        <div className="fixed inset-0 z-[5] pointer-events-none" style={{ filter: 'blur(50px)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(140px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.09), transparent 80%)',
            }}
          />
        </div>

        {/* Film grain */}
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
        <div className="relative z-10 w-full max-w-4xl mx-auto p-6 md:p-12 h-full">
          <AnimatedRoutes />
        </div>

        {/* Bottom navigation — always on top */}
        <BottomNav />
      </main>
    </BrowserRouter>
  )
}

export default App