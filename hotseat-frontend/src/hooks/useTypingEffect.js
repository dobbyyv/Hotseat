import { useState, useEffect } from 'react'

/**
 * Custom hook that creates a typewriter animation effect.
 * @param {string} text - The full text to reveal character by character.
 * @param {number} speed - Milliseconds per character (default 50).
 * @param {boolean} enabled - Whether the animation should run (default true).
 * @returns {{ displayed: string, isTyping: boolean }} - The progressively revealed text and typing state.
 */
export default function useTypingEffect(text, speed = 50, enabled = true) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text || '')
      setIsTyping(false)
      return
    }

    setDisplayed('')
    setIsTyping(true)
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.substring(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        setIsTyping(false)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed, enabled])

  return { displayed, isTyping }
}
