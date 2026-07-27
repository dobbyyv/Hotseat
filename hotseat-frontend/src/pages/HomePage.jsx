import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Clock, ChevronRight, Share, Globe,
  Lightbulb, Send, X, CheckCircle, AlertCircle, Check
} from 'lucide-react'
import { io } from 'socket.io-client'
import useStore from '../store/useStore'
import BottomNav from '../components/BottomNav'
import { t } from '../translations'
import useSFX from '../useSFX' 

const SERVER_URL = import.meta.env.VITE_SERVER_URL

// Isolated component to prevent parent re-renders from resetting the timer.
function CountdownTimer({ lang }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextDrop = new Date();
      nextDrop.setHours(9, 0, 0, 0); 
      if (now.getHours() >= 9) nextDrop.setDate(nextDrop.getDate() + 1);

      const diff = nextDrop - now;
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-xs font-mono font-bold tracking-widest uppercase">
      {lang === 'en' ? 'New question in' : 'Nuova domanda tra'} <span className="text-gray-200">{timeLeft}</span>
    </span>
  )
}

export default function HomePage() {
  const {
    user, group, streak, todayAnswered,
    currentQuestion, fetchTodayQuestion,
    lang, setLang, groupAnswers, fetchGroupAnswers
  } = useStore()
  
  const playSFX = useSFX(); 
  const navigate = useNavigate()
  const socketRef = useRef(null)

  useEffect(() => {
    playSFX('woosh');
  }, [playSFX]);

  const text = t[lang] || t['en'] || {}
  const suggestText = text.home || t['en']?.home || {}

  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [suggestionStatus, setSuggestionStatus] = useState('idle') 
  const [suggestionError, setSuggestionError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user?.id || !group?.id) {
      navigate('/')
      return
    }
    fetchTodayQuestion()
  }, [user?.id, group?.id, navigate, fetchTodayQuestion])

  useEffect(() => {
    if (todayAnswered && currentQuestion?.id && group?.id) {
      fetchGroupAnswers(group.id, currentQuestion.id)
    }
  }, [todayAnswered, currentQuestion?.id, group?.id, fetchGroupAnswers])

  useEffect(() => {
    if (!group?.id) return
    socketRef.current = io(SERVER_URL, { transports: ['websocket'] })
    socketRef.current.emit('join_room', { groupId: String(group.id), userId: user.id })
    socketRef.current.on('answer_submitted', () => {
      if (currentQuestion?.id) fetchGroupAnswers(group.id, currentQuestion.id)
    })
    return () => socketRef.current?.disconnect()
  }, [group?.id, currentQuestion?.id, fetchGroupAnswers])

  const totalCount = group?.members?.length || 1
  const answeredCount = groupAnswers?.length || (todayAnswered ? 1 : 0)
  const allAnswered = answeredCount >= totalCount
  const answeredUserIds = new Set(groupAnswers?.map(a => a.user_id) || [])

  const maxAvatars = 5
  const visibleMembers = group?.members?.slice(0, maxAvatars) || []
  const extraMembersCount = Math.max(0, totalCount - maxAvatars)

  const handleShare = async () => {
    playSFX('click');
    const shareData = { title: 'Hotseat', text: `Join my Hotseat group! Code: ${group?.code}`, url: 'https://hotseat.site' }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { fallbackCopy() }
    } else fallbackCopy()
  }

  const fallbackCopy = () => {
    navigator.clipboard.writeText(group?.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSuggest = async () => {
    if (suggestionText.trim().length < 5) return
    setSuggestionStatus('loading')
    setSuggestionError('')
    try {
      const res = await fetch(`${SERVER_URL}/api/suggest-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user.name, question_text: suggestionText.trim() })
      })
      const data = await res.json()

      if (res.ok && data.success) {
        playSFX('success'); 
        setSuggestionStatus('success')
        setTimeout(() => {
          setIsSuggesting(false)
          setSuggestionText('')
          setSuggestionStatus('idle')
          setSuggestionError('')
        }, 2200)
      } else if (res.status === 429) {
        setSuggestionError(data.error || 'Too many ideas! Try again in an hour.')
        setSuggestionStatus('error')
      } else {
        setSuggestionError(data.error || 'Failed to save. Try again.')
        setSuggestionStatus('error')
      }
    } catch {
      setSuggestionError('Network error. Check your connection.')
      setSuggestionStatus('error')
    }
  }

  const closeSuggestionModal = () => {
    playSFX('woosh');
    setIsSuggesting(false)
    setSuggestionText('')
    setSuggestionStatus('idle')
    setSuggestionError('')
  }

  const toggleLanguage = () => {
    playSFX('click');
    setLang(lang === 'en' ? 'it' : 'en');
  }

  if (!currentQuestion || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-display tracking-widest uppercase">
            {text.loading || 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  const activeQuestionText = currentQuestion[`text_${lang}`] || currentQuestion.text

  return (
    <div className="min-h-screen bg-black pb-24 relative overflow-hidden text-white">
      
      {/* static bg blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#2e1065_0%,_#000000_80%)] opacity-70" />
        <div className="absolute top-[15%] left-[-5%] w-[500px] h-[500px] bg-[#3b0764]/20 rounded-full blur-[160px] transform-gpu will-change-transform" />
        <div className="absolute bottom-[5%] right-[-5%] w-[600px] h-[600px] bg-[#1e1b4b]/40 rounded-full blur-[180px] transform-gpu will-change-transform" />
      </div>

      <div className="relative z-10">
        {/* header */}
        <div className="px-5 pt-14 pb-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1 font-bold">
              {text.todaysDrop}
            </p>
            <h2 className="text-white font-bold font-display text-lg">{group?.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/10 transition-colors"
            >
              <Globe size={13} className="text-gray-400" />
              <span className="text-base leading-none text-gray-200">
                {lang === 'en' ? '🇺🇸' : '🇮🇹'}
              </span>
            </motion.button>

            <motion.div
              whileTap={{ scale: 0.92 }}
              className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-2xl px-3 py-2 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
            >
              <Flame size={15} className="text-orange-500" />
              <span className="text-orange-400 font-bold text-sm font-display">
                {streak}
              </span>
            </motion.div>
          </div>
        </div>

        {/* question card */}
        <div className="px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="flex items-center justify-between mb-5 relative z-10">
              <span className="inline-block bg-white/10 text-gray-300 border border-white/10 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {currentQuestion.category || 'Hotseat'}
              </span>
              {answeredCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                  <span className="text-green-400 font-mono text-xs tracking-wider font-bold">
                    {answeredCount} IN
                  </span>
                </motion.div>
              )}
            </div>

            <p className="text-white text-2xl font-bold font-display leading-snug mb-7 relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {activeQuestionText}
            </p>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex -space-x-2">
                {visibleMembers.map((m) => {
                  const isMe = m.id === user.id
                  const hasAnswered = todayAnswered && answeredUserIds.has(m.id)

                  return (
                    <div
                      key={m.id}
                      className={`
                        w-9 h-9 rounded-full border-2 border-black
                        flex items-center justify-center text-xs font-bold overflow-hidden
                        transition-all duration-300 relative
                        ${isMe ? 'bg-fuchsia-600 text-white z-10 shadow-[0_0_15px_rgba(217,70,239,0.5)]' : hasAnswered ? 'bg-violet-600 text-white' : 'bg-white/10 text-gray-400'}
                      `}
                      title={m.name}
                    >
                      {m.avatar_url ? (
                        <img src={`${SERVER_URL}${m.avatar_url}`} alt="pfp" className="w-full h-full object-cover" />
                      ) : (
                        m.avatar_text
                      )}
                      
                      {todayAnswered && hasAnswered && !isMe && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_5px_rgba(34,197,94,1)]">
                          <Check size={8} className="text-black" strokeWidth={4} />
                        </span>
                      )}
                    </div>
                  )
                })}

                {extraMembersCount > 0 && (
                  <div className="w-9 h-9 rounded-full border-2 border-black bg-white/10 text-gray-400 flex items-center justify-center text-xs font-bold">
                    +{extraMembersCount}
                  </div>
                )}
              </div>

              <motion.span
                key={answeredCount}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm font-bold ${allAnswered ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'text-gray-500'}`}
              >
                {answeredCount}/{totalCount} {text.answered}
                {allAnswered && '🎉'}
              </motion.span>
            </div>
          </motion.div>

          {/* primary cta */}
          {!todayAnswered ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playSFX('success');
                navigate('/answer');
              }}
              className="w-full relative overflow-hidden bg-violet-600/30 backdrop-blur-md border border-violet-500/50 text-violet-100 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 text-lg font-display shadow-[0_0_30px_rgba(139,92,246,0.2)] group hover:bg-violet-600/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {text.dropAnswer} <ChevronRight size={22} className="text-violet-300" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playSFX('success');
                navigate('/results');
              }}
              className="w-full bg-white/5 backdrop-blur-md border border-white/10 text-gray-200 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 text-lg font-display hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
              {text.seeOthers} <ChevronRight size={22} className="text-gray-400" />
            </motion.button>
          )}

          {/* share / invite */}
          <button
            onClick={handleShare}
            className="w-full mt-4 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors py-3"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Share size={13} />}
            <span className="text-xs font-mono tracking-widest">
              {copied ? text.copied : `${text.inviteCode}: ${group?.code}`}
            </span>
          </button>

          {/* countdown timer */}
          <div className="mt-3 flex items-center justify-center gap-2 text-gray-500 bg-black/40 backdrop-blur-md border border-white/5 py-2 px-4 rounded-full w-max mx-auto shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
            <Clock size={12} className="text-gray-400" />
            <CountdownTimer lang={lang} />
          </div>

          {/* suggest question btn */}
          <div className="mt-6 flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSFX('click');
                setIsSuggesting(true);
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 text-sm font-bold transition-all bg-white/5 border border-white/5 px-5 py-3 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
            >
              <Lightbulb size={15} className="text-gray-400" />
              {suggestText.suggestBtn}
            </motion.button>
          </div>
        </div>
      </div>

      {/* suggestion modal */}
      <AnimatePresence>
        {isSuggesting && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-5 pb-5 sm:pb-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSuggestionModal}
              className="absolute inset-0 bg-black/85"
              
            />
            <motion.div
             
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-sm bg-[#09090B]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
            
              <button
                onClick={closeSuggestionModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>

              <AnimatePresence mode="wait">
                {suggestionStatus === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                      <CheckCircle size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-1">
                      {suggestText.success}
                    </h3>
                    <p className="text-gray-400 text-sm font-medium">
                      We'll review your suggestion soon.
                    </p>
                  </motion.div>
                )}

                {suggestionStatus !== 'success' && (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                      <Lightbulb size={22} />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-1">
                      {suggestText.suggestTitle}
                    </h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-5 font-medium">
                      {suggestText.suggestDesc}
                    </p>

                    <textarea
                      value={suggestionText}
                      onChange={(e) => {
                        setSuggestionText(e.target.value);
                        if (suggestionStatus === 'error') setSuggestionStatus('idle');
                      }}
                      placeholder={suggestText.placeholder}
                      className="w-full h-28 bg-black/50 border border-white/10 focus:border-white/30 focus:bg-white/5 rounded-2xl p-4 text-white text-sm outline-none transition-all resize-none mb-3"
                    />

                    <div className="flex justify-end mb-3">
                      <span className={`text-xs font-mono font-bold ${suggestionText.length > 200 ? 'text-orange-400' : 'text-gray-600'}`}>
                        {suggestionText.length}/300
                      </span>
                    </div>

                    <AnimatePresence>
                      {suggestionStatus === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 mb-4 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        >
                          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                          <span className="text-red-400 text-xs font-bold">
                            {suggestionError}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSuggest}
                      disabled={suggestionStatus === 'loading' || suggestionText.trim().length < 5}
                      className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      {suggestionStatus === 'loading' ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={16} />
                          {suggestText.submit}
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav active="home" />
    </div>
  )
}