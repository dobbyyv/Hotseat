import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Loader2, Image as ImageIcon,
  Smile, X, ChevronDown, ChevronUp
} from 'lucide-react'
import { io } from 'socket.io-client'
import useStore from '../store/useStore'
import BottomNav from '../components/BottomNav'
import { t } from '../translations'
import { subscribeToPushNotifications } from '../pushUtility'
import useSFX from '../useSFX'

const SERVER_URL  = import.meta.env.VITE_SERVER_URL
const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || ''

// ─────────────────────────────────────────────────────────────────────────────
// VOTE BREAKDOWN — shown when question.type === 'tag'
// Groups individual answers into candidate rows with % bars + voter avatars.
// ─────────────────────────────────────────────────────────────────────────────
const BAR_COLORS = [
  'from-violet-500 to-fuchsia-500',
  'from-sky-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
]

function VoteBreakdown({ answers, groupMembers, serverUrl, revealed }) {
  const total = answers.length

  const ranked = useMemo(() => {
    const map = {}
    answers.forEach(ans => {
      const key = (ans.answer_text || '').trim()
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(ans)
    })
    return Object.entries(map)
      .map(([name, voters]) => ({
        name,
        voters,
        count: voters.length,
        pct: total > 0 ? Math.round((voters.length / total) * 100) : 0,
        member: groupMembers?.find(m => m.name === name) ?? null,
      }))
      .sort((a, b) => b.count - a.count)
  }, [answers, total, groupMembers])

  if (ranked.length === 0) return (
    <p className="text-gray-600 text-sm text-center py-6">No votes yet.</p>
  )

  return (
    <div className="space-y-5 px-5 py-4">
      {ranked.map((entry, i) => {
        const color = BAR_COLORS[i % BAR_COLORS.length]
        return (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, y: 12 }}
            animate={revealed ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            {/* Name + percentage row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                {/* Avatar of the voted-for person */}
                <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {entry.member?.avatar_url
                    ? <img src={`${serverUrl}${entry.member.avatar_url}`} className="w-full h-full object-cover" alt="" />
                    : <span className="text-gray-300">{entry.name.substring(0, 2).toUpperCase()}</span>
                  }
                </div>
                {i === 0 && <span className="text-base leading-none">👑</span>}
                <span className="text-white font-bold text-sm tracking-tight">{entry.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-sm font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                  {entry.pct}%
                </span>
                <span className="text-gray-600 text-xs">
                  {entry.count} vote{entry.count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mb-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={revealed ? { width: `${entry.pct}%` } : { width: 0 }}
                transition={{ delay: i * 0.1 + 0.15, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`h-full rounded-full bg-gradient-to-r ${color}`}
                style={{ boxShadow: i === 0 ? '0 0 12px rgba(139,92,246,0.5)' : 'none' }}
              />
            </div>

            {/* Mini voter avatars + names */}
            <div className="flex items-center gap-2 pl-0.5">
              <div className="flex -space-x-1.5">
                {entry.voters.slice(0, 7).map(voter => (
                  <div
                    key={voter.user_id}
                    className="w-5 h-5 rounded-full border border-black bg-white/10 overflow-hidden flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    title={voter.name}
                  >
                    {voter.avatar_url
                      ? <img src={`${serverUrl}${voter.avatar_url}`} className="w-full h-full object-cover" alt="" />
                      : <span className="text-gray-400">{voter.avatar_text?.[0]}</span>
                    }
                  </div>
                ))}
                {entry.voters.length > 7 && (
                  <div className="w-5 h-5 rounded-full border border-black bg-white/5 flex items-center justify-center text-[8px] text-gray-500">
                    +{entry.voters.length - 7}
                  </div>
                )}
              </div>
              <span className="text-gray-600 text-[10px] truncate">
                {entry.voters.map(v => v.name).join(', ')}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER CARD — used for text / slider / choice questions
// ─────────────────────────────────────────────────────────────────────────────
function AnswerCard({ ans, index, isMe, revealed, serverUrl }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={revealed ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.1 }}
      className={`bg-black/50 backdrop-blur-xl border rounded-2xl p-4 flex gap-3 ${
        isMe
          ? 'border-violet-500/40 shadow-[0_0_16px_rgba(139,92,246,0.1)]'
          : 'border-white/8'
      }`}
    >
      <div className={`w-10 h-10 rounded-full border border-black flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden ${
        isMe ? 'bg-white text-black' : 'bg-white/10 text-gray-300'
      }`}>
        {ans.avatar_url
          ? <img src={`${serverUrl}${ans.avatar_url}`} className="w-full h-full object-cover" alt="pfp" />
          : ans.avatar_text
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-500 text-[10px] mb-1.5 font-bold uppercase tracking-widest">
          {isMe ? `${ans.name} · you` : ans.name}
        </p>
        <p className="text-white text-sm leading-relaxed break-words">{ans.answer_text}</p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
function ChatBubble({ msg, isMe, serverUrl }) {
  return (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full border border-black bg-white/10 flex items-center justify-center text-gray-300 font-bold text-xs flex-shrink-0 overflow-hidden shadow-md">
        {msg.avatar_url
          ? <img src={`${serverUrl}${msg.avatar_url}`} className="w-full h-full object-cover" alt="pfp" />
          : msg.avatar_text
        }
      </div>

      {/* Content */}
      <div className={`max-w-[72%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="text-gray-500 text-[10px] px-1 font-bold uppercase tracking-wider">{msg.name}</span>
        )}
        <div className={`text-sm font-medium break-words ${
          msg.type === 'text'
            ? isMe
              ? 'bg-violet-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-[0_0_12px_rgba(139,92,246,0.2)]'
              : 'bg-white/8 border border-white/8 text-white px-4 py-2.5 rounded-2xl rounded-tl-sm backdrop-blur-md'
            : ''
        }`}>
          {msg.type === 'text' && msg.text}
          {msg.type === 'image' && (
            <img
              src={`${serverUrl}${msg.media_url}`}
              alt="upload"
              className="rounded-xl max-w-full border border-white/10"
            />
          )}
          {msg.type === 'gif' && (
            <img
              src={msg.media_url}
              alt="gif"
              className="rounded-xl max-w-full border border-white/10"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const {
    user, group, lang,
    currentQuestion: question,
    fetchTodayQuestion,
    groupAnswers, fetchGroupAnswers,
    todayAnswered, isFetchingAnswers
  } = useStore()
  const navigate  = useNavigate()
  const text      = t[lang] ?? t['en']
  const playSFX   = useSFX()

  const [revealed, setRevealed]               = useState(false)
  const [answersCollapsed, setAnswersCollapsed] = useState(false)

  // ── Chat state ────────────────────────────────────────────────
  const socketRef         = useRef(null)
  const [messages, setMessages]         = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [typingUsers, setTypingUsers]   = useState([])
  const typingTimerRef    = useRef(null)
  const chatScrollRef     = useRef(null)
  const chatEndRef        = useRef(null)
  const fileInputRef      = useRef(null)
  const [isUploading, setIsUploading]   = useState(false)

  // ── Giphy state ───────────────────────────────────────────────
  const [showGifPicker, setShowGifPicker]       = useState(false)
  const [gifQuery, setGifQuery]                 = useState('')
  const [gifs, setGifs]                         = useState([])
  const [isSearchingGifs, setIsSearchingGifs]   = useState(false)
  const gifDebounceRef = useRef(null)

  // ── SFX on mount ──────────────────────────────────────────────
  useEffect(() => {
    playSFX('woosh')
    const kp = () => playSFX('keypress')
    window.addEventListener('keydown', kp)
    return () => window.removeEventListener('keydown', kp)
  }, [playSFX])

  // ── Fetch question + answers ───────────────────────────────────
  useEffect(() => {
    if (!question) fetchTodayQuestion()
  }, [question, fetchTodayQuestion])

  useEffect(() => {
    if (todayAnswered && question) {
      fetchGroupAnswers()
      setTimeout(() => setRevealed(true), 400)
    }
  }, [todayAnswered, question, fetchGroupAnswers])

  // ── Fetch persistent chat history ─────────────────────────────
  useEffect(() => {
    if (!group?.id) return
    fetch(`${SERVER_URL}/api/chat/${group.id}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setMessages(data))
      .catch(console.error)
  }, [group?.id])

  // ── WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!group || !user) return

    const sock = io(SERVER_URL)
    socketRef.current = sock
    sock.emit('join_room', { groupId: group.id, userId: user.id })

    sock.on('receive_message', msg => {
      setMessages(prev => [...prev, msg])
    })

    sock.on('user_typing', data => {
      if (data.user_id === user.id) return
      setTypingUsers(prev =>
        prev.find(u => u.user_id === data.user_id) ? prev : [...prev, data]
      )
    })

    sock.on('user_stopped_typing', data => {
      setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id))
    })

    sock.on('answer_submitted', () => {
      fetchGroupAnswers()
    })

    return () => sock.disconnect()
  }, [group, user, fetchGroupAnswers])

  

  // ── Typing handler ────────────────────────────────────────────
  const handleTyping = e => {
    setMessageInput(e.target.value)
    socketRef.current?.emit('typing_start', { group_id: group.id, user_id: user.id, name: user.name })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_end', { group_id: group.id, user_id: user.id })
    }, 2000)
  }

  // ── Send helpers ──────────────────────────────────────────────
  const emitMessage = (type, content) => {
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      group_id:    group.id,
      user_id:     user.id,
      name:        user.name,
      avatar_url:  user.avatar_url,
      avatar_text: user.avatar_text,
      type,
      text:      type === 'text' ? content : '',
      media_url: type !== 'text' ? content : null,
    }
    setMessages(prev => [...prev, msg])
    socketRef.current?.emit('send_message', msg)
  }

  const handleSendText = () => {
    if (!messageInput.trim()) return
    playSFX('thock')
    emitMessage('text', messageInput.trim())
    setMessageInput('')
    socketRef.current?.emit('typing_end', { group_id: group.id, user_id: user.id })
  }

  const handleImageUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB.'); return }
    setIsUploading(true)
    playSFX('thock')
    const fd = new FormData()
    fd.append('image', file)
    fd.append('group_id', group.id)
    try {
      const r = await fetch(`${SERVER_URL}/api/chat-image`, { method: 'POST', body: fd })
      const d = await r.json()
      if (d.url) emitMessage('image', d.url)
    } catch (err) {
      console.error('Upload failed', err)
    }
    setIsUploading(false)
  }

  // ── Giphy search (debounced 500 ms) ───────────────────────────
  const handleGifQueryChange = val => {
    setGifQuery(val)
    if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current)
    if (!val.trim()) { setGifs([]); return }
    setIsSearchingGifs(true)
    gifDebounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(val)}&limit=12&rating=pg-13`
        )
        const d = await r.json()
        setGifs(d.data ?? [])
      } catch (err) {
        console.error('Giphy error', err)
      }
      setIsSearchingGifs(false)
    }, 500)
  }

  const handleSendGif = url => {
    playSFX('thock')
    emitMessage('gif', url)
    setShowGifPicker(false)
    setGifQuery('')
    setGifs([])
  }

  const isTagQuestion = question?.type === 'tag' || question?.ui_type === 'tag'

  // ── Loading screen ────────────────────────────────────────────
  if (!question || !user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-display tracking-widest uppercase font-bold">
          {text.loading ?? 'Loading...'}
        </p>
      </div>
    </div>
  )

  // ── Gatekeeper ────────────────────────────────────────────────
  if (!todayAnswered) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#2e1065_0%,_#000000_80%)] opacity-70" />
        <div className="absolute top-[-10%] left-[-15%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[140px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center max-w-[260px]">
        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <span className="text-4xl">🤫</span>
        </div>
        <h2 className="text-white font-bold font-display text-2xl mb-3">No Peeking!</h2>
        <p className="text-gray-400 text-sm font-bold mb-8 leading-relaxed">
          Drop your own answer first before seeing what everyone said.
        </p>
        <button
          onClick={() => { playSFX('woosh'); navigate('/home') }}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-gray-100 active:scale-95 transition-all"
        >
          Go Answer
        </button>
      </div>
      <BottomNav active="results" />
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN SPLIT LAYOUT
  // The entire page is a fixed full-screen flex column.
  // - Header: shrink-0
  // - Answers panel: shrink-0, collapsible
  // - Chat messages: flex-1, independent scroll
  // - Input bar: shrink-0
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white font-sans overflow-hidden">

      {/* ── Atmospheric background ───────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#2e1065_0%,_#000000_80%)] opacity-60" />
        <div className="absolute top-[-10%] left-[-15%] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[30%] right-[-10%] w-[350px] h-[350px] bg-fuchsia-900/10 rounded-full blur-[120px]" />
      </div>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 pt-14 pb-4 px-5 bg-white/[0.02] border-b border-white/5 backdrop-blur-md">
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Results</p>
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-[10px] font-bold uppercase tracking-widest bg-violet-500/10 px-2 py-1 rounded-md border border-violet-500/20">
              {group?.name}
            </span>
            <button
              onClick={() => { playSFX('success'); subscribeToPushNotifications(user.id, SERVER_URL) }}
              className="bg-white/8 text-white border border-white/15 px-2.5 py-1.5 rounded-xl text-[10px] font-bold active:scale-95 transition-all hover:bg-white/15"
            >
              🔔
            </button>
          </div>
        </div>
        <p className="text-white font-bold font-display text-base leading-snug line-clamp-2">
          {question[`text_${lang}`] ?? question.text}
        </p>
      </div>

      {/* ── ANSWERS PANEL ────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 border-b border-white/8">

        {/* Toggle bar — always visible */}
        <button
          onClick={() => setAnswersCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-bold uppercase tracking-widest">
              {isTagQuestion ? 'Vote Breakdown' : 'Answers'}
            </span>
            {!isFetchingAnswers && groupAnswers.length > 0 && (
              <span className="bg-violet-500/20 text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-500/20">
                {groupAnswers.length}
              </span>
            )}
          </div>
          {answersCollapsed
            ? <ChevronDown size={14} className="text-gray-500" />
            : <ChevronUp   size={14} className="text-gray-500" />
          }
        </button>

        {/* Collapsible body */}
        <motion.div
          animate={{ height: answersCollapsed ? 0 : 'auto' }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ overflow: 'hidden' }}
        >
          <div className="max-h-[36vh] overflow-y-auto overscroll-contain">
            {isFetchingAnswers ? (
              <div className="flex justify-center py-8">
                <Loader2 size={22} className="text-violet-500 animate-spin" />
              </div>
            ) : groupAnswers.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                No answers yet — be the first!
              </p>
            ) : isTagQuestion ? (
              <VoteBreakdown
                answers={groupAnswers}
                groupMembers={group?.members}
                serverUrl={SERVER_URL}
                revealed={revealed}
              />
            ) : (
              <div className="px-5 py-3 space-y-3">
                {groupAnswers.map((ans, i) => (
                  <AnswerCard
                    key={ans.user_id}
                    ans={ans}
                    index={i}
                    isMe={ans.user_id === user.id}
                    revealed={revealed}
                    serverUrl={SERVER_URL}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── CHAT LABEL ───────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 flex items-center gap-3 px-5 py-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
          {text.liveChat ?? 'Live Chat'}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* ── CHAT MESSAGES (independent scroll) ───────────────────── */}
      <div
  ref={chatScrollRef}
  className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-2 space-y-3"
>
        {messages.length === 0 && (
          <p className="text-gray-700 text-xs text-center pt-4">No messages yet. Start the chaos ↓</p>
        )}

        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            isMe={msg.user_id === user.id}
            serverUrl={SERVER_URL}
          />
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-2"
            >
              <div className="flex gap-1 bg-white/8 px-3 py-2 rounded-full border border-white/5">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay }}
                    className="w-1.5 h-1.5 bg-violet-400 rounded-full"
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {typingUsers[0].name} is typing…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={chatEndRef} className="h-1" />
      </div>

      {/* ── GIF PICKER ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 shrink-0 mx-4 mb-2 bg-black/90 backdrop-blur-xl border border-white/15 rounded-3xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <input
                value={gifQuery}
                onChange={e => handleGifQueryChange(e.target.value)}
                placeholder={text.searchGifs ?? 'Search GIFs…'}
                autoFocus
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-violet-500 transition-colors"
              />
              <button
                onClick={() => { setShowGifPicker(false); setGifQuery(''); setGifs([]) }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-36 overflow-y-auto grid grid-cols-3 gap-2">
              {isSearchingGifs ? (
                <div className="col-span-3 flex justify-center items-center py-4">
                  <Loader2 className="animate-spin text-violet-500" size={20} />
                </div>
              ) : gifs.length === 0 ? (
                <div className="col-span-3 flex justify-center items-center py-4">
                  <p className="text-gray-600 text-xs">{gifQuery ? 'No results' : 'Type to search'}</p>
                </div>
              ) : (
                gifs.map(gif => (
                  <button
                    key={gif.id}
                    onClick={() => handleSendGif(gif.images.fixed_height.url)}
                    className="rounded-xl overflow-hidden h-20 w-full bg-white/5 border border-white/10 active:scale-95 transition-all"
                  >
                    <img src={gif.images.fixed_height.url} alt="gif" className="w-full h-full object-cover" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INPUT BAR ────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 flex gap-2 items-end px-4 pt-2 pb-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />



        <div className="flex-1 bg-black/80 backdrop-blur-xl border border-white/15 rounded-3xl flex items-center px-2 py-1 focus-within:border-white/35 transition-colors shadow-xl">
          <button
            onClick={() => { playSFX('click'); fileInputRef.current?.click() }}
            disabled={isUploading}
            className="p-2.5 text-gray-400 hover:text-white transition-colors"
          >
            {isUploading
              ? <Loader2 size={19} className="animate-spin" />
              : <ImageIcon size={19} />
            }
          </button>

          <button
            onClick={() => { playSFX('click'); setShowGifPicker(p => !p) }}
            className={`p-2.5 transition-colors ${showGifPicker ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Smile size={19} />
          </button>

          <textarea
  value={messageInput}
  onChange={handleTyping}
  onKeyDown={e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 👈 This stops 'Enter' from creating a new line
      handleSendText();
    }
  }}
  placeholder={text.typeMessage ?? 'Say something…'}
  rows="1"
  spellCheck="false"
  className="flex-1 bg-transparent px-2 py-3.5 text-white font-bold placeholder:text-gray-600 outline-none text-sm resize-none overflow-hidden h-[46px] block"
/>
        </div>

        <button
          onClick={handleSendText}
          className="w-[52px] h-[52px] bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        >
          <Send size={19} className="text-black relative right-px" />
        </button>
      </div>

      {/* Bottom nav spacer — Pushes the input bar UP so BottomNav doesn't hide it */}
<div className="shrink-0 h-24" />

      <BottomNav active="results" />
    </div>
  )
}