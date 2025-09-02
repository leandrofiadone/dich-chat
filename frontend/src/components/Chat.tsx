import {useEffect, useRef, useState} from "react"
import {io, Socket} from "socket.io-client"
import api from "../lib/api"
import {useMe} from "../hooks/useMe"

type Message = {
  id: string
  text: string
  createdAt: string
  user: {id: string; name: string; avatarUrl?: string}
}

export default function Chat() {
  const {user} = useMe()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    api.get("/api/chat/history").then((res) => setMessages(res.data))
  }, [])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {withCredentials: true})
    socketRef.current = socket

    socket.on("connect", () => setIsConnected(true))
    socket.on("disconnect", () => setIsConnected(false))
    socket.on("chat:message", (msg: Message) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const send = () => {
    if (!user) return alert("Inicia sesión para enviar mensajes")
    if (!text.trim()) return
    socketRef.current?.emit("chat:message", {userId: user.id, text})
    setText("")
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div
        className={`px-4 py-2 text-xs text-center flex-shrink-0 ${
          isConnected ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
        }`}>
        {isConnected ? "Conectado" : "Desconectado"}
      </div>

      {/* Messages - AQUÍ ESTÁ EL SCROLL */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-sm">¡Sé el primero en escribir!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => {
              const isOwnMessage = user && m.user.id === user.id
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${
                    isOwnMessage ? "flex-row-reverse" : ""
                  }`}>
                  <img
                    src={m.user.avatarUrl || "https://placehold.co/32"}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div
                    className={`flex flex-col max-w-xs sm:max-w-md ${
                      isOwnMessage ? "items-end" : ""
                    }`}>
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwnMessage ? "bg-black text-white" : "bg-gray-100"
                      }`}>
                      <div
                        className={`text-xs mb-1 ${
                          isOwnMessage ? "text-gray-300" : "text-gray-500"
                        }`}>
                        {isOwnMessage ? "Tú" : m.user.name}
                      </div>
                      <div className="text-sm">{m.text}</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - FIJO EN LA PARTE INFERIOR */}
      <div className="border-t p-4 flex-shrink-0 bg-white">
        {!user ? (
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-3">
              Inicia sesión para chatear
            </p>
            <a
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
              className="inline-block px-4 py-2 bg-black text-white text-sm rounded">
              Entrar
            </a>
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
              maxLength={500}
            />
            <button
              onClick={send}
              disabled={!text.trim() || !isConnected}
              className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50">
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
