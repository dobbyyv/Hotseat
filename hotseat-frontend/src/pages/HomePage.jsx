import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Clock, ChevronRight, Share, Globe,
  Lightbulb, Send, X, CheckCircle, AlertCircle, Check
} from 'lucide-react'
import { io } from 'socket.io-client'
import useStore from '../store/useStore'
import { t } from '../translations'
import useSFX from '../useSFX'
import AnimatedNumber from '../components/AnimatedNumber'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

function CountdownTimer({ lang }) {
  const [time, setTime] = useState(() => {
    const now = new Date()
    const next = new Date()
    next.setHours(9, 0, 0, 0)
    if (now.getHours() >= 9) next.setDate(next.getDate() + 1)
    const diff = next - now
    return {
      hours: Math.max(0, Math.floor((diff / 3600000) % 24)),
      minutes: Math.max(0, Math.floor((diff / 60000) % 60)),
      seconds: Math.max(0, Math.floor((diff / 1000) % 60)),
    }
  })

  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const next = new Date()
      next.setHours(9, 0, 0, 0)
      if (now.getHours() >= 9) next.setDate(next.getDate() + 1)
      const diff = next - now
      setTime({
        hours: Math.max(0, Math.floor((diff / 3600000) % 24)),
        minutes: Math.max(0, Math.floor((diff / 60000) % 60)),
        seconds: Math.max(0, Math.floor((diff / 1000) % 60)),
      })
    }
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [])

  const timerDisplay = useMemo(() => (
    <span className="text-xs font-mono tracking-tight text-zinc-400">
      <Clock size={12} className="inline-block mr-1 align-[-1px] text-zinc-500" />
      <span className="text-zinc-500">{lang === 'en' ? 'Next in' : 'Prossima tra'}</span>{' '}
      <AnimatedNumber value={time.hours} padTo={2} className="text-zinc-200" />
      <span className="text-zinc-500 mx-0.5">:</span>
      <AnimatedNumber value={time.minutes} padTo={2} className="text-zinc-200" />
      <span className="text-zinc-500 mx-0.5">:</span>
      <AnimatedNumber value={time.seconds} padTo={2} className="text-zinc-200" />
    </span>
  ), [time.hours, time.minutes, time.seconds, lang])

  return timerDisplay
}

