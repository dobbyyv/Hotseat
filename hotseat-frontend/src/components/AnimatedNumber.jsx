import { useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

/**
 * AnimatedNumber — smoothly interpolates between numeric values
 * creating a premium odometer/count-up effect.
 *
 * Uses useMotionValueEvent to sync the spring's animated value into React state
 * (a plain number). This prevents a raw Framer Motion MotionValue object from
 * ever leaking as a React child, which causes React error #31.
 */
export default function AnimatedNumber({ value, suffix = '', className = '' }) {
  // Safe default — prevents NaN/undefined from crashing Framer Motion
  const safeValue = Number.isFinite(value) ? value : 0

  const motionVal = useMotionValue(safeValue)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20, mass: 0.5 })

  // Pull the animated value into plain React state so we render a number,
  // never a MotionValue object.
  const [display, setDisplay] = useState(Math.round(safeValue))

  useMotionValueEvent(spring, 'change', (latest) => {
    setDisplay(Math.round(Number.isFinite(latest) ? latest : 0))
  })

  useEffect(() => {
    motionVal.set(Number.isFinite(value) ? value : 0)
  }, [value, motionVal])

  return (
    <motion.span className={className}>
      {display}{suffix}
    </motion.span>
  )
}
