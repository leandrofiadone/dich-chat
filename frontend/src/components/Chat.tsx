import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import api from '../lib/api'
import { useMe } from '../hooks/useMe'

type Message = {
  id: string
  text: string
  createdAt: string
  user: { id: string, name: string, avatarUrl?: string }
}

export default function Chat() {
  const { user } = useMe()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    api.get('/api/chat/history').then(res => setMessages(res.data))
  }, [])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true })
    socketRef.current = socket
    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => [...prev, msg])
    })
    return () => { socket.disconnect() }
  }, [])

  const send = () => {
    if (!user) return alert('Inicia sesión para enviar mensajes')
    if (!text.trim()) return
    socketRef.current?.emit('chat:message', { userId: user.id, text })
    setText('')
  }

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-2xl shadow p-4">
      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {messages.map(m => (
          <div key={m.id} className="flex items-start gap-2">
            <img src={m.user.avatarUrl || 'https://placehold.co/40'} className="w-8 h-8 rounded-full" />
            <div className="bg-slate-100 rounded-xl px-3 py-2">
              <div className="text-xs text-slate-500">{m.user.name}</div>
              <div className="text-sm">{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button onClick={send} className="px-4 py-2 rounded-lg bg-black text-white">Enviar</button>
      </div>
    </div>
  )
}
