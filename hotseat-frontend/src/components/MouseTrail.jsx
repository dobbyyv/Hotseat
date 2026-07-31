import { useEffect, useRef } from 'react'
import { mouse } from '../lib/mousePosition'

const MAX_POINTS = 6

export default function MouseTrail() {
  const canvasRef = useRef(null)
  const pointsRef = useRef([])
  const animRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = () => {
      ctx.clearRect(0, 0, w * dpr, h * dpr)
      ctx.scale(dpr, dpr)

      const pts = pointsRef.current
      const mx = mouse.clientX
      const my = mouse.clientY

      if (mx > 0 && my > 0) {
        pts.push({ x: mx, y: my, life: 1 })
      }

      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i]
        p.life -= 0.14
        if (p.life <= 0) {
          pts.splice(i, 1)
        }
      }

      if (pts.length > MAX_POINTS) {
        pts.splice(0, pts.length - MAX_POINTS)
      }

      if (pts.length > 1) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const headAlpha = pts[pts.length - 1].life * 0.55

        for (let pass = 0; pass < 3; pass++) {
          const passAlpha = headAlpha * (1 - pass * 0.25)
          const passWidth = (4 - pass * 1.2) * pts[pts.length - 1].life

          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)

          for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]
            const curr = pts[i]
            const midX = (prev.x + curr.x) / 2
            const midY = (prev.y + curr.y) / 2
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
          }

          ctx.strokeStyle = `rgba(170, 170, 195, ${passAlpha})`
          ctx.lineWidth = passWidth
          ctx.shadowColor = `rgba(190, 190, 215, ${passAlpha * 0.4})`
          ctx.shadowBlur = 4 + pass * 2
          ctx.stroke()
        }

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[3] pointer-events-none max-md:hidden"
      aria-hidden="true"
    />
  )
}