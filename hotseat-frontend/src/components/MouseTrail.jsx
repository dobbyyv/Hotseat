import { useEffect, useRef } from 'react'
import { mouse } from '../lib/mousePosition'

const TRAIL_LENGTH = 30

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
        p.life -= 0.03
        if (p.life <= 0) {
          pts.splice(i, 1)
          continue
        }
        p.x += (Math.random() - 0.5) * 0.6
        p.y += (Math.random() - 0.5) * 0.6
      }

      if (pts.length > 1) {
        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1]
          const curr = pts[i]
          const alpha = curr.life * 0.4
          const width = curr.life * 2.5

          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(curr.x, curr.y)
          ctx.strokeStyle = `rgba(180, 180, 190, ${alpha})`
          ctx.lineWidth = width
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.shadowColor = `rgba(200, 200, 210, ${alpha * 0.6})`
          ctx.shadowBlur = 8
          ctx.stroke()
        }

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0

        const head = pts[pts.length - 1]
        const headAlpha = head.life * 0.55
        ctx.beginPath()
        ctx.arc(head.x, head.y, head.life * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210, 210, 220, ${headAlpha})`
        ctx.shadowColor = `rgba(220, 220, 235, ${headAlpha * 0.5})`
        ctx.shadowBlur = 10
        ctx.fill()
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