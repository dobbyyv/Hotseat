import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'

import SpatialCanvas from './components/SpatialCanvas'
import SpatialContainer from './components/SpatialContainer'
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
      <SpatialCanvas />
      <SpatialContainer>
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
      </SpatialContainer>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App