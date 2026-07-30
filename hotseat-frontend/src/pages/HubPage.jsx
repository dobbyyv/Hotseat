import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Hash, LogOut, ChevronRight, AlertCircle, X, Sparkles, PenLine, Globe, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'
import useSFX from '../useSFX'

const stagger = { animate: { transition: { staggerChildren: 0.07 } } }
const cardSpring = { type: "spring", stiffness: 300, damping: 25 }

export default function HubPage() {
  const { user, userGroups, group: lastActiveGroup, fetchUserGroups, setActiveGroup, logout, lang, setLang, joinAdditionalGroup, createAdditionalGroup, isLoading, error: storeError } = useStore()
  const navigate = useNavigate()
  const playSFX = useSFX()

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [joinTab, setJoinTab] = useState('join')
  const [joinCode, setJoinCode] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [uiError, setUiError] = useState('')

  const dict = {
    welcome:        lang === 'it' ? 'Bentornato' : 'Welcome Back',
    yourGroups:     lang === 'it' ? 'I Tuoi Gruppi' : 'Your Groups',
    lastActive:     lang === 'it' ? 'Ultimo Attivo' : 'Last Active',
    joinCreate:     lang === 'it' ? 'Unisciti o Crea' : 'Join or Create',
    logoutConfirmTitle: lang === 'it' ? 'Uscire?' : 'Log Out?',
    logoutConfirmDesc:  lang === 'it' ? 'Dovrai reinserire nome e password per tornare.' : 'You will need your exact name and password to get back in.',
    cancel:         lang === 'it' ? 'Annulla' : 'Cancel',
    logout:         lang === 'it' ? 'Esci' : 'Log Out',
    joinTab:        lang === 'it' ? 'Unisciti' : 'Join',
    createTab:      lang === 'it' ? 'Crea' : 'Create',
    enterCode:      lang === 'it' ? 'Codice a 6 cifre' : 'Enter 6-digit code',
    groupName:      lang === 'it' ? 'Nome del gruppo' : 'Group Name',
    joinBtn:        lang === 'it' ? 'Entra' : 'Join Group',
    createBtn:      lang === 'it' ? 'Crea Nuovo' : 'Create Group',
    serverError:    lang === 'it' ? 'Errore del server.' : 'Server route failed.',
    members:        lang === 'it' ? 'membri' : 'members',
    answered:       lang === 'it' ? 'hanno risposto oggi' : 'answered today',
  }

  useEffect(() => {
    setUiError(storeError ? (storeError.includes('<') || storeError.includes('JSON') ? dict.serverError : storeError) : '')
  }, [storeError, dict.serverError])

  useEffect(() => { playSFX('woosh'); if (user) fetchUserGroups() }, [user, fetchUserGroups, playSFX])

  const handleEnterGroup = (g) => { setActiveGroup(g); navigate('/home') }

  const handleJoinSubmit = async () => {
    if (!joinCode.trim() || joinCode.length < 4) return
    playSFX('thock'); setUiError('')
    const newGroup = await joinAdditionalGroup(joinCode.trim())
    if (newGroup) { playSFX('success'); setShowJoinModal(false); setJoinCode(''); setActiveGroup(newGroup); navigate('/home') }
  }

  const handleCreateNew = async () => {
    const finalName = newGroupName.trim() || `${user.name}'s Group`
    playSFX('thock'); setUiError('')
    const newGroup = await createAdditionalGroup(finalName)
    if (newGroup) { playSFX('success'); setShowJoinModal(false); setNewGroupName(''); setActiveGroup(newGroup); navigate('/home') }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0">
            {user?.avatar_url ? <img src={`${import.meta.env.VITE_SERVER_URL}${user.avatar_url}`} className="w-full h-full object-cover" alt="pfp" /> : <span className="text-white">{user?.avatar_text}</span>}
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-mono font-bold tracking-widest uppercase mb-0.5">{dict.welcome}</p>
            <h1 className="text-3xl font-display font-bold tracking-tight leading-none text-white">{user?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={() => { playSFX('click'); setLang(lang === 'en' ? 'it' : 'en') }} className="flex items-center gap-1.5 bg-zinc-800/80 border border-white/10 rounded-xl px-3 py-3 hover:bg-zinc-700/80 transition-colors text-zinc-400">
            <span className="text-sm font-bold">{lang === 'en' ? '🇺🇸' : '🇮🇹'}</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={() => { playSFX('click'); setShowLogoutModal(true) }} className="p-3 bg-zinc-800/80 border border-white/10 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all">
            <LogOut size={20} />
          </motion.button>
        </div>
      </div>

      {/* GROUPS */}
      <div className="space-y-4">
        <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-widest pl-2">{dict.yourGroups}</h2>

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {Array.isArray(userGroups) && userGroups.map((g) => {
            const isLastActive = lastActiveGroup?.id === g.id
            return (
              <motion.div
                key={g.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={cardSpring}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleEnterGroup(g)}
                className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all border ${
                  isLastActive
                    ? 'bg-zinc-800/80 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]'
                    : 'bg-zinc-900/40 border-white/10 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
                }`}
              >
                {isLastActive && (
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-white/10 to-transparent text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">
                    {dict.lastActive}
                  </div>
                )}
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-2xl font-display font-bold pr-16 ${isLastActive ? 'text-white' : 'text-zinc-200'}`}>{g.name || 'Unnamed Group'}</h3>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isLastActive ? 'bg-white text-black' : 'bg-white/10 text-zinc-400 group-hover:text-white'}`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-wide font-mono text-zinc-500">
                  <span className="flex items-center gap-1.5"><Users size={14} /> {g.member_count} {dict.members}</span>
                  {g.todays_answers > 0 && <span className="flex items-center gap-1.5 text-orange-400"><Sparkles size={14} /> {g.todays_answers} {dict.answered}</span>}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => { playSFX('woosh'); setShowJoinModal(true) }} className="w-full mt-4 border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex items-center justify-center gap-3 text-zinc-500 hover:text-white hover:border-white/20 hover:bg-zinc-800/30 transition-all">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300"><Plus size={18} strokeWidth={3} /></div>
          <span className="font-bold tracking-wide">{dict.joinCreate}</span>
        </motion.button>
      </div>

      {/* Join / Create Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { playSFX('woosh'); setShowJoinModal(false) }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, y: 100, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm bg-[#111118] border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              <button onClick={() => { playSFX('woosh'); setShowJoinModal(false) }} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white transition-all"><X size={16} /></button>
              <h3 className="text-2xl font-display font-bold mb-6 text-white">{dict.joinCreate}</h3>
              <div className="flex p-1 bg-zinc-900 border border-white/10 rounded-2xl mb-6">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('click'); setJoinTab('join'); setUiError('') }} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${joinTab === 'join' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>{dict.joinTab}</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('click'); setJoinTab('create'); setUiError('') }} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${joinTab === 'create' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>{dict.createTab}</motion.button>
              </div>
              {uiError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-4 flex items-center gap-2 font-bold"><AlertCircle size={16} className="flex-shrink-0" /> {uiError}</div>}
              {joinTab === 'join' ? (
                <motion.div key="join" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="relative mb-4"><Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input type="text" placeholder={dict.enterCode} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()} className="w-full bg-zinc-900 border border-white/10 focus:border-white/30 rounded-2xl py-4 pl-14 pr-5 text-white text-lg font-bold tracking-widest uppercase font-mono outline-none transition-colors" maxLength={8} />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={isLoading || joinCode.length < 4} onClick={handleJoinSubmit} className="w-full bg-white text-black font-semibold py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]">{isLoading ? <Loader2 size={18} className="animate-spin" /> : dict.joinBtn}</motion.button>
                </motion.div>
              ) : (
                <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="relative mb-4"><PenLine className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input type="text" placeholder={`${user.name}'s Group`} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()} className="w-full bg-zinc-900 border border-white/10 focus:border-white/30 rounded-2xl py-4 pl-14 pr-5 text-white text-base font-bold outline-none transition-colors" maxLength={30} />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={isLoading} onClick={handleCreateNew} className="w-full bg-white text-black font-semibold py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]">{isLoading ? <Loader2 size={18} className="animate-spin" /> : dict.createBtn}</motion.button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-xs bg-[#111118] border border-white/10 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4"><LogOut size={28} /></div>
              <h3 className="text-2xl font-display font-bold mb-2 text-white">{dict.logoutConfirmTitle}</h3>
              <p className="text-zinc-400 text-sm mb-8 font-medium">{dict.logoutConfirmDesc}</p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('woosh'); setShowLogoutModal(false) }} className="flex-1 py-3.5 rounded-2xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">{dict.cancel}</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('woosh'); setShowLogoutModal(false); logout(); navigate('/') }} className="flex-1 py-3.5 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-500 transition-all">{dict.logout}</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

