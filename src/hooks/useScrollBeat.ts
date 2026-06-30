import { useEffect, useRef } from 'react'
import { useBeatStore } from '@/stores/beatStore'

const SCROLL_HEIGHT = 5000
const SCENE_START = 0

export function useScrollBeat() {
  const setBeatProgress = useBeatStore((s) => s.setBeatProgress)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const update = () => {
      const scrollY = window.scrollY
      const docH = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.max(0, Math.min(1, (scrollY - SCENE_START) / Math.min(docH, SCROLL_HEIGHT)))
      setBeatProgress(progress)
      rafRef.current = requestAnimationFrame(update)
    }

    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setBeatProgress])
}

export function useReducedMotion() {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}
