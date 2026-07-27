import { useState, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, History, CalendarDays, BarChart2 } from 'lucide-react'
import useStore from '../store/useStore'
import BottomNav from '../components/BottomNav'
import { t } from '../translations'
import useSFX from '../useSFX'

const API = import.meta.env.VITE_SERVER_URL ? import.meta.env.VITE_SERVER_URL.replace(/\/+$/, '') : '';

// 🛡️ THE LAG KILLER: Extracted, memoized static background
const AmbientBackground = memo(() => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#2e1065_0%,_#000000_80%)] opacity-70" />
    <motion.div
      animate={{ scale: [1, 1.05, 1], x: [0, 20, 0], y: [0, -20, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[15%] left-[-5%] w-[500px] h-[500px] bg-[#3b0764]/20 rounded-full blur-[160px] transform-gpu will-change-transform"
    />
    <motion.div
      animate={{ scale: [1, 1.1, 1], x: [0, -30, 0], y: [0, 30, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute bottom-[5%] right-[-5%] w-[600px] h-[600px] bg-[#1e1b4b]/40 rounded-full blur-[180px] transform-gpu will-change-transform"
    />
  </div>
))

// ── THE VAULT (CALENDAR) ──────────────────────────────────
function CalendarTab({ groupId, lang }) {
  const [calendarData, setCalendarData] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayData, setDayData] = useState([])
  const [loading, setLoading] = useState(false)
  const playSFX = useSFX()

  useEffect(() => {
    if (!groupId) return
    fetch(`${API}/api/calendar/${groupId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        const text = await r.text(); 
        try {
          return JSON.parse(text); 
        } catch (e) {
          throw new Error("Server did not return valid JSON");
        }
      })
      .then(data => {
        setCalendarData(Array.isArray(data) ? data : []); 
      })
      .catch(err => {
        console.error("Calendar sync failed:", err);
        setCalendarData([]); 
      })
  }, [groupId])

  // Extract dates that actually have answers
  const activeDates = new Set((calendarData || []).map(d => d.question_date?.split('T')[0]))
  
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Safe local date formatting
  const todayDate = new Date()
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const selectDay = async (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (!activeDates.has(dateStr)) return
    
    playSFX('thock')
    if (selectedDay === dateStr) { setSelectedDay(null); return }
    
    setLoading(true)
    setSelectedDay(dateStr)
    
    try {
      const res = await fetch(`${API}/api/calendar/${groupId}/${dateStr}`)
      if (!res.ok) throw new Error("Failed to fetch day");
      const data = await res.json()
      setDayData(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setDayData([])
    }
    setLoading(false)
  }

  const calEntry = (calendarData || []).find(d => d.question_date?.split('T')[0] === selectedDay)

  return (
    <div className="pb-10">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => {
              playSFX('click')
              setCurrentMonth(new Date(year, month - 1))
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-bold font-display text-lg tracking-wide uppercase">{monthName}</span>
          <button onClick={() => {
              playSFX('click')
              setCurrentMonth(new Date(year, month + 1))
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-3">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-gray-500 text-xs py-1 font-bold uppercase tracking-wider">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isActive = activeDates.has(dateStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            
            return (
              <motion.button key={day} whileTap={isActive ? { scale: 0.85 } : {}} onClick={() => selectDay(day)}
                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative border ${
                  isSelected ? 'bg-violet-600 text-white border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.6)] z-10' :
                  isActive ? 'bg-violet-500/15 text-violet-300 border-violet-500/30 cursor-pointer hover:bg-violet-500/30 hover:border-violet-400/50' :
                  isToday ? 'border-white/20 text-gray-400 bg-white/10 cursor-default' :
                  'border-transparent text-gray-600 cursor-default'
                }`}>
                {day}
                {isActive && !isSelected && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_5px_rgba(167,139,250,1)]" />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* THE VAULT MEMORY VIEWER */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
            className="bg-black/60 backdrop-blur-2xl border border-violet-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            
            {/* Ambient inner glow */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-violet-600/10 to-transparent pointer-events-none" />

            <div className="flex items-center gap-2 mb-4 relative z-10">
              <History size={16} className="text-violet-400" />
              <p className="text-violet-300 text-xs font-bold uppercase tracking-widest">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {calEntry && (
              <p className="text-white font-bold font-display text-lg mb-6 leading-snug drop-shadow-md relative z-10">
                {lang === 'it' ? (calEntry.question_text_it || calEntry.question_text) : calEntry.question_text}
              </p>
            )}

            <div className="space-y-4 relative z-10">
              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
                      <div className="space-y-2 flex-1 pt-1">
                        <div className="h-3 bg-white/10 rounded w-1/4" />
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : dayData.length === 0 ? (
                <p className="text-gray-500 text-sm font-medium">The vault is empty for this day.</p>
              ) : (
                dayData.map((ans, i) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} className="flex gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 border border-violet-500/50 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase shadow-inner tracking-widest">
                      {ans.user_name?.substring(0, 2) || '?'}
                    </div>
                    <div>
                      <p className="text-violet-300 text-[10px] font-bold uppercase tracking-widest mb-1">{ans.user_name}</p>
                      <p className="text-gray-200 text-sm font-medium leading-relaxed">{ans.answer_text}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── RECAP (STATS) ─────────────────────────────────────────
const CARDS = [
  {
    key: 'mvp',
    label: '🏆 MVP',
    gradient: 'from-yellow-500/15 to-orange-500/5 border-yellow-500/30',
    accent: 'text-yellow-300',
    getValue: d => d.mvp?.user_name || '—',
    getSub: d => d.mvp ? `${d.mvp.count} answers locked in` : 'No data yet',
  },
  {
    key: 'novelist',
    label: '✍️ The Novelist',
    gradient: 'from-blue-500/15 to-cyan-500/5 border-blue-500/30',
    accent: 'text-blue-300',
    getValue: d => d.novelist?.user_name || '—',
    getSub: d => d.novelist ? `Avg ${d.novelist.avg_len} characters per answer` : 'No data yet',
  },
  {
    key: 'speedster',
    label: '⚡ The Speedster',
    gradient: 'from-violet-500/15 to-fuchsia-500/5 border-violet-500/30',
    accent: 'text-violet-300',
    getValue: d => d.speedster?.user_name || '—',
    getSub: d => d.speedster ? `First to answer ${d.speedster.first_count} times` : 'No data yet',
  },
  {
    key: 'ghost',
    label: '👻 The Ghost',
    gradient: 'from-slate-500/15 to-slate-600/5 border-slate-500/30',
    accent: 'text-slate-400',
    getValue: d => d.ghost?.user_name || '—',
    getSub: d => d.ghost ? `Only ${d.ghost.count} answer(s) submitted` : 'No data yet',
  },
  {
    key: 'hottest',
    label: '🔥 Hottest Day',
    gradient: 'from-red-500/15 to-orange-500/5 border-red-500/30',
    accent: 'text-red-400',
    getValue: d => d.hottest_day
      ? new Date(d.hottest_day.question_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—',
    getSub: d => d.hottest_day
      ? `"${d.hottest_day.question_text?.substring(0, 40)}..." · ${d.hottest_day.count} answers`
      : 'No data yet',
  },
]

function RecapTab({ groupId }) {
  const [period, setPeriod] = useState('weekly')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const playSFX = useSFX()

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    setData(null)
    fetch(`${API}/api/recap/${groupId}/${period}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Recap fetch failed");
        const text = await r.text();
        return JSON.parse(text);
      })
      .then(d => { 
        setData(d); 
        setLoading(false); 
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      })
  }, [groupId, period])

  const hasData = data && data.stats && parseInt(data.stats.total_answers) > 0

  return (
    <div className="pb-10">
      <div className="flex gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-1 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        {[
          ['weekly','This Week'], 
          ['monthly','This Month']
        ].map(([val, label]) => (
          <button key={val} onClick={() => {
              playSFX('click')
              setPeriod(val)
            }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold font-display transition-all ${period === val ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {data?.stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Answers', value: data.stats.total_answers },
            { label: 'Days Active', value: data.stats.days_active },
            { label: 'Players', value: data.stats.unique_participants },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600/50 to-fuchsia-600/50" />
              <p className="text-white text-3xl font-black font-display drop-shadow-md">{s.value || 0}</p>
              <p className="text-gray-400 text-[10px] mt-1 font-bold tracking-widest uppercase">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(n => (
            <div key={n} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 h-28 animate-pulse" />
          ))}
        </div>
      ) : !hasData ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl shadow-inner">
          <p className="text-4xl mb-4 opacity-50 drop-shadow-md">📭</p>
          <p className="text-gray-300 font-bold font-display text-lg tracking-wide">Not enough data yet.</p>
          <p className="text-gray-500 text-sm mt-2 font-medium">Keep dropping answers to unlock the recaps.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {CARDS.map((card, i) => (
            <motion.div key={card.key}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`bg-gradient-to-r ${card.gradient} border backdrop-blur-2xl rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative overflow-hidden`}>
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                {card.label}
              </p>
              <p className={`${card.accent} text-2xl font-black font-display mb-1 drop-shadow-md tracking-tight`}>{card.getValue(data)}</p>
              <p className="text-gray-400 text-xs font-medium">{card.getSub(data)}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN INFOPAGE ─────────────────────────────────────────
export default function InfoPage() {
  const { group, lang } = useStore()
  const [tab, setTab] = useState('calendar')
  const playSFX = useSFX()

  useEffect(() => {
    playSFX('woosh') 
  }, [playSFX])

  return (
    <div className="min-h-screen bg-black pb-24 relative overflow-hidden text-white font-sans">
      
      <AmbientBackground />

      <div className="relative z-10">
        {/* HEADER */}
        <div className="px-5 pt-14 pb-6 bg-white/[0.02] backdrop-blur-xl border-b border-white/10 shadow-lg">
          <p className="text-violet-400 text-[10px] uppercase tracking-widest mb-1.5 font-bold flex items-center gap-2">
            <BarChart2 size={14} /> Group Data
          </p>
          <h2 className="text-white font-black font-display text-3xl tracking-tight drop-shadow-md">{group?.name || 'The Crew'}</h2>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-5 mt-6 mb-6">
          <div className="flex gap-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-inner">
            {[
              ['calendar', <><CalendarDays size={16} /> Vault</>], 
              ['recap', <><BarChart2 size={16} /> Recap</>]
            ].map(([id, label]) => (
              <button key={id} onClick={() => {
                  playSFX('click')
                  setTab(id)
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold font-display transition-all flex items-center justify-center gap-2 ${tab === id ? 'bg-white/15 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="px-5">
          <AnimatePresence mode="wait">
            {tab === 'calendar' && (
              <motion.div key="cal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <CalendarTab groupId={group?.id} lang={lang || 'en'} />
              </motion.div>
            )}
            {tab === 'recap' && (
              <motion.div key="recap" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <RecapTab groupId={group?.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNav active="info" />
    </div>
  )
}