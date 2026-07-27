import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react'
import useStore from '../store/useStore'
import { t } from '../translations'
import useSFX from '../useSFX'

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function AnswerPage() {
  const { currentQuestion: question, submitAnswer, group, lang } = useStore()
  const navigate = useNavigate()
  const playSFX = useSFX()
  
  const [answer, setAnswer] = useState('')
  const [selected, setSelected] = useState(null)
  const [sliderVal, setSliderVal] = useState(50)
  const [taggedFriend, setTaggedFriend] = useState(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const text = t[lang]?.answer || t['en']?.answer || {}

  if (!question) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-500" size={32} />
      </div>
    )
  }

  const activeQuestionText = question[`text_${lang}`] || question.text

  const handleSubmit = async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    playSFX('click')
    
    let final
    if (question.ui_type === 'text') final = answer
    if (question.ui_type === 'choice') final = selected
    if (question.ui_type === 'slider') final = `${sliderVal}/100`
    if (question.ui_type === 'tag') final = taggedFriend?.name

    const success = await submitAnswer(final)
    setIsSubmitting(false)

    if (success) {
      playSFX('success')
      setSubmitted(true)
      setTimeout(() => navigate('/results'), 1800)
    } else {
      playSFX('error')
      setSubmitError(useStore.getState().error || "Failed to submit.")
    }
  }

  const canSubmit = () => {
    if (question.ui_type === 'text') return answer.trim().length > 0
    if (question.ui_type === 'choice') return selected !== null
    if (question.ui_type === 'slider') return true
    if (question.ui_type === 'tag') return taggedFriend !== null
    return false
  }

  return (
    <div className="min-h-screen bg-black px-5 pt-14 pb-10 relative overflow-hidden font-sans">
      
      {/* 🌌 STATIC ATMOSPHERIC BACKGROUND WASH */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#2e1065_0%,_#000000_80%)] opacity-70" />
        <motion.div
          animate={{ scale: [1, 1.05, 1], x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-[#3b0764]/20 rounded-full blur-[160px] transform-gpu will-change-transform"
        />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto">
        <button 
          onClick={() => {
            playSFX('woosh')
            navigate('/home')
          }} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 w-max bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md"
        >
          <ArrowLeft size={16} /><span className="text-xs font-bold uppercase tracking-widest">{text.back || 'Back'}</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 shadow-[0_0_15px_rgba(217,70,239,0.4)]">
            {question.category || 'Hotseat Daily'}
          </span>
          <h1 className="text-white text-3xl font-bold font-display leading-tight mb-8 drop-shadow-md">
            {activeQuestionText}
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          
          {/* TEXT TYPE */}
          {question.ui_type === 'text' && (
            <textarea 
              value={answer} 
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={text.typeAnswer || 'Type your truth...'} 
              autoFocus
              className="w-full bg-black/60 backdrop-blur-2xl border border-white/10 focus:border-violet-500 focus:bg-white/5 rounded-3xl p-6 text-white placeholder:text-gray-600 outline-none resize-none h-48 transition-colors text-lg shadow-inner font-medium leading-relaxed" 
            />
          )}

          {/* MULTIPLE CHOICE TYPE */}
          {question.ui_type === 'choice' && question.options && (
            <div className="flex flex-col gap-3">
              {question.options.map((opt, i) => (
                <motion.button 
                  key={i} 
                  whileTap={{ scale: 0.97 }} 
                  onClick={() => { playSFX('click'); setSelected(opt) }}
                  className={`w-full py-5 px-6 rounded-2xl border text-left font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md text-lg ${
                    selected === opt 
                      ? 'bg-violet-600/30 border-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          )}

          {/* SLIDER TYPE */}
          {question.ui_type === 'slider' && (
            <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              <div className="text-center mb-10">
                <span className="text-8xl font-black font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{sliderVal}</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))} 
                onMouseUp={() => playSFX('click')}
                onTouchEnd={() => playSFX('click')}
                className="w-full accent-violet-500 h-2 bg-white/10 rounded-full appearance-none" 
              />
              <div className="flex justify-between text-gray-500 text-xs font-bold mt-5 uppercase tracking-widest">
                <span>{text.notAtAll || 'Not at all'}</span><span>{text.absolutely || 'Absolutely'}</span>
              </div>
            </div>
          )}

          {/* TAG A FRIEND TYPE */}
          {question.ui_type === 'tag' && (
            <div className="flex flex-col gap-3">
              {group?.members?.map(friend => (
                <motion.button 
                  key={friend.id} 
                  whileTap={{ scale: 0.97 }} 
                  onClick={() => { playSFX('click'); setTaggedFriend(friend) }}
                  className={`w-full py-4 px-5 rounded-2xl border flex items-center gap-5 transition-all shadow-md backdrop-blur-md ${
                    taggedFriend?.id === friend.id 
                      ? 'bg-violet-600/30 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] text-white' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold overflow-hidden shadow-inner ${taggedFriend?.id === friend.id ? 'border-violet-400 bg-white/10' : 'border-black bg-black/40'}`}>
                    {friend.avatar_url ? <img src={`${SERVER_URL}${friend.avatar_url}`} alt="PFP" className="w-full h-full object-cover" /> : friend.avatar_text}
                  </div>
                  <span className="font-bold font-display text-xl tracking-tight">
                    {friend.name}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {submitError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6">
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-5 py-4 rounded-xl flex items-center gap-3 font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertCircle size={18} className="flex-shrink-0" /> {submitError}
              </div>
            </motion.div>
          )}

          {!submitted ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 pb-10">
              <motion.button 
                whileTap={{ scale: 0.97 }} 
                onClick={handleSubmit} 
                disabled={!canSubmit() || isSubmitting}
                className="w-full bg-white text-black disabled:opacity-30 disabled:cursor-not-allowed font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-lg font-display shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:bg-gray-200 active:scale-95"
              >
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <>{text.lockItIn || 'Lock it in'} <Send size={20} /></>}
              </motion.button>
              <p className="text-center text-gray-500 font-bold tracking-widest uppercase text-[10px] mt-5">{text.cantChange || 'NO TAKE BACKS'}</p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 text-center bg-white/[0.02] border border-white/10 rounded-[2rem] py-12 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="text-6xl mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">🔒</div>
              <p className="text-white font-bold font-display text-2xl tracking-tight">Answer Locked.</p>
              <p className="text-violet-400 text-sm font-bold mt-2">Generating results...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}