import { useEffect } from 'react'

// covers reload, tab close, and the address bar while the canvas is dirty
export const useBeforeUnloadGuard = (dirty: boolean): void => {
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
