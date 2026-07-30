import { useState, useCallback } from 'react'

/**
 * SpatialContainer — wraps route content in a glass card with
 * hardware-accelerated CSS perspective tilt driven by mouse position.
 * No WebGL, no portals — pure CSS transforms for crisp rendering.
 */
export default function SpatialContainer({ children }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    const x = (e.clientX / window.innerWidth - 0.5)  // -0.5 .. +0.5
    const y = (e.clientY / window.innerHeight - 0.5) // -0.5 .. +0.5
    setTilt({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
  }, [])

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative z-10 min-h-screen flex items-center justify-center pointer-events-auto"
    >
      <div
        className="bg-zinc-950/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl p-8 max-w-xl w-full min-w-[360px] transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(calc(${tilt.y} * 5deg)) rotateY(calc(${tilt.x} * 5deg))`,
        }}
      >
        {children}
      </div>
    </div>
  )
}