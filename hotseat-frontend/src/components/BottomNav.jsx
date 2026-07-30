import { useNavigate, useLocation } from 'react-router-dom'
import { Home, MessageSquare, User, BarChart2, LayoutGrid, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import useSFX from '../useSFX'

const MAPPING = {
  '/hub':     'hub',
  '/home':    'home',
  '/results': 'results',
  '/info':    'info',
  '/profile': 'profile',
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearActiveGroup, group } = useStore()
  const playSFX = useSFX()

  const active = MAPPING[location.pathname] || null

  const tabs = [
    { id: 'hub',     icon: LayoutGrid,    label: 'Groups',  path: '/hub',     requiresGroup: false },
    { id: 'home',    icon: Home,          label: 'Today',   path: '/home',    requiresGroup: true  },
    { id: 'results', icon: MessageSquare, label: 'Chat',    path: '/results', requiresGroup: true  },
    { id: 'info',    icon: BarChart2,     label: 'Stats',   path: '/info',    requiresGroup: true  },
    { id: 'profile', icon: User,          label: 'Profile', path: '/profile', requiresGroup: false },
  ]

  const handleNavigation = (tab) => {
    if (tab.requiresGroup && !group) {
      playSFX('error')
      return
    }
    playSFX('woosh')
    if (tab.id === 'hub') {
      clearActiveGroup()
      navigate('/hub')
    } else {
      navigate(tab.path)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-1">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = active === tab.id
        const isLocked = tab.requiresGroup && !group

        return (
          <motion.button
            key={tab.id}
            onClick={() => handleNavigation(tab)}
            whileHover={{ scale: isLocked ? 1 : 1.05 }}
            whileTap={{ scale: isLocked ? 1 : 0.92 }}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-full transition-colors duration-200 ${
              isLocked ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            {/* Active pill background with layoutId for smooth sliding */}
            {isActive && !isLocked && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white/10 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            <Icon
              size={18}
              className={`relative z-10 ${isActive && !isLocked ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            />

            {isActive && !isLocked && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                className="relative z-10 text-xs font-semibold text-white whitespace-nowrap overflow-hidden"
              >
                {tab.label}
              </motion.span>
            )}

            {isLocked && (
              <Lock size={10} className="absolute -top-0.5 -right-0.5 text-zinc-600" />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}