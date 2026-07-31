import { useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

export default function AnimatedNumber({ value, suffix = '', className = '', padTo = 0 }) {
  const safeValue = Number.isFinite(value) ? value : 0

  const motionVal = useMotionValue(safeValue)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20, mass: 0.5 })

  const [display, setDisplay] = useState(Math.round(safeValue))

  useMotionValueEvent(spring, 'change', (latest) => {
    setDisplay(Math.round(Number.isFinite(latest) ? latest : 0))
  })

  useEffect(() => {
    motionVal.set(Number.isFinite(value) ? value : 0)
  }, [value, motionVal])

  const rendered = padTo > 0 ? String(display).padStart(padTo, '0') : display

  return (
    <motion.span className={className}>
      {rendered}{suffix}
    </motion.span>
  )
}