import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogOut, Camera, Loader2, Key, Edit2, Check, X, Settings, CheckCircle, ShieldAlert, ShieldCheck } from 'lucide-react'
import useStore from '../store/useStore'
import useSFX from '../useSFX'
import useTypingEffect from '../hooks/useTypingEffect'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

export default function ProfilePage() {
  const { user, group, leaveGroup, logout, uploadPfp, updateGroupName, isLoading, lang } = useStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const playSFX = useSFX()

  const dict = {
    title: lang === 'it' ? 'Profilo' : 'Profile',
    accountRecovery: lang === 'it' ? 'Recupero Account' : 'Account Recovery',
    setPassword: lang === 'it' ? 'Imposta Password' : 'Set Password',
    cancel: lang === 'it' ? 'Annulla' : 'Cancel',
    recoveryDesc: lang === 'it' ? 'Imposta una password per recuperare il tuo account se cambi dispositivo.' : 'Set a password to recover your account if you clear your browser data or switch devices.',
    enterPin: lang === 'it' ? 'Inserisci una password (min 4 caratteri)' : 'Enter a password (min 4 chars)',
    savePassword: lang === 'it' ? 'Salva Password' : 'Save Password',
    accountSecured: lang === 'it' ? 'Account Protetto' : 'Account Secured',
    securedDesc: lang === 'it' ? 'Puoi accedere da qualsiasi dispositivo con il tuo nome e password.' : 'You can log back in from any device using your exact name and password.',
    groupSettings: lang === 'it' ? 'Impostazioni Gruppo Attivo' : 'Active Room Settings',
    code: lang === 'it' ? 'CODICE' : 'CODE',
    manageMembers: lang === 'it' ? 'Gestisci Membri' : 'Manage Members',
    leaveGroup: lang === 'it' ? 'Abbandona Gruppo' : 'Leave Group',
    logOut: lang === 'it' ? 'Esci dall\'App' : 'Log Out of App',
    networkError: lang === 'it' ? 'Errore di rete.' : 'Network error.',
  }

  const [passwordInput, setPasswordInput] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isSecured, setIsSecured] = useState(user?.hasPassword || false)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group?.name || '')
  const [isSavingName, setIsSavingName] = useState(false)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => { if (!user) navigate('/') }, [user, navigate])
  useEffect(() => { if (group) setEditName(group.name) }, [group])

  const { displayed: typedGroupName, isTyping: groupNameTyping } = useTypingEffect(group?.name || '', 50)

  if (!user) return null

  const handleSetPassword = async () => {
    if (passwordInput.length < 4) { playSFX('error'); setPasswordMessage(dict.enterPin); return }
    try {
      const res = await fetch(`${SERVER_URL}/api/set-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, password: passwordInput }) })
      const data = await res.json()
      if (data.success) { useStore.setState((state) => ({ user: { ...state.user, hasPassword: true } })); playSFX('success'); setIsSecured(true); setPasswordMessage('') }
      else { playSFX('error'); setPasswordMessage(data.error || "Failed to set password.") }
    } catch { playSFX('error'); setPasswordMessage(dict.networkError) }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) { playSFX('error'); alert('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { playSFX('error'); alert('This image is too heavy! Please pick one under 5MB.'); return }
    playSFX('thock'); const success = await uploadPfp(file)
    if (success) playSFX('success'); else { playSFX('error'); alert('Upload failed.') }
    e.target.value = null
  }

  const handleSaveName = async () => {
    if (editName.trim() === '' || editName === group?.name) { playSFX('woosh'); setIsEditing(false); return }
    setIsSavingName(true); playSFX('thock')
    const success = await updateGroupName(editName.trim())
    if (success) playSFX('success'); setIsSavingName(false); setIsEditing(false)
  }

  const handleLeaveGroup = async () => { playSFX('thock'); await leaveGroup() }
  const handleLogout = () => { playSFX('woosh'); logout(); navigate('/') }

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold font-display tracking-tight">{dict.title}</h1>
      </div>

      {/* Avatar & Username */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center w-full mb-8">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { playSFX('click'); fileInputRef.current?.click() }} className="relative group mb-4 rounded-full" disabled={isLoading}>
          <div className="w-28 h-28 rounded-full border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
            {isLoading ? <Loader2 className="animate-spin text-white" size={32} /> : user.avatar_url ? <img src={`${SERVER_URL}${user.avatar_url}`} alt="Profile" className="w-full h-full object-cover" /> : user.avatar_text}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/20 transition-all">
            <Camera size={14} />
          </div>
        </motion.button>
        <h2 className="text-white text-3xl font-bold font-display tracking-tight">{user.name}</h2>
      </motion.div>

      {/* Account Recovery */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="w-full mb-8">
        <AnimatePresence mode="wait">
          {isSecured ? (
            <motion.div key="secured" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center justify-between">
              <div className="pr-4"><h3 className="text-emerald-400 font-bold font-display text-lg flex items-center gap-2"><ShieldCheck size={18} /> {dict.accountSecured}</h3><p className="text-emerald-500/70 text-xs mt-1 font-medium">{dict.securedDesc}</p></div>
              <CheckCircle size={32} className="text-emerald-400 flex-shrink-0" />
            </motion.div>
          ) : (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-zinc-900/60 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-amber-400 font-bold font-display flex items-center gap-2 text-lg"><ShieldAlert size={18} /> {dict.accountRecovery}</h3>
                <button onClick={() => { playSFX('click'); setIsSettingPassword(!isSettingPassword) }} className="text-white text-xs font-bold uppercase bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors">{isSettingPassword ? dict.cancel : dict.setPassword}</button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed mb-4 font-medium">{dict.recoveryDesc}</p>
              <AnimatePresence>
                {isSettingPassword && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 mt-4 overflow-hidden">
                    <input type="password" placeholder={dict.enterPin} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoComplete="new-password" className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-white/30 transition-colors" />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => { playSFX('click'); handleSetPassword() }} className="w-full bg-amber-600 text-white font-semibold py-3.5 rounded-xl hover:bg-amber-500 transition-colors">{dict.savePassword}</motion.button>
                    {passwordMessage && <p className="text-xs text-center font-bold text-red-400 pb-2">{passwordMessage}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Group Settings */}
      <AnimatePresence>
        {group && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="w-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-4 font-bold">{dict.groupSettings}</p>
            <div className="flex items-center justify-between mb-5">
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="flex-1 bg-zinc-800/80 border border-white/20 rounded-xl px-4 py-2.5 text-white text-base font-bold outline-none focus:border-white/30" />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('click'); handleSaveName() }} disabled={isSavingName} className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200">{isSavingName ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('woosh'); setIsEditing(false) }} className="p-3 border border-white/10 text-zinc-400 rounded-xl hover:text-white bg-zinc-800/40"><X size={18} /></motion.button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold font-display text-2xl tracking-tight">{typedGroupName}{groupNameTyping && <span className="animate-pulse text-white">|</span>}</span>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { playSFX('click'); setIsEditing(true) }} className="text-zinc-500 hover:text-white transition-colors p-2 bg-zinc-800/50 rounded-full"><Edit2 size={14} /></motion.button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/60 border border-white/5 px-5 py-4 rounded-2xl mb-5">
              <Key size={16} className="text-zinc-400" />
              <span className="text-sm font-mono tracking-widest uppercase text-zinc-500">{dict.code}: <span className="text-white font-bold text-lg tracking-[0.2em]">{group?.code}</span></span>
            </div>
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => { playSFX('thock'); navigate('/manage-group') }} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"><Settings size={16} /> {dict.manageMembers}</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleLeaveGroup} className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"><LogOut size={16} /> {dict.leaveGroup}</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Button */}
      <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={() => { playSFX('click'); setShowLogoutConfirm(true) }} className="w-full bg-transparent border-2 border-dashed border-zinc-800 hover:border-red-500/30 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
        <LogOut size={18} /> {dict.logOut}
      </motion.button>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-xs bg-[#111118] border border-white/10 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4"><LogOut size={28} /></div>
              <h3 className="text-2xl font-display font-bold mb-2 text-white">{dict.title === 'Profilo' ? 'Uscire?' : 'Log Out?'}</h3>
              <p className="text-zinc-400 text-sm mb-8 font-medium">{dict.title === 'Profilo' ? 'Dovrai reinserire nome e password per tornare.' : 'You will need your exact name and password to get back in.'}</p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSFX('woosh'); setShowLogoutConfirm(false) }} className="flex-1 py-3.5 rounded-2xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">{dict.cancel}</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="flex-1 py-3.5 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-500 transition-all">{dict.logOut}</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}