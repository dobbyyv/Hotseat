import { useNavigate } from 'react-router-dom'
import { Home, MessageSquare, User, BarChart2, LayoutGrid, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import useSFX from '../useSFX'

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const { clearActiveGroup, group } = useStore()
  const playSFX = useSFX()

  const tabs = [
    { id: 'hub', icon: LayoutGrid, label: 'Groups', path: '/hub', requiresGroup: false },
    { id: 'home', icon: Home, label: 'Today', path: '/home', requiresGroup: true },
    { id: 'results', icon: MessageSquare, label: 'Results', path: '/results', requiresGroup: true },
    { id: 'info', icon: BarChart2, label: 'Stats', path: '/info', requiresGroup: true },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile', requiresGroup: false }
  ]

  const handleNavigation = (tab) => {
    // 🛑 Block navigation if the tab requires a group but we are in the Hub
    if (tab.requiresGroup && !group) {
      playSFX('error'); // Play an error/thud sound if you have one
      return;
    }

    playSFX('click');
    
    if (tab.id === 'hub') {
      clearActiveGroup();
      navigate('/hub');
    } else {
      navigate(tab.path);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0D0D14]/95 backdrop-blur-xl border-t border-[#1F1F2E] px-4 py-4 flex justify-between items-center z-50">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = active === tab.id
        const isLocked = tab.requiresGroup && !group
        
        return (
          <button 
            key={tab.id} 
            onClick={() => handleNavigation(tab)} 
            className={`flex flex-col items-center gap-1 relative flex-1 transition-all ${isLocked ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}`}
          >
            {isActive && !isLocked && (
              <motion.div 
                layoutId="nav-dot" 
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" 
              />
            )}
            
            <div className="relative">
              <Icon size={22} className={isActive ? 'text-violet-400' : 'text-[#3A3A4A] hover:text-gray-400'} />
              {isLocked && (
                <div className="absolute -bottom-1 -right-2 bg-black rounded-full border border-[#1F1F2E]">
                  <Lock size={10} className="text-gray-500" />
                </div>
              )}
            </div>
            
            <span className={`text-[10px] sm:text-xs font-medium ${isActive && !isLocked ? 'text-violet-400' : 'text-[#3A3A4A]'}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}