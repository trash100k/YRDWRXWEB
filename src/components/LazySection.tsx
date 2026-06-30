import React, { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* LazySection                                                         */
/* Defers below-the-fold sections until they scroll near the viewport. */
/* Reserves space up front so it minimizes layout shift,               */
/* and composes with React.lazy() children via <Suspense>.             */
/* Dependency-free, SSR-safe, inline styles only.                      */
/* ------------------------------------------------------------------ */

type LazySectionProps = {
  children: ReactNode
  minHeight?: number | string
  rootMargin?: string
}

export default function LazySection({
  children,
  minHeight = 1200,
  rootMargin = '600px',
}: LazySectionProps) {
  // If IntersectionObserver is unavailable (SSR / old runtimes), render
  // children immediately so content is never withheld.
  const supportsIO = typeof IntersectionObserver !== 'undefined'
  const [visible, setVisible] = useState<boolean>(!supportsIO)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (visible) return
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  const reserve: CSSProperties = { minHeight }

  if (!visible) {
    return <div ref={sentinelRef} aria-hidden="true" style={reserve} />
  }

  return <React.Suspense fallback={<div style={reserve} />}>{children}</React.Suspense>
}
