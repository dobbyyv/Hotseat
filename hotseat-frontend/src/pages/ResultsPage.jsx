import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Image as ImageIcon, Smile, X, ChevronDown, ChevronUp } from 'lucide-react'
import { io } from 'socket.io-client'
import useStore from '../store/useStore'
import { t } from '../translations'
import { subscribeToPushNotifications } from '../pushUtility'
import useSFX from '../useSFX'
import AnimatedNumber from '../components/AnimatedNumber'

const SERVER_URL = import.meta.env.VITE_SERVER_URL
const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || ''

const REACTIONS = [
  { emoji: '🔥', label: 'fire' },
  { emoji: '💀', label: 'skull' },
  { emoji: '👑', label: 'crown' },
  { emoji: '🎯', label: 'bullseye' },
  { emoji: '💜', label: 'heart' },
]

const VoteBreakdown = ({ answers, groupMembers, serverUrl, revealed }) => {
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
        name, voters, count: voters.length,
        pct: total > 0 ? Math.round((voters.length / total) * 100) : 0,
        member: groupMembers?.find(m => m.name === name) ?? null,
      }))
      .sort((a, b) => b.count - a.count)
  }, [answers, total, groupMembers])

  if (ranked.length === 0) return <p className="text-zinc-500 text-sm text-center py-6">No votes yet.</p>

  return (
    <div className="space-y-5">
      {ranked.map((entry, i) => (
        <motion.div key={entry.name} initial={{ opacity: 0, y: 12 }} animate={revealed ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.4 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden ${i === 0 ? 'border-amber-400/60 p-[1px] bg-gradient-to-b from-amber-400/30 to-transparent' : 'border-white/10 bg-zinc-800'}`}>
                <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-800">
                  {entry.member?.avatar_url ? <img src={`${serverUrl}${entry.member.avatar_url}`} className="w-full h-full object-cover rounded-full" alt="" /> : <span className="text-zinc-300">{entry.name.substring(0, 2).toUpperCase()}</span>}
                </div>
              </div>
              {i === 0 && <span className="text-base leading-none">👑</span>}
              <span className="text-white font-bold text-sm tracking-tight">{entry.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <AnimatedNumber value={entry.pct} suffix="%" className="font-mono text-sm text-zinc-300 font-bold" />
              <span className="text-zinc-600 text-xs">{entry.count} vote{entry.count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="w-full h-3 bg-zinc-800/80 rounded-full overflow-hidden p-[2px] border border-white/5 mb-2.5">
            <motion.div
              initial={{ width: 0 }}
              animate={revealed ? { width: `${entry.pct}%` } : { width: 0 }}
              transition={{ delay: i * 0.1 + 0.15, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`rounded-full h-full relative overflow-hidden ${i === 0 ? 'bg-gradient-to-r from-amber-100 via-white to-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]' : 'bg-gradient-to-r from-zinc-100 to-zinc-400'}`}
            >
              {i === 0 && revealed && (
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'linear', delay: 0.8 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              )}
            </motion.div>
          </div>
          <div className="flex items-center gap-2 pl-0.5">
            <div className="flex -space-x-1.5">
              {entry.voters.slice(0, 7).map(voter => (
                <div key={voter.user_id} className="w-5 h-5 rounded-full border border-zinc-800 bg-zinc-700 overflow-hidden flex items-center justify-center text-[9px] font-bold flex-shrink-0" title={voter.name}>
                  {voter.avatar_url ? <img src={`${serverUrl}${voter.avatar_url}`} className="w-full h-full object-cover" alt="" /> : <span className="text-zinc-400">{voter.avatar_text?.[0]}</span>}
                </div>
              ))}
              {entry.voters.length > 7 && <div className="w-5 h-5 rounded-full border border-zinc-800 bg-zinc-800/50 flex items-center justify-center text-[8px] text-zinc-500">+{entry.voters.length - 7}</div>}
            </div>
            <span className="text-zinc-600 text-[10px] truncate">{entry.voters.map(v => v.name).join(', ')}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

const AnswerCard = ({ ans, index, isMe, revealed, serverUrl }) => {
  return (
    <motion.div initial={{ opacity: 0, x: -14 }} animate={revealed ? { opacity: 1, x: 0 } : {}} transition={{ delay: index * 0.1 }}
      className={`bg-zinc-800/60 backdrop-blur-xl border rounded-2xl p-4 flex gap-3 ${isMe ? 'border-white/20' : 'border-white/8'}`}>
      <div className={`w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden ${isMe ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-300'}`}>
        {ans.avatar_url ? <img src={`${serverUrl}${ans.avatar_url}`} className="w-full h-full object-cover" alt="pfp" /> : ans.avatar_text}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-zinc-500 text-[10px] mb-1.5 font-bold uppercase tracking-widest">{isMe ? `${ans.name} · you` : ans.name}</p>
        <p className="text-white text-sm leading-relaxed break-words">{ans.answer_text}</p>
      </div>
    </motion.div>
  )
}

const ChatBubble = ({ msg, isMe, serverUrl }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
    >
      <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs flex-shrink-0 overflow-hidden">
        {msg.avatar_url ? <img src={`${serverUrl}${msg.avatar_url}`} className="w-full h-full object-cover" alt="pfp" /> : msg.avatar_text}
      </div>
      <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && <span className="text-zinc-500 text-[10px] px-1 font-bold uppercase tracking-wider">{msg.name}</span>}
        <div className={`text-sm font-medium break-words ${msg.type === 'text' ? isMe ? 'bg-white text-black px-4 py-2.5 rounded-2xl rounded-tr-sm' : 'bg-zinc-800/60 border border-white/10 text-zinc-200 px-4 py-2.5 rounded-2xl rounded-tl-sm backdrop-blur-md' : ''}`}>
          {msg.type === 'text' && msg.text}
          {msg.type === 'image' && <img src={`${serverUrl}${msg.media_url}`} alt="upload" className="rounded-xl max-w-full border border-white/10" />}
          {msg.type === 'gif' && <img src={msg.media_url} alt="gif" className="rounded-xl max-w-full border border-white/10" />}
        </div>
      </div>
    </motion.div>
  )
}

export default function ResultsPage() {
  const { user, group, lang, currentQuestion: question, fetchTodayQuestion, groupAnswers, fetchGroupAnswers, todayAnswered, isFetchingAnswers } = useStore()
  const navigate = useNavigate()
  const text = t[lang] ?? t['en']
  const playSFX = useSFX()

  const [revealed, setRevealed] = useState(false)
  const [answersCollapsed, setAnswersCollapsed] = useState(false)

  const socketRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimerRef = useRef(null)
  const chatScrollRef = useRef(null)
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifs, setGifs] = useState([])
  const [isSearchingGifs, setIsSearchingGifs] = useState(false)
  const gifDebounceRef = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { playSFX('woosh') }, [playSFX])
  useEffect(() => { if (!question) fetchTodayQuestion() }, [question, fetchTodayQuestion])
  useEffect(() => { if (todayAnswered && question) { fetchGroupAnswers(); setTimeout(() => setRevealed(true), 400) } }, [todayAnswered, question, fetchGroupAnswers])
  useEffect(() => { if (!group?.id) return; fetch(`${SERVER_URL}/api/chat/${group.id}`).then(r => r.json()).then(data => Array.isArray(data) && setMessages(data)).catch(console.error) }, [group?.id])

  useEffect(() => {
    if (!group || !user) return
    const sock = io(SERVER_URL); socketRef.current = sock
    sock.emit('join_room', { groupId: group.id, userId: user.id })
    sock.on('receive_message', msg => { setMessages(prev => [...prev, msg]) })
    sock.on('user_typing', data => { if (data.user_id === user.id) return; setTypingUsers(prev => prev.find(u => u.user_id === data.user_id) ? prev : [...prev, data]) })
    sock.on('user_stopped_typing', data => setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id)))
    sock.on('answer_submitted', () => fetchGroupAnswers())
    return () => sock.disconnect()
  }, [group, user, fetchGroupAnswers])

  const handleTyping = e => {
    setMessageInput(e.target.value)
    socketRef.current?.emit('typing_start', { group_id: group.id, user_id: user.id, name: user.name })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => socketRef.current?.emit('typing_end', { group_id: group.id, user_id: user.id }), 2000)
  }

  const emitMessage = (type, content) => {
    const msg = { id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, group_id: group.id, user_id: user.id, name: user.name, avatar_url: user.avatar_url, avatar_text: user.avatar_text, type, text: type === 'text' ? content : '', media_url: type !== 'text' ? content : null }
    setMessages(prev => [...prev, msg])
    socketRef.current?.emit('send_message', msg)
  }

  const handleSendText = () => { if (!messageInput.trim()) return; playSFX('thock'); emitMessage('text', messageInput.trim()); setMessageInput(''); socketRef.current?.emit('typing_end', { group_id: group.id, user_id: user.id }) }
  const handleSendReaction = (emoji) => { playSFX('thock'); emitMessage('text', emoji) }

  const handleImageUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB.'); return }
    setIsUploading(true); playSFX('thock')
    const fd = new FormData(); fd.append('image', file); fd.append('group_id', group.id)
    try { const r = await fetch(`${SERVER_URL}/api/chat-image`, { method: 'POST', body: fd }); const d = await r.json(); if (d.url) emitMessage('image', d.url) } catch (err) { console.error('Upload failed', err) }
    setIsUploading(false)
  }

  const handleGifQueryChange = val => {
    setGifQuery(val); if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current)
    if (!val.trim()) { setGifs([]); return }
    setIsSearchingGifs(true)
    gifDebounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(val)}&limit=12&rating=pg-13`)
        if (!r.ok) throw new Error(`Giphy API returned ${r.status}`)
        const d = await r.json()
        setGifs(Array.isArray(d?.data) ? d.data : [])
      } catch (err) {
        console.error('Giphy error', err)
        setGifs([])
      }
      setIsSearchingGifs(false)
    }, 500)
  }

  const handleSendGif = url => { playSFX('thock'); emitMessage('gif', url); setShowGifPicker(false); setGifQuery(''); setGifs([]) }
  const isVoteQuestion = question?.ui_type === 'vote_member' || question?.ui_type === 'tag' || question?.type === 'tag'

  if (!question || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
        <p className="text-zinc-500 text-xs font-display tracking-widest uppercase font-bold">{text.loading ?? 'Loading...'}</p>
      </div>
    </div>
  )

  if (!todayAnswered) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center max-w-[260px]">
        <div className="w-20 h-20 bg-zinc-900/60 border border-white/10 rounded-[2rem] flex items-center justify-center mb-6"><span className="text-4xl">🤫</span></div>
        <h2 className="text-white font-bold font-display text-2xl mb-3">No Peeking!</h2>
        <p className="text-zinc-400 text-sm font-bold mb-8 leading-relaxed">Drop your own answer first before seeing what everyone said.</p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { playSFX('woosh'); navigate('/home') }} className="w-full bg-white text-black font-semibold py-4 rounded-2xl text-sm tracking-wide hover:bg-zinc-200 transition-all">Go Answer</motion.button>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col lg:grid lg:grid-cols-12 lg:gap-5 lg:overflow-hidden">

      {/* ───── MOBILE HEADER ROW (hidden on desktop) ───── */}
      <div className="flex justify-between items-center pb-2 flex-shrink-0 lg:hidden">
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Results</p>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10">{group?.name}</span>
          <button onClick={() => { playSFX('success'); subscribeToPushNotifications(user.id, SERVER_URL) }} className="bg-zinc-800/80 text-white border border-white/10 px-2.5 py-1.5 rounded-xl text-[10px] font-bold active:scale-95 transition-all hover:bg-zinc-700/80">🔔</button>
        </div>
      </div>

      {/* ───── LEFT COLUMN: Question + Answers ───── */}
      <div className="flex flex-col min-h-0 lg:col-span-5 lg:h-full lg:overflow-hidden">
        {/* Desktop-only header */}
        <div className="hidden lg:flex justify-between items-center pb-2 flex-shrink-0">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Results</p>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10">{group?.name}</span>
            <button onClick={() => { playSFX('success'); subscribeToPushNotifications(user.id, SERVER_URL) }} className="bg-zinc-800/80 text-white border border-white/10 px-2.5 py-1.5 rounded-xl text-[10px] font-bold active:scale-95 transition-all hover:bg-zinc-700/80">🔔</button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-zinc-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl p-5 md:p-7 shadow-xl relative overflow-hidden group flex-1 min-h-0 flex flex-col"
        >
          <div className="flex-shrink-0">
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 3s ease-in-out infinite' }} />
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <p className="text-lg md:text-xl font-semibold tracking-tight text-zinc-100 mb-5 leading-snug">
              {question[`text_${lang}`] ?? question.text}
            </p>
            <button onClick={() => setAnswersCollapsed(c => !c)} className="w-full flex items-center justify-between py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">{isVoteQuestion ? 'Vote Breakdown' : 'Answers'}</span>
              <div className="flex items-center gap-2">
                {!isFetchingAnswers && (groupAnswers?.length > 0) && <span className="bg-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">{groupAnswers.length}</span>}
                {answersCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
            </button>
          </div>
          <motion.div animate={{ height: answersCollapsed ? 0 : 'auto' }} transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} className="overflow-hidden flex-1 min-h-0">
            <div className="pt-2 overflow-y-auto no-scrollbar h-full">
              {isFetchingAnswers ? <div className="flex justify-center py-6"><Loader2 size={20} className="text-zinc-400 animate-spin" /></div>
              : !groupAnswers || groupAnswers.length === 0 ? <p className="text-zinc-600 text-sm text-center py-6">No answers yet — be the first!</p>
              : isVoteQuestion ? <VoteBreakdown answers={groupAnswers} groupMembers={group?.members} serverUrl={SERVER_URL} revealed={revealed} />
              : <div className="space-y-3">{groupAnswers.map((ans, i) => <AnswerCard key={ans.user_id} ans={ans} index={i} isMe={ans.user_id === user.id} revealed={revealed} serverUrl={SERVER_URL} />)}</div>}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ───── RIGHT COLUMN: Live Chat (complete panel) ───── */}
      <div className="flex flex-col min-h-0 mt-3 lg:mt-0 lg:col-span-7 lg:h-full lg:overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col bg-zinc-900/40 border border-white/10 backdrop-blur-2xl rounded-3xl p-5 md:p-6">

          {/* Chat header */}
          <div className="flex items-center gap-3 mb-3 flex-shrink-0">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{text.liveChat ?? 'Live Chat'}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 mb-3 no-scrollbar"
          >
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[120px]">
                <span className="font-mono text-xs text-zinc-500 bg-zinc-950/50 border border-white/5 px-4 py-2 rounded-full mx-auto animate-pulse relative">
                  <span className="absolute inset-0 rounded-full bg-white/5 animate-ping" />
                  <span className="relative">No messages yet. Start the chaos ↓</span>
                </span>
              </div>
            )}
            {messages.map(msg => <ChatBubble key={msg.id} msg={msg} isMe={msg.user_id === user.id} serverUrl={SERVER_URL} />)}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex items-center gap-2">
                  <div className="flex gap-1 bg-zinc-800/80 px-3 py-2 rounded-full border border-white/5">
                    {[0, 0.2, 0.4].map((delay, i) => <motion.div key={i} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />)}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{typingUsers[0].name} is typing…</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Emoji reactions — inside chat panel */}
          <div className="flex items-center justify-center gap-2 flex-wrap pb-2 flex-shrink-0">
            {REACTIONS.map(r => (
              <motion.button
                key={r.label}
                whileHover={{ y: -3, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSendReaction(r.emoji)}
                className="bg-zinc-900/80 border border-white/10 hover:border-white/30 text-xs px-3 py-1.5 rounded-full backdrop-blur-md cursor-pointer transition-all"
              >
                {r.emoji}
              </motion.button>
            ))}
          </div>

          {/* GIF picker — inside chat panel */}
          <AnimatePresence>
            {showGifPicker && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}
                className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex-shrink-0 mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <input value={gifQuery} onChange={e => handleGifQueryChange(e.target.value)} placeholder={text.searchGifs ?? 'Search GIFs…'} autoFocus className="flex-1 bg-zinc-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-white/30 transition-colors" />
                  <button onClick={() => { setShowGifPicker(false); setGifQuery(''); setGifs([]) }} className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 border border-white/10 text-zinc-400 hover:text-white transition-all"><X size={16} /></button>
                </div>
                <div className="h-36 overflow-y-auto grid grid-cols-3 gap-2">
                  {isSearchingGifs ? <div className="col-span-3 flex justify-center items-center py-4"><Loader2 className="animate-spin text-zinc-400" size={20} /></div>
                  : gifs.length === 0 ? <div className="col-span-3 flex justify-center items-center py-4"><p className="text-zinc-600 text-xs">{gifQuery ? 'No results' : 'Type to search'}</p></div>
                  : gifs.map(gif => <button key={gif.id} onClick={() => handleSendGif(gif.images.fixed_height.url)} className="rounded-xl overflow-hidden h-20 w-full bg-zinc-800/80 border border-white/10 active:scale-95 transition-all"><img src={gif.images.fixed_height.url} alt="gif" className="w-full h-full object-cover" /></button>)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat input — native to chat panel */}
          <div className="relative flex items-center bg-zinc-950/90 border border-white/10 focus-within:border-white/30 rounded-full p-2 pl-5 shadow-2xl transition-all flex-shrink-0">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <button onClick={() => { playSFX('click'); fileInputRef.current?.click() }} disabled={isUploading} className="p-1.5 text-zinc-400 hover:text-white transition-colors shrink-0">
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            </button>
            <button onClick={() => { playSFX('click'); setShowGifPicker(p => !p) }} className={`p-1.5 transition-colors shrink-0 ${showGifPicker ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Smile size={18} />
            </button>
            <textarea
              value={messageInput}
              onChange={handleTyping}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
              placeholder={text.typeMessage ?? 'Say something…'}
              rows="1"
              spellCheck="false"
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none resize-none py-2 px-2 overflow-hidden h-[42px] block select-text"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleSendText}
              className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0 shadow-md"
            >
              <Send size={16} className="relative right-px" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}