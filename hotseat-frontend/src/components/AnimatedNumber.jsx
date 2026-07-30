import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

/**
 * AnimatedNumber — smoothly interpolates between numeric values
 * creating a premium odometer/count-up effect.
 */
export default function AnimatedNumber({ value, suffix = '', className = '' }) {
  // Safe default — prevents NaN/undefined from crashing Framer Motion
  const safeValue = Number.isFinite(value) ? value : 0

  const motionVal = useMotionValue(safeValue)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20, mass: 0.5 })
  const rounded = useTransform(spring, (v) => Math.round(Number.isFinite(v) ? v : 0))

  useEffect(() => {
    motionVal.set(Number.isFinite(value) ? value : 0)
  }, [value, motionVal])

  return (
    <motion.span className={className}>
      {rounded}{suffix}
    </motion.span>
  )
}