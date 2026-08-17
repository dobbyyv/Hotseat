import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Users, AlertCircle, Loader2, LogIn } from 'lucide-react'
import useStore from '../store/useStore'
import { t } from '../translations'
import useSFX from '../useSFX'
import useTypingEffect from '../hooks/useTypingEffect'
import LegalModal from '../components/LegalModal'

function ConsentText({ onOpenDoc }) {
  return (
    <p className="text-xs text-gray-400 text-center mt-2 mb-3 leading-relaxed">
      By continuing, you agree to Hotseat&apos;s{' '}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenDoc('terms') }}
        className="underline underline-offset-2 hover:text-gray-300"
      >
        Terms of Service
      </button>{' '}
      and{' '}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenDoc('privacy') }}
        className="underline underline-offset-2 hover:text-gray-300"
      >
        Privacy Policy
      </button>
      .
    </p>
  )
}

export default function JoinPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [code, setCode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('join') || params.get('code') || ''
  })
  // Frictionless deep-link: if code is present, show single-step name-only form
  const isDeepLink = !!code
  
  // Login modal state
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const { joinGroup, recoverAccount, isLoading, error, lang, setConsent } = useStore()
  const navigate = useNavigate()
  const playSFX = useSFX()

  const [legalDoc, setLegalDoc] = useState(null)
  const openLegal = (doc) => { playSFX('click'); setLegalDoc(doc) }

  useEffect(() => {
    playSFX('woosh')
  }, [playSFX])

  const text = t[lang]?.join || t['en']?.join || {}

  // Typing effect for main descriptive texts
  const tagline = "Your friend group, every single day."
  const { displayed: typedTagline, isTyping: taglineTyping } = useTypingEffect(tagline, 30)

  const step0Title = "What's your name?"
  const { displayed: typedStep0Title, isTyping: step0TitleTyping } = useTypingEffect(step0Title, 40, step === 0)
  const step0Desc = "This is how your friends will see you."
  const { displayed: typedStep0Desc, isTyping: step0DescTyping } = useTypingEffect(step0Desc, 30, step === 0)

  const step1Title = "Join your group"
  const { displayed: typedStep1Title, isTyping: step1TitleTyping } = useTypingEffect(step1Title, 40, step === 1)
  const step1Desc = "Enter the invite code, or start a new group."
  const { displayed: typedStep1Desc, isTyping: step1DescTyping } = useTypingEffect(step1Desc, 30, step === 1)

  // Keypress SFX handler
  const handleKeypressSFX = (e) => {
    if (e.key && e.key.length === 1) {
      playSFX('keypress')
    }
  }

  const handleName = async (e) => {
    e?.preventDefault()
    if (name.trim().length < 2) return
    setConsent()
    playSFX('click')
    if (isDeepLink) {
      // Frictionless: skip code entry, join directly with pre-filled code
      playSFX('thock')
      const success = await joinGroup(name.trim(), code.trim())
      if (success) {
        playSFX('success')
        navigate('/home')
      }
      return
    }
    setStep(1)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setConsent()
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
    setConsent()
    playSFX('thock')
    const success = await joinGroup(name.trim(), code.trim())
    if (success) {
      playSFX('success')
      navigate('/home') 
    }
  }

  const handleCreate = async () => {
    setConsent()
    playSFX('thock')
    const success = await joinGroup(name.trim())
    if (success) {
      playSFX('success')
      navigate('/home')
    }
  }

  return (
    <div className="min-h-full w-full flex items-center justify-center p-4">
      {/* Kinetic Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className="w-full rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md py-7 px-8 shadow-2xl hover:border-white/20 transition-colors max-w-sm"
      >
        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center mb-3 shadow-lg overflow-hidden">
            <img src="/logo.png?v=2" alt="Hotseat Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-2xl font-bold font-display tracking-tight">Hotseat</h1>
          <p className="text-zinc-400 text-sm font-medium mt-1">
            {typedTagline}{taglineTyping && <span className="animate-pulse text-white">|</span>}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Login form */}
          {isLoggingIn && (
            <motion.form 
              key="login"
              autoComplete="off"
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}
              onSubmit={handleLogin} 
            >
              <h3 className="text-lg font-display font-bold text-white tracking-tight mb-1">Welcome Back</h3>
              <p className="text-zinc-500 text-xs mb-4 font-medium">Enter your credentials to restore your account.</p>
              
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
                  className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white font-medium outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                />
                <input 
                  type="password" 
                  name="login-password"
                  placeholder="Your Password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white font-medium outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                />
              </div>

              {loginError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} /> {loginError}
                </div>
              )}
              
              <ConsentText onOpenDoc={openLegal} />

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> Log In</>}
              </button>
              
              <button 
                type="button"
                onClick={() => { playSFX('woosh'); setIsLoggingIn(false); setLoginError('') }}
                className="w-full mt-2 text-center text-zinc-500 text-xs font-semibold uppercase tracking-widest hover:text-white transition-colors py-2"
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
            >
              <h1 className="text-white text-xl font-bold font-display mb-1 tracking-tight">
                {typedStep0Title}{step0TitleTyping && <span className="animate-pulse text-white">|</span>}
              </h1>
              <p className="text-zinc-500 text-xs mb-4 font-medium">
                {typedStep0Desc}{step0DescTyping && <span className="animate-pulse text-white">|</span>}
              </p>
              
              <input
                type="text" 
                name="display-name"
                placeholder="Your name..." 
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeypressSFX}
                autoFocus
                autoComplete="off"
                inputMode="text"
                className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-4 py-3.5 text-white font-medium text-sm placeholder:text-zinc-600 outline-none focus:border-white/30 transition-colors mb-2"
              />
              
              <ConsentText onOpenDoc={openLegal} />

              <motion.button 
                type="submit"
                whileTap={{ scale: 0.98 }} 
                disabled={name.trim().length < 2}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </motion.button>

              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <p className="text-zinc-500 text-xs font-medium mb-2">Already have an account?</p>
                <button 
                  type="button"
                  onClick={() => { playSFX('click'); setIsLoggingIn(true) }}
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all text-sm flex justify-center items-center gap-2"
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
            >
              <button type="button" onClick={() => { playSFX('woosh'); setStep(0) }} className="mb-4 text-zinc-500 hover:text-white transition-colors">
                <ArrowRight className="rotate-180" size={20} />
              </button>

              <h1 className="text-white text-xl font-bold font-display mb-1 tracking-tight">
                {typedStep1Title}{step1TitleTyping && <span className="animate-pulse text-white">|</span>}
              </h1>
              <p className="text-zinc-500 text-xs mb-4 font-medium">
                {typedStep1Desc}{step1DescTyping && <span className="animate-pulse text-white">|</span>}
              </p>
      
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text" 
                  name="group-code"
                  placeholder="ENTER CODE" 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeypressSFX}
                  autoFocus 
                  maxLength={8}
                  autoComplete="off"
                  inputMode="text"
                  className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-5 py-4 text-white text-lg placeholder:text-zinc-600 outline-none focus:border-white/30 transition-colors tracking-widest font-mono text-center uppercase"
                />
                
                <ConsentText onOpenDoc={openLegal} />

                <motion.button 
                  type="submit"
                  whileTap={{ scale: 0.98 }} 
                  disabled={code.trim().length < 4 || isLoading}
                  className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> Join Group</>}
                </motion.button>
  
                <div className="flex items-center gap-3 my-4 opacity-40">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">OR</span>
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.98 }} 
                  onClick={handleCreate} 
                  disabled={isLoading}
                  className="w-full bg-transparent border border-white/20 hover:bg-white/5 disabled:opacity-30 text-white font-semibold py-3.5 rounded-xl transition-all"
                >
                  Create a new group
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      <LegalModal open={!!legalDoc} initialDoc={legalDoc || 'terms'} onClose={() => setLegalDoc(null)} />
    </div>
  )
}