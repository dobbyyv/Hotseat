import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export default function ManageGroup() {
  const user = useStore((state) => state.user)
  const group = useStore((state) => state.group)
  const refreshGroupMembers = useStore((state) => state.refreshGroupMembers)
  const navigate = useNavigate()

  useEffect(() => {
    if (user === null || group === null) { navigate('/'); return }
    if (user && group) { refreshGroupMembers() }
  }, [user, group, refreshGroupMembers, navigate])

  if (!user || !group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
        <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Awaiting state hydration...</p>
      </div>
    )
  }

  const kickMember = async (targetId) => {
    if (!confirm("Are you sure? This deletes ALL their data and kicks them from the group.")) return
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/kick-member`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester_user_id: user.id, target_user_id: targetId, group_id: group.id }) })
      if (response.ok) { await refreshGroupMembers() } else { alert("Failed to kick member.") }
    } catch (err) { console.error("Kick error:", err) }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/profile')} className="text-zinc-400 flex items-center gap-2 mb-8 hover:text-white transition-colors cursor-pointer w-max bg-zinc-800/80 border border-white/10 px-4 py-2 rounded-xl">
        <ArrowLeft size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Back</span>
      </motion.button>
      
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold font-display tracking-tight mb-1">Manage Group Members</h2>
        <p className="text-zinc-500 text-sm">Group Code: <span className="font-mono text-white font-bold">{group.code}</span></p>
      </div>
      
      <div className="space-y-3">
        {group.members?.map((m) => (
          <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/60 p-4 rounded-2xl flex justify-between items-center border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{m.avatar_text}</div>
              <span className="text-white font-medium font-display text-sm">{m.name} {m.id === user.id && '(You)'}</span>
            </div>
            {m.id !== user.id && (
              <button onClick={() => kickMember(m.id)} className="text-red-500/80 hover:bg-red-500/10 p-3 rounded-xl transition-colors cursor-pointer"><Trash2 size={18} /></button>
            )}
          </motion.div>
        ))}
        {(!group.members || group.members.length === 0) && (
          <div className="text-center py-10">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Loading roster...</p>
          </div>
        )}
      </div>
    </div>
  )
}