import { useEffect, useRef, useCallback, useState } from 'react'

export default function useWebSocket(onMessage) {
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    const token = encodeURIComponent(localStorage.getItem('workspaceToken') || '')
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const wsBase = apiUrl
      ? apiUrl.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    const ws = new WebSocket(`${wsBase}/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        onMessageRef.current(payload)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return connected
}
