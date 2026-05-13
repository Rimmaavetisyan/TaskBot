import { useState } from 'react'

function genToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function useWorkspace() {
  const [token, setTokenState] = useState(() => {
    let t = localStorage.getItem('workspaceToken')
    if (!t) { t = genToken(); localStorage.setItem('workspaceToken', t) }
    return t
  })

  const setToken = (newToken) => {
    const t = newToken.trim()
    if (!t) return
    localStorage.setItem('workspaceToken', t)
    setTokenState(t)
    window.location.reload()
  }

  return [token, setToken]
}
