import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X } from 'lucide-react'

export default function Toast({ message, visible, onClose }) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-full px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
        >
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-white whitespace-nowrap">{message}</span>
          <button onClick={onClose} className="ml-1 text-zinc-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}