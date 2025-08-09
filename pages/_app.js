import 'semantic-ui-css/semantic.min.css'
import '../styles/globals.css'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

function MyApp({ Component, pageProps }) {
  const [theme, setTheme] = useState('light')

  // Initialize theme on mount (avoids SSR mismatch issues)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      const preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      setTheme(preferred)
      document.documentElement.setAttribute('data-theme', preferred)
    } catch {}
  }, [])

  const applyTheme = useCallback((next) => {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, applyTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Component {...pageProps} />
    </ThemeContext.Provider>
  )
}

export default MyApp
