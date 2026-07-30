import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  const { user, group: activeGroup } = useStore()
  
  const hasIdentity = !!user;
  const isFullyAuthenticated = hasIdentity && !!activeGroup;

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
      <main className="relative min-h-screen w-full bg-[#09090b] text-zinc-50 overflow-hidden font-sans selection:bg-white/20 selection:text-white">
        {/* High-tech fading grid background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(79,79,79,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(79,79,79,0.18) 1px, transparent 1px)',
            backgroundSize: '14px 24px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
          }}
        />

        {/* Foreground container — responsive, centered */}
        <div className="relative z-10 w-full max-w-4xl mx-auto p-6 md:p-12 min-h-screen">
          <Routes>
            <Route 
              path="/" 
              element={hasIdentity ? <Navigate to="/hub" /> : <JoinPage />} 
            />
            
            <Route 
              path="/hub" 
              element={hasIdentity ? <HubPage /> : <Navigate to="/" />} 
            />

            <Route path="/home" element={isFullyAuthenticated ? <HomePage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
            <Route path="/answer" element={isFullyAuthenticated ? <AnswerPage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
            <Route path="/results" element={isFullyAuthenticated ? <ResultsPage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
            <Route path="/profile" element={hasIdentity ? <ProfilePage /> : <Navigate to="/" />} />
            <Route path="/manage-group" element={isFullyAuthenticated ? <ManageGroup /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
            <Route path="/info" element={isFullyAuthenticated ? <InfoPage /> : <Navigate to={hasIdentity ? "/hub" : "/"} />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Bottom navigation — always on top */}
        <BottomNav />
      </main>
    </BrowserRouter>
  )
}

export default App