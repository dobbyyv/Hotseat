import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Hash, LogOut, ChevronRight, AlertCircle, X, Sparkles, PenLine, Globe } from 'lucide-react'
import useStore from '../store/useStore'
import useSFX from '../useSFX'
export default function HubPage() {
  const { 
    user, 
    userGroups, 
    group: lastActiveGroup, 
    fetchUserGroups, 
    setActiveGroup, 
    logout, 
    lang, 
    setLang,
    joinAdditionalGroup, 
    createAdditionalGroup, 
    isLoading, 
    error: storeError 
  } = useStore()
  
  const navigate = useNavigate()
  const playSFX = useSFX()

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [joinTab, setJoinTab] = useState('join') 
  const [joinCode, setJoinCode] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [uiError, setUiError] = useState('')

  const dict = {
    welcome: lang === 'it' ? 'Bentornato' : 'Welcome Back',
    yourGroups: lang === 'it' ? 'I Tuoi Gruppi' : 'Your Groups',
    lastActive: lang === 'it' ? 'Ultimo Attivo' : 'Last Active',
    joinCreate: lang === 'it' ? 'Unisciti o Crea' : 'Join or Create',
    logoutConfirmTitle: lang === 'it' ? 'Uscire?' : 'Log Out?',
    logoutConfirmDesc: lang === 'it' ? 'Dovrai reinserire nome e password per tornare.' : 'You will need your exact name and password to get back in.',
    cancel: lang === 'it' ? 'Annulla' : 'Cancel',
    logout: lang === 'it' ? 'Esci' : 'Log Out',
    joinTab: lang === 'it' ? 'Unisciti' : 'Join',
    createTab: lang === 'it' ? 'Crea' : 'Create',
    enterCode: lang === 'it' ? 'Codice a 6 cifre' : 'Enter 6-digit code',
    groupName: lang === 'it' ? 'Nome del gruppo' : 'Group Name',
    joinBtn: lang === 'it' ? 'Entra' : 'Join Group',
    createBtn: lang === 'it' ? 'Crea Nuovo' : 'Create Group',
    serverError: lang === 'it' ? 'Errore del server. Hai riavviato il backend?' : 'Server route failed. Did you run pm2 restart?',
    members: lang === 'it' ? 'membri' : 'members',
    answered: lang === 'it' ? 'hanno risposto oggi' : 'answered today'
  }

  useEffect(() => {
    if (storeError) {
      if (storeError.includes('<') || storeError.includes('JSON')) {
        setUiError(dict.serverError)
      } else {
        setUiError(storeError)
      }
    } else {
      setUiError('')
    }
  }, [storeError, dict.serverError])

  useEffect(() => {
    playSFX('woosh')
    if (user) fetchUserGroups()
  }, [user, fetchUserGroups, playSFX])

  const handleEnterGroup = (g) => {
    setActiveGroup(g)
    navigate('/home')
  }

  const handleJoinSubmit = async () => {
    if (!joinCode.trim() || joinCode.length < 4) return
    playSFX('thock')
    setUiError('')
    
    const newGroup = await joinAdditionalGroup(joinCode.trim())
    if (newGroup) {
      playSFX('success')
      setShowJoinModal(false)
      setJoinCode('')
      setActiveGroup(newGroup)
      navigate('/home')
    }
  }

  const handleCreateNew = async () => {
    const finalName = newGroupName.trim() || `${user.name}'s Group`
    playSFX('thock')
    setUiError('')
    
    const newGroup = await createAdditionalGroup(finalName)
    if (newGroup) {
      playSFX('success')
      setShowJoinModal(false)
      setNewGroupName('')
      setActiveGroup(newGroup)
      navigate('/home')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#2e1065_0%,_#000000_80%)] opacity-70" />
        <motion.div
          animate={{ scale: [1, 1.05, 1], x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-[#3b0764]/20 rounded-full blur-[160px] transform-gpu"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] right-[-10%] w-[700px] h-[700px] bg-[#1e1b4b]/40 rounded-full blur-[180px] transform-gpu"
        />
      </div>

      <div className="relative z-10 px-5 pt-14 pb-32 h-full overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-black bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center font-bold text-xl overflow-hidden shadow-[0_0_15px_rgba(217,70,239,0.3)] flex-shrink-0">
              {user?.avatar_url ? (
                <img src={`${import.meta.env.VITE_SERVER_URL}${user.avatar_url}`} className="w-full h-full object-cover" alt="pfp" />
              ) : (
                <span className="text-white">{user?.avatar_text}</span>
              )}
            </div>
            
            <div>
              <p className="text-violet-400 text-xs font-mono font-bold tracking-widest uppercase mb-0.5 drop-shadow-md">
                {dict.welcome}
              </p>
              <h1 className="text-3xl font-display font-bold tracking-tight leading-none drop-shadow-md">{user?.name}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                playSFX('click')
                setLang(lang === 'en' ? 'it' : 'en')
              }}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-3 py-3 hover:bg-white/10 transition-colors shadow-md backdrop-blur-md"
            >
              <span className="text-sm font-bold leading-none text-gray-200">
                {lang === 'en' ? '🇺🇸' : '🇮🇹'}
              </span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playSFX('click')
                setShowLogoutModal(true)
              }} 
              className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all shadow-md backdrop-blur-md"
            >
              <LogOut size={20} />
            </motion.button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest pl-2 drop-shadow-md">
            {dict.yourGroups}
          </h2>

          {Array.isArray(userGroups) && userGroups.map((g) => {
            const isLastActive = lastActiveGroup?.id === g.id
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleEnterGroup(g)}
                className={`relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl border ${
                  isLastActive 
                    ? 'bg-violet-900/30 border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/10 hover:border-violet-500/30'
                }`}
              >
                {isLastActive && (
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-violet-500 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-xl shadow-md">
                    {dict.lastActive}
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-2xl font-display font-bold pr-16 ${isLastActive ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-gray-200'}`}>
                    {g.name || 'Unnamed Group'}
                  </h3>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isLastActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/10 text-gray-400 group-hover:text-white'}`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
                
                <div className="flex gap-4 text-xs font-bold uppercase tracking-wide font-mono text-gray-400">
                  <span className="flex items-center gap-1.5"><Users size={14} className="text-gray-500" /> {g.member_count} {dict.members}</span>
                  {g.todays_answers > 0 && (
                    <span className="flex items-center gap-1.5 text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                      <Sparkles size={14} /> {g.todays_answers} {dict.answered}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playSFX('woosh')
              setShowJoinModal(true)
            }}
            className="w-full mt-4 border-2 border-dashed border-white/20 rounded-3xl p-6 flex items-center justify-center gap-3 text-gray-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-900/10 transition-all backdrop-blur-sm"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300">
              <Plus size={18} strokeWidth={3} />
            </div>
            <span className="font-bold tracking-wide">{dict.joinCreate}</span>
          </motion.button>
        </div>
      </div>

      {/* Join / Create Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => {
                playSFX('woosh')
                setShowJoinModal(false)
              }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 40, scale: 0.95 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm bg-[#111118] border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={() => {
                  playSFX('woosh')
                  setShowJoinModal(false)
                }} 
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                <X size={16} />
              </button>

              <h3 className="text-2xl font-display font-bold mb-6 text-white">{dict.joinCreate}</h3>
              
              <div className="flex p-1 bg-black/50 border border-white/10 rounded-2xl mb-6">
                <button 
                  onClick={() => { playSFX('click'); setJoinTab('join'); setUiError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${joinTab === 'join' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {dict.joinTab}
                </button>
                <button 
                  onClick={() => { playSFX('click'); setJoinTab('create'); setUiError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${joinTab === 'create' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {dict.createTab}
                </button>
              </div>
              
              {uiError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-4 flex items-center gap-2 font-bold">
                  <AlertCircle size={16} className="flex-shrink-0" /> {uiError}
                </div>
              )}

              {joinTab === 'join' ? (
                <motion.div key="join" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="relative mb-4">
                    <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-violet-400" size={20} />
                    <input
                      type="text"
                      placeholder={dict.enterCode}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
                      className="w-full bg-black/50 border border-white/10 focus:border-violet-500 rounded-2xl py-4 pl-14 pr-5 text-white text-lg font-bold tracking-widest uppercase font-mono outline-none transition-colors shadow-inner"
                      maxLength={8}
                    />
                  </div>
                  <button disabled={isLoading || joinCode.length < 4} onClick={handleJoinSubmit} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : dict.joinBtn}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="relative mb-4">
                    <PenLine className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder={`${user.name}'s Group`}
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                      className="w-full bg-black/50 border border-white/10 focus:border-white/40 rounded-2xl py-4 pl-14 pr-5 text-white text-base font-bold outline-none transition-colors shadow-inner"
                      maxLength={30}
                    />
                  </div>
                  <button disabled={isLoading} onClick={handleCreateNew} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : dict.createBtn}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
              className="relative w-full max-w-xs bg-[#111118] border border-white/10 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                <LogOut size={28} />
              </div>
              <h3 className="text-2xl font-display font-bold mb-2 text-white">{dict.logoutConfirmTitle}</h3>
              <p className="text-gray-400 text-sm mb-8 font-medium">
                {dict.logoutConfirmDesc}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => { playSFX('woosh'); setShowLogoutModal(false) }} 
                  className="flex-1 py-3.5 rounded-2xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  {dict.cancel}
                </button>
                <button 
                  onClick={() => {
                    playSFX('woosh')
                    setShowLogoutModal(false)
                    logout()
                    navigate('/')
                  }} 
                  className="flex-1 py-3.5 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  {dict.logout}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}