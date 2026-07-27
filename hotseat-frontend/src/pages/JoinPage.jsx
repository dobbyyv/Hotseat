import { useState, useEffect, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, Users, AlertCircle, Loader2, LogIn } from 'lucide-react'
import useStore from '../store/useStore'
import { t } from '../translations'
import useSFX from '../useSFX'

// Memoized to avoid expensive re-renders during user input.
const AmbientBackground = memo(() => (
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
))

export default function JoinPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  // Read invite code from query parameter if available.
  const [code, setCode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('code') || ''
  })
  
  // Login modal state
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const { joinGroup, recoverAccount, isLoading, error, lang } = useStore()
  const navigate = useNavigate()
  const playSFX = useSFX()

  useEffect(() => {
    playSFX('woosh')
  }, [playSFX])

  const text = t[lang]?.join || t['en']?.join || {}

  const handleName = (e) => {
    e?.preventDefault()
    if (name.trim().length < 2) return
    playSFX('click')
    setStep(1)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginName || !loginPassword) {
      playSFX('error')
      setLoginError("Please enter your exact name and password.")
      return
    }

    playSFX('thock')
    const success = await recoverAccount(loginName.trim(), loginPassword)
    
    if (success) {
      playSFX('success')
      navigate('/hub')
    } else {
      playSFX('error')
      setLoginError(useStore.getState().error || "Incorrect name or password.")
    }
  }

  const handleJoin = async (e) => {
    e?.preventDefault()
    if (code.trim().length < 4) return
    playSFX('thock')
    const success = await joinGroup(name.trim(), code.trim())
    if (success) {
      playSFX('success')
      navigate('/home') 
    }
  }

  const handleCreate = async () => {
    playSFX('thock')
    const success = await joinGroup(name.trim())
    if (success) {
      playSFX('success')
      navigate('/home')
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative overflow-hidden text-white font-sans">
      
      <AmbientBackground />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-white/10 bg-black">
              <img src="/logo.png?v=2" alt="Hotseat Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-white text-3xl font-bold font-display tracking-tight drop-shadow-md">Hotseat</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Your friend group, every single day.</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* login form */}
          {isLoggingIn && (
            <motion.form 
              key="login"
              autoComplete="off"
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}
              onSubmit={handleLogin} 
              className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            >
              <h3 className="text-2xl font-display font-bold text-white tracking-tight mb-2">Welcome Back</h3>
              <p className="text-gray-400 text-xs mb-6 font-medium">Enter your credentials to restore your account.</p>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  name="login-name"
                  placeholder="Your exact Name" 
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  inputMode="text"
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-violet-500 transition-colors shadow-inner"
                />
                <input 
                  type="password" 
                  name="login-password"
                  placeholder="Your Password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-violet-500 transition-colors shadow-inner"
                />
              </div>

              {loginError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} /> {loginError}
                </div>
              )}
              
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-gray-200 active:scale-95 transition-all mt-6 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> Log In</>}
              </button>
              
              <button 
                type="button"
                onClick={() => { playSFX('woosh'); setIsLoggingIn(false); setLoginError('') }}
                className="w-full mt-4 text-center text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors py-2"
              >
                Cancel
              </button>
            </motion.form>
          )}

          {/* step 0 — name input */}
          {step === 0 && !isLoggingIn && (
            <motion.form 
              key="name" 
              autoComplete="off"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}
              onSubmit={handleName}
              className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            >
              <h1 className="text-white text-2xl font-bold font-display mb-2 tracking-tight">What's your name?</h1>
              <p className="text-gray-400 text-xs mb-6 font-medium">This is how your friends will see you.</p>
              
              <input
                type="text" 
                name="display-name"
                placeholder="Your name..." 
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
                inputMode="text"
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-sm placeholder:text-gray-600 outline-none focus:border-violet-500 transition-colors mb-5 shadow-inner"
              />
              
              <motion.button 
                type="submit"
                whileTap={{ scale: 0.97 }} 
                disabled={name.trim().length < 2}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-display shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-500/30"
              >
                Continue <ArrowRight size={18} />
              </motion.button>

              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-gray-400 text-xs font-medium mb-3">Already have an account?</p>
                <button 
                  type="button"
                  onClick={() => { playSFX('click'); setIsLoggingIn(true) }}
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all text-sm flex justify-center items-center gap-2 shadow-md"
                >
                  <LogIn size={16} /> Log in with Password
                </button>
              </div>
            </motion.form>
          )}

          {/* step 1 — join or create */}
          {step === 1 && !isLoggingIn && (
            <motion.form 
              key="group" 
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}
              onSubmit={handleJoin}
              className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            >
              <button type="button" onClick={() => { playSFX('woosh'); setStep(0) }} className="mb-4 text-gray-500 hover:text-white transition-colors">
                <ArrowRight className="rotate-180" size={20} />
              </button>

              <h1 className="text-white text-2xl font-bold font-display mb-2 tracking-tight">Join your group</h1>
              <p className="text-gray-400 text-xs mb-6 font-medium">Enter the invite code, or start a new group.</p>
      
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="w-full space-y-4">
                <input
                  type="text" 
                  name="group-code"
                  placeholder="ENTER CODE" 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoFocus 
                  maxLength={8}
                  autoComplete="off"
                  inputMode="text"
                  className={`w-full bg-black/60 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-violet-500'} rounded-2xl px-5 py-4 text-white text-xl placeholder:text-gray-600 outline-none transition-colors tracking-widest font-mono text-center uppercase shadow-inner`}
                />
                
                <motion.button 
                  type="submit"
                  whileTap={{ scale: 0.97 }} 
                  disabled={code.trim().length < 4 || isLoading}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-display shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> Join Group</>}
                </motion.button>
  
                <div className="flex items-center gap-3 my-4 opacity-50">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white">OR</span>
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.97 }} 
                  onClick={handleCreate} 
                  disabled={isLoading}
                  className="w-full bg-transparent border border-white/20 hover:bg-white/5 disabled:opacity-30 text-white font-bold py-4 rounded-2xl transition-all font-display shadow-md"
                >
                  Create a new group
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}