export default function HomePage() {
  const { user, group, streak, todayAnswered, currentQuestion, fetchTodayQuestion, lang, setLang, groupAnswers, fetchGroupAnswers } = useStore()
  const playSFX = useSFX()
  const navigate = useNavigate()
  const socketRef = useRef(null)

  const text = t[lang] || t['en'] || {}
  const suggestText = text.home || t['en']?.home || {}

  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [suggestionStatus, setSuggestionStatus] = useState('idle')
  const [suggestionError, setSuggestionError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { playSFX('woosh') }, [playSFX])
  useEffect(() => { if (!user?.id || !group?.id) { navigate('/'); return } fetchTodayQuestion() }, [user?.id, group?.id, navigate, fetchTodayQuestion])
  useEffect(() => { if (todayAnswered && currentQuestion?.id && group?.id) fetchGroupAnswers(group.id, currentQuestion.id) }, [todayAnswered, currentQuestion?.id, group?.id, fetchGroupAnswers])
  useEffect(() => { if (!group?.id) return; socketRef.current = io(SERVER_URL, { transports: ['websocket'] }); socketRef.current.emit('join_room', { groupId: String(group.id), userId: user.id }); socketRef.current.on('answer_submitted', () => { if (currentQuestion?.id) fetchGroupAnswers(group.id, currentQuestion.id) }); return () => socketRef.current?.disconnect() }, [group?.id, currentQuestion?.id, fetchGroupAnswers])

  const totalCount = group?.members?.length || 1
  const answeredCount = groupAnswers?.length || (todayAnswered ? 1 : 0)
  const allAnswered = answeredCount >= totalCount
  const answeredUserIds = new Set(groupAnswers?.map(a => a.user_id) || [])
  const maxAvatars = 5
  const visibleMembers = group?.members?.slice(0, maxAvatars) || []
  const extraMembersCount = Math.max(0, totalCount - maxAvatars)

  const inviteUrl = `https://hotseat.site?join=${group?.code || ''}`
  const handleShare = async () => {
    playSFX('click')
    const shareData = { title: 'Hotseat', text: `Join my Hotseat group! Code: ${group?.code}`, url: inviteUrl }
    if (navigator.share) { try { await navigator.share(shareData) } catch { fallbackCopy() } } else fallbackCopy()
  }
  const fallbackCopy = () => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const handleSuggest = async () => {
    if (suggestionText.trim().length < 5) return
    setSuggestionStatus('loading'); setSuggestionError('')
    try {
      const res = await fetch(`${SERVER_URL}/api/suggest-question`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_name: user.name, question_text: suggestionText.trim() }) })
      const data = await res.json()
      if (res.ok && data.success) { playSFX('success'); setSuggestionStatus('success'); setTimeout(() => { setIsSuggesting(false); setSuggestionText(''); setSuggestionStatus('idle'); setSuggestionError('') }, 2200) }
      else if (res.status === 429) { setSuggestionError(data.error || 'Too many ideas! Try again in an hour.'); setSuggestionStatus('error') }
      else { setSuggestionError(data.error || 'Failed to save. Try again.'); setSuggestionStatus('error') }
    } catch { setSuggestionError('Network error. Check your connection.'); setSuggestionStatus('error') }
  }
  const closeSuggestionModal = () => { playSFX('woosh'); setIsSuggesting(false); setSuggestionText(''); setSuggestionStatus('idle'); setSuggestionError('') }
  const toggleLanguage = () => { playSFX('click'); setLang(lang === 'en' ? 'it' : 'en') }

  if (!currentQuestion || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
          <p className="text-zinc-500 text-xs font-display tracking-widest uppercase">{text.loading || 'Loading...'}</p>
        </div>
      </div>
    )
  }

  const activeQuestionText = currentQuestion[`text_${lang}`] || currentQuestion.text

  return (
    <div className="h-full flex flex-col">

      {/* Header — compact top bar with inline countdown timer */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">{text.todaysDrop}</p>
          <h2 className="text-zinc-200 font-bold text-lg leading-tight mb-1.5">{group?.name}</h2>
          <CountdownTimer lang={lang} />
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={toggleLanguage} className="flex items-center gap-1.5 bg-zinc-800/80 border border-white/10 rounded-full px-3 py-1.5 hover:bg-zinc-700/80 transition-colors text-zinc-400">
            <Globe size={13} /><span>{lang === 'en' ? '🇺🇸' : '🇮🇹'}</span>
          </motion.button>
          <motion.div whileTap={{ scale: 0.92 }} className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-2">
            <Flame size={15} className="text-orange-400" />
            <span className="text-orange-400 font-bold text-sm font-display">{streak}</span>
          </motion.div>
        </div>
      </div>

      {/* Main content — distributed to fit a single viewport */}
      <div className="flex-1 min-h-0 flex flex-col justify-between pb-24">

        {/* Upper group: question card + primary CTA */}
        <div className="flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-zinc-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(255,255,255,0.12)] hover:border-white/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                {currentQuestion.category || 'Scenario'}
              </span>
              {answeredCount > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium animate-breath">
                    <AnimatedNumber value={answeredCount} /> IN
                  </span>
                </motion.div>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100 leading-snug mb-6 relative z-10">
              {activeQuestionText}
            </p>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex -space-x-2">
                {visibleMembers.map((m) => {
                  const isMe = m.id === user.id
                  const hasAnswered = todayAnswered && answeredUserIds.has(m.id)
                  return (
                    <div key={m.id} className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-300 relative ${isMe ? 'p-[1px] bg-gradient-to-b from-white/30 to-white/5 z-10' : hasAnswered ? 'bg-emerald-600 text-white' : 'bg-zinc-800 border-2 border-white/20 text-zinc-400'}`} title={m.name}>
                      <div className={`w-full h-full rounded-full flex items-center justify-center text-sm font-mono font-medium ${isMe ? 'bg-zinc-900' : ''}`}>
                      {m.avatar_url ? <img src={`${SERVER_URL}${m.avatar_url}`} alt="pfp" className="w-full h-full object-cover rounded-full" /> : m.avatar_text}
                      </div>
                      {todayAnswered && hasAnswered && !isMe && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={8} className="text-black" strokeWidth={4} /></span>}
                    </div>
                  )
                })}
                {extraMembersCount > 0 && <div className="w-10 h-10 rounded-full border-2 border-zinc-800 bg-zinc-800/50 text-zinc-500 flex items-center justify-center text-xs font-mono font-bold">+{extraMembersCount}</div>}
              </div>
              <motion.span key={answeredCount} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={`text-sm font-bold ${allAnswered ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {answeredCount}/{totalCount} {text.answered}{allAnswered && ' 🎉'}
              </motion.span>
            </div>
          </motion.div>

          {/* Primary CTA */}
          {!todayAnswered ? (
            <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} onClick={() => { playSFX('woosh'); navigate('/answer') }} className="w-full py-4 rounded-2xl bg-white/90 text-zinc-950 font-semibold text-base shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.18)] transition-all duration-200 flex items-center justify-center gap-2">
              {text.dropAnswer} <ChevronRight size={22} />
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} onClick={() => { playSFX('woosh'); navigate('/results') }} className="w-full py-4 rounded-2xl bg-zinc-800/80 border border-white/10 text-zinc-200 font-semibold text-base hover:bg-zinc-700/80 hover:border-white/20 transition-all duration-200 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2">
              {text.seeOthers} <ChevronRight size={22} className="text-zinc-400" />
            </motion.button>
          )}
        </div>

        {/* Lower group: invite code + suggest question */}
        <div className="flex flex-col items-center gap-3">
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={handleShare} className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors py-1">
            {copied ? <Check size={13} className="text-emerald-500" /> : <Share size={13} />}
            <span className="text-xs font-mono tracking-widest">{copied ? (text.inviteCopied || 'Invite link copied!') : `${text.inviteCode}: ${group?.code}`}</span>
          </motion.button>

          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => { playSFX('click'); setIsSuggesting(true) }} className="flex items-center gap-2 bg-zinc-900/40 border border-white/10 hover:border-white/20 hover:bg-zinc-800/50 text-zinc-300 text-sm py-2.5 px-5 rounded-xl font-medium transition-all">
            <Lightbulb size={15} /> {suggestText.suggestBtn}
          </motion.button>
        </div>
      </div>

      {/* Suggest Modal */}
      <AnimatePresence>
        {isSuggesting && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-5 pb-5 sm:pb-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSuggestionModal} className="absolute inset-0 bg-black/85" />
            <motion.div initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-sm bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              <button onClick={closeSuggestionModal} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all"><X size={18} /></button>
              <AnimatePresence mode="wait">
                {suggestionStatus === 'success' ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4"><CheckCircle size={32} className="text-emerald-400" /></div>
                    <h3 className="text-xl font-display font-bold text-white mb-1">{suggestText.success}</h3>
                    <p className="text-zinc-400 text-sm font-medium">We'll review your suggestion soon.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-zinc-300 mb-4"><Lightbulb size={22} /></div>
                    <h3 className="text-xl font-display font-bold text-white mb-1">{suggestText.suggestTitle}</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed mb-5 font-medium">{suggestText.suggestDesc}</p>
                    <textarea value={suggestionText} onChange={(e) => { setSuggestionText(e.target.value); if (suggestionStatus === 'error') setSuggestionStatus('idle') }} placeholder={suggestText.placeholder} className="w-full h-28 bg-zinc-800/60 border border-white/10 focus:border-white/30 rounded-2xl p-4 text-white text-sm outline-none transition-all resize-none mb-3 select-text" />
                    <div className="flex justify-end mb-3"><span className={`text-xs font-mono font-bold ${suggestionText.length > 200 ? 'text-amber-400' : 'text-zinc-600'}`}>{suggestionText.length}/300</span></div>
                    <AnimatePresence>
                      {suggestionStatus === 'error' && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                          <AlertCircle size={14} className="text-red-400 flex-shrink-0" /><span className="text-red-400 text-xs font-bold">{suggestionError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSuggest} disabled={suggestionStatus === 'loading' || suggestionText.trim().length < 5} className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                      {suggestionStatus === 'loading' ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> {suggestText.submit}</>}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}