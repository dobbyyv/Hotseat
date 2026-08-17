import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, ScrollText } from 'lucide-react'
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../legalContent'

const DOCS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
}

function LegalSection({ section }) {
  return (
    <section className="mb-6">
      <h3 className="text-white font-bold font-display text-[15px] mb-2 tracking-tight">
        {section.h}
      </h3>
      {section.p?.map((para, i) => (
        <p key={`p-${i}`} className="text-zinc-400 text-sm leading-relaxed mb-2">
          {para}
        </p>
      ))}
      {section.p2?.map((para, i) => (
        <p key={`p2-${i}`} className="text-zinc-400 text-sm leading-relaxed mb-2">
          {para}
        </p>
      ))}
      {section.ul && (
        <ul className="space-y-1.5">
          {section.ul.map((li, i) => (
            <li key={`ul-${i}`} className="text-zinc-400 text-sm leading-relaxed flex gap-2">
              <span className="text-zinc-600 select-none shrink-0">•</span>
              <span>{li}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function LegalModal({ open, initialDoc = 'terms', onClose }) {
  const [docKey, setDocKey] = useState(initialDoc)

  // Re-sync when the modal is opened with a specific document.
  useEffect(() => {
    if (open && initialDoc) setDocKey(initialDoc)
  }, [open, initialDoc])

  const doc = DOCS[docKey] || DOCS.terms

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={doc.title}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg max-h-[85dvh] flex flex-col bg-[#0b0b10]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                    {docKey === 'privacy' ? <ShieldCheck size={20} /> : <ScrollText size={20} />}
                  </div>
                  <div>
                    <h2 className="text-white text-xl font-black font-display tracking-tight">
                      {doc.title}
                    </h2>
                    <p className="text-zinc-500 text-[11px] font-medium">
                      Effective {doc.effective}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 bg-zinc-900/60 border border-white/10 rounded-2xl p-1.5">
                {[
                  { key: 'privacy', label: 'Privacy Policy' },
                  { key: 'terms', label: 'Terms of Service' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDocKey(tab.key)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-display transition-all ${
                      docKey === tab.key
                        ? 'bg-white text-black'
                        : 'text-zinc-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 py-5 select-text">
              {doc.sections.map((section, i) => (
                <LegalSection key={i} section={section} />
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl hover:bg-zinc-200 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
