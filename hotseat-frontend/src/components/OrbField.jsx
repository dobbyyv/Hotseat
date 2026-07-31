import { useEffect, useRef, useCallback } from 'react'
import { mouse } from '../lib/mousePosition'

const ORB_COUNT = 48
const MIN_RADIUS = 3
const MAX_RADIUS = 6
const MIN_SPEED = 0.50
const MAX_SPEED = 1.6
const GLOW_ALPHA = 0.08
const CORE_ALPHA = 0.18
const DAMPING = 0.997
const WALL_DAMPING = 0.7
const MAX_FLING = 6
const MAX_GLOW_RADIUS = 24

export default function OrbField() {
  const canvasRef = useRef(null)
  const glowRef = useRef(null)
  const orbsRef = useRef([])
  const animRef = useRef(null)
  const dragRef = useRef(null)
  const dimsRef = useRef({ w: 0, h: 0 })

  const resize = useCallback(() => {
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    dimsRef.current = { w, h, dpr }

    const base = canvasRef.current
    if (base) {
      base.width = w * dpr
      base.height = h * dpr
      base.style.width = `${w}px`
      base.style.height = `${h}px`
    }

    const glow = glowRef.current
    if (glow) {
      glow.width = w * dpr
      glow.height = h * dpr
      glow.style.width = `${w}px`
      glow.style.height = `${h}px`
    }
  }, [])

  const spawnOrbs = useCallback(() => {
    const { w, h } = dimsRef.current
    const orbs = []
    const rand = (min, max) => min + Math.random() * (max - min)
    for (let i = 0; i < ORB_COUNT; i++) {
      const r = rand(MIN_RADIUS, MAX_RADIUS)
      orbs.push({
        x: rand(r * 2, w - r * 2),
        y: rand(r * 2, h - r * 2),
        vx: (Math.random() - 0.5) * MAX_SPEED * 2,
        vy: (Math.random() - 0.5) * MAX_SPEED * 2,
        r,
        hue: rand(200, 260),
      })
    }
    orbsRef.current = orbs
  }, [])

  const collideParticles = (a, b) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = a.r + b.r
    if (dist === 0 || dist >= minDist) return

    const nx = dx / dist
    const ny = dy / dist
    const tx = -ny
    const ty = nx

    const v1n = a.vx * nx + a.vy * ny
    const v1t = a.vx * tx + a.vy * ty
    const v2n = b.vx * nx + b.vy * ny
    const v2t = b.vx * tx + b.vy * ty

    a.vx = v2n * nx + v1t * tx
    a.vy = v2n * ny + v1t * ty
    b.vx = v1n * nx + v2t * tx
    b.vy = v1n * ny + v2t * ty

    const overlap = minDist - dist
    const pushX = nx * overlap * 0.55
    const pushY = ny * overlap * 0.55
    a.x -= pushX
    a.y -= pushY
    b.x += pushX
    b.y += pushY
  }

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    const glowCanvas = glowRef.current
    if (!canvas || !glowCanvas) return
    const ctx = canvas.getContext('2d')
    const gctx = glowCanvas.getContext('2d')
    const { w, h, dpr } = dimsRef.current
    const orbs = orbsRef.current
    const dragging = dragRef.current

    ctx.clearRect(0, 0, w * dpr, h * dpr)
    ctx.scale(dpr, dpr)

    gctx.clearRect(0, 0, w * dpr, h * dpr)
    gctx.scale(dpr, dpr)

    for (let i = 0; i < orbs.length; i++) {
      if (dragging && dragging.index === i) continue
      const o = orbs[i]

      if (o.x - o.r <= 0) { o.x = o.r; o.vx = Math.abs(o.vx) * WALL_DAMPING }
      if (o.x + o.r >= w) { o.x = w - o.r; o.vx = -Math.abs(o.vx) * WALL_DAMPING }
      if (o.y - o.r <= 0) { o.y = o.r; o.vy = Math.abs(o.vy) * WALL_DAMPING }
      if (o.y + o.r >= h) { o.y = h - o.r; o.vy = -Math.abs(o.vy) * WALL_DAMPING }

      o.vx *= DAMPING
      o.vy *= DAMPING
      if (Math.abs(o.vx) < MIN_SPEED * 0.1) o.vx = (Math.random() - 0.5) * MIN_SPEED
      if (Math.abs(o.vy) < MIN_SPEED * 0.1) o.vy = (Math.random() - 0.5) * MIN_SPEED

      o.x += o.vx
      o.y += o.vy
    }

    for (let i = 0; i < orbs.length; i++) {
      if (dragging && dragging.index === i) continue
      for (let j = i + 1; j < orbs.length; j++) {
        if (dragging && dragging.index === j) continue
        collideParticles(orbs[i], orbs[j])
      }
    }

    if (dragging) {
      const rect = canvas.getBoundingClientRect()
      const x = mouse.clientX - rect.left
      const y = mouse.clientY - rect.top
      const o = orbs[dragging.index]
      o.x = x + dragging.offsetX
      o.y = y + dragging.offsetY
      if (o.x < o.r) o.x = o.r
      if (o.x > w - o.r) o.x = w - o.r
      if (o.y < o.r) o.y = o.r
      if (o.y > h - o.r) o.y = h - o.r
    }

    for (const o of orbs) {
      const isDragged = dragging && orbs.indexOf(o) === dragging.index

      const glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3)
      glow.addColorStop(0, `hsla(${o.hue}, 60%, 80%, ${GLOW_ALPHA})`)
      glow.addColorStop(0.5, `hsla(${o.hue}, 50%, 70%, ${GLOW_ALPHA * 0.3})`)
      glow.addColorStop(1, 'hsla(0, 0%, 100%, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(o.x, o.y, o.r * 3, 0, Math.PI * 2)
      ctx.fill()

      const core = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r)
      core.addColorStop(0, `hsla(${o.hue}, 30%, 95%, ${isDragged ? 0.5 : CORE_ALPHA})`)
      core.addColorStop(0.6, `hsla(${o.hue}, 40%, 85%, ${CORE_ALPHA * 0.5})`)
      core.addColorStop(1, 'hsla(0, 0%, 100%, 0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2)
      ctx.fill()

      const glowRadius = Math.min(o.r * 2.5, MAX_GLOW_RADIUS)
      const surfaceGlow = gctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, glowRadius)
      surfaceGlow.addColorStop(0, `hsla(${o.hue}, 55%, 85%, 0.18)`)
      surfaceGlow.addColorStop(0.4, `hsla(${o.hue}, 50%, 80%, 0.08)`)
      surfaceGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      gctx.fillStyle = surfaceGlow
      gctx.beginPath()
      gctx.arc(o.x, o.y, glowRadius, 0, Math.PI * 2)
      gctx.fill()
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    gctx.setTransform(1, 0, 0, 1, 0, 0)
    animRef.current = requestAnimationFrame(loop)
  }, [])

  const canvasCoords = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: mouse.clientX - rect.left, y: mouse.clientY - rect.top }
  }, [])

  const findOrbAt = useCallback((px, py) => {
    const orbs = orbsRef.current
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]
      const dx = px - o.x
      const dy = py - o.y
      if (Math.sqrt(dx * dx + dy * dy) <= o.r * 3) return i
    }
    return -1
  }, [])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    const { x, y } = canvasCoords()
    const idx = findOrbAt(x, y)
    if (idx === -1) return
    const o = orbsRef.current[idx]
    dragRef.current = {
      index: idx,
      offsetX: o.x - x,
      offsetY: o.y - y,
      trail: [],
    }
  }, [canvasCoords, findOrbAt])

  const handlePointerUp = useCallback(() => {
    const dragging = dragRef.current
    if (!dragging) return
    dragRef.current = null
    const o = orbsRef.current[dragging.index]
    if (o) {
      const speed = Math.sqrt(o.vx * o.vx + o.vy * o.vy)
      if (speed < 0.3) {
        o.vx = (Math.random() - 0.5) * MIN_SPEED
        o.vy = (Math.random() - 0.5) * MIN_SPEED
      }
    }
  }, [])

  useEffect(() => {
    resize()
    spawnOrbs()
    animRef.current = requestAnimationFrame(loop)

    const canvas = canvasRef.current
    if (!canvas) return

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    window.addEventListener('resize', resize)

    if (!isTouchDevice) {
      canvas.addEventListener('mousedown', handlePointerDown)
      window.addEventListener('mouseup', handlePointerUp)
      canvas.addEventListener('touchstart', handlePointerDown, { passive: false })
      window.addEventListener('touchend', handlePointerUp)
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      if (!isTouchDevice) {
        canvas.removeEventListener('mousedown', handlePointerDown)
        window.removeEventListener('mouseup', handlePointerUp)
        canvas.removeEventListener('touchstart', handlePointerDown)
        window.removeEventListener('touchend', handlePointerUp)
      }
    }
  }, [resize, spawnOrbs, loop, handlePointerDown, handlePointerUp])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none md:pointer-events-auto"
        style={{ touchAction: 'none' }}
        aria-hidden="true"
      />
      <canvas
        ref={glowRef}
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ mixBlendMode: 'screen', touchAction: 'none' }}
        aria-hidden="true"
      />
    </>
  )
}