import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

/**
 * AnimatedNumber — smoothly interpolates between numeric values
 * creating a premium odometer/count-up effect.
 */
export default function AnimatedNumber({ value, suffix = '', className = '' }) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20, mass: 0.5 })
  const rounded = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    motionVal.set(value)
  }, [value, motionVal])

  return (
    <motion.span className={className}>
      {rounded}{suffix}
    </motion.span>
  )
}