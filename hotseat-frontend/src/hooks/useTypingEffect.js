import { useState, useEffect } from 'react'

/**
 * Custom hook that creates a typewriter animation effect.
 * @param {string} text - The full text to reveal character by character.
 * @param {number} speed - Milliseconds per character (default 50).
 * @param {boolean} enabled - Whether the animation should run (default true).
 * @returns {string} - The progressively revealed text.
 */
export default function useTypingEffect(text, speed = 50, enabled = true) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text || '')
      return
    }

    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.substring(0, i))
      if (i >= text.length) {
        clearInterval(timer)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed, enabled])

  return displayed
}