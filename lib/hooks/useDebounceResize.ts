import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Debounced resize hook that prevents forced reflows by:
 * 1. Debouncing resize events to reduce frequency
 * 2. Using requestAnimationFrame to batch DOM reads
 * 3. Providing cleanup to prevent memory leaks
 */
export function useDebounceResize(
  callback: () => void,
  delay: number = 100,
  immediate: boolean = true
) {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const debouncedCallback = () => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Clear any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      // Debounce the resize event
      timeoutRef.current = setTimeout(() => {
        // Use RAF to batch DOM reads and avoid forced reflows
        rafRef.current = requestAnimationFrame(() => {
          callbackRef.current()
          rafRef.current = null
        })
        timeoutRef.current = null
      }, delay)
    }

    // Call immediately if requested
    if (immediate) {
      callbackRef.current()
    }

    window.addEventListener('resize', debouncedCallback)

    return () => {
      window.removeEventListener('resize', debouncedCallback)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [delay, immediate])
}

/**
 * Hook for mobile detection with debounced resize handling
 */
export function useMobileDetection(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false)

  const checkMobile = useCallback(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < breakpoint)
    }
  }, [breakpoint])

  useDebounceResize(checkMobile, 100, true)

  return isMobile
}

/**
 * Hook for media query detection with debounced resize handling
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    const updateMatches = () => setMatches(mediaQuery.matches)
    
    // Set initial value
    updateMatches()
    
    // Use the modern addEventListener API
    mediaQuery.addEventListener('change', updateMatches)
    
    return () => mediaQuery.removeEventListener('change', updateMatches)
  }, [query])

  return matches
}
