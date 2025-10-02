import {useEffect, useRef, useState} from "react"
import {useParams, useNavigate} from "react-router-dom"
import {useMe} from "../hooks/useMe"
import api from "../lib/api"
import {io, Socket} from "socket.io-client"

type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

type DirectMessage = {
  id: string
  text: string
  createdAt: string
  sender: User
  senderId: string
  receiverId: string
}

type Conversation = {
  id: string
  participantIds: string[]
  messages: DirectMessage[]
  participants: User[]
}

export default function ChatView() {
  const {conversationId} = useParams<{conversationId: string}>()
  const {user} = useMe()
  const navigate = useNavigate()

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  // Scroll automático al final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cargar conversación y mensajes
  useEffect(() => {
    if (!user || !conversationId) return

    const loadConversation = async () => {
      try {
        const response = await api.get(`/api/conversations/${conversationId}`)
        setConversation(response.data)
        setMessages(response.data.messages || [])
        console.log("✅ Conversación cargada:", response.data)
      } catch (error: any) {
        console.error("❌ Error cargando conversación:", error)
        if (error.response?.status === 403 || error.response?.status === 404) {
          alert("No tienes acceso a esta conversación")
          navigate("/conversations")
        }
      } finally {
        setLoading(false)
      }
    }

    loadConversation()
  }, [user, conversationId, navigate])

  // Socket.IO para mensajes en tiempo real
  useEffect(() => {
    if (!conversationId) return

    // ✨ Enviar token al conectarse
    const token = localStorage.getItem("auth_token")
    const socket = io(import.meta.env.VITE_API_URL, {
      withCredentials: true,
      auth: {
        token: token // ⭐ Token JWT para autenticación
      }
    })
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("✅ Socket conectado")
      setIsConnected(true)
      // Unirse a la room de esta conversación
      socket.emit("join-conversation", conversationId)
    })

    socket.on("disconnect", () => {
      console.log("❌ Socket desconectado")
      setIsConnected(false)
    })

    // Escuchar mensajes nuevos (con deduplicación)
    socket.on("direct-message", (message: DirectMessage) => {
      console.log("📨 Mensaje recibido:", message)
      setMessages((prev) => {
        // ✅ Evitar duplicados: si ya existe, no agregarlo
        if (prev.some((m) => m.id === message.id)) {
          console.log("⚠️ Mensaje duplicado ignorado:", message.id)
          return prev
        }
        return [...prev, message]
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [conversationId])

  // Enviar mensaje
  const sendMessage = async () => {
    if (!text.trim() || !conversationId || sending) return

    setSending(true)
    try {
      const response = await api.post(
        `/api/conversations/${conversationId}/messages`,
        {text: text.trim()}
      )

      console.log("✅ Mensaje enviado:", response.data)

      // Agregar mensaje localmente (optimistic update)
      setMessages((prev) => [...prev, response.data])

      // Emitir por socket para que el otro usuario lo reciba
      socketRef.current?.emit("direct-message", {
        conversationId,
        message: response.data
      })

      setText("")
    } catch (error) {
      console.error("❌ Error enviando mensaje:", error)
      alert("Error al enviar el mensaje")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando conversación...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Conversación no encontrada
          </h1>
          <button
            onClick={() => navigate("/conversations")}
            className="px-6 py-3 bg-black text-white rounded-lg">
            Volver a conversaciones
          </button>
        </div>
      </div>
    )
  }

  // Obtener el otro usuario (no el actual)
  const otherUser = conversation.participants.find((p) => p.id !== user?.id)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header del chat */}
      <header className="bg-white border-b h-16 flex-shrink-0">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/conversations")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <img
              src={otherUser?.avatarUrl || "https://placehold.co/40"}
              className="w-10 h-10 rounded-full"
              alt={otherUser?.name}
            />
            <div>
              <h1 className="font-semibold text-gray-900">
                {otherUser?.name || "Usuario"}
              </h1>
              <p className="text-xs text-gray-500">{otherUser?.email}</p>
            </div>
          </div>

          {/* Indicador de conexión */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}></div>
            <span className="text-xs text-gray-600">
              {isConnected ? "En línea" : "Desconectado"}
            </span>
          </div>
        </div>
      </header>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-gray-600">
                ¡Inicia la conversación con {otherUser?.name}!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((msg) => {
              const isOwnMessage = msg.senderId === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    isOwnMessage ? "flex-row-reverse" : ""
                  }`}>
                  <img
                    src={msg.sender.avatarUrl || "https://placehold.co/32"}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    alt={msg.sender.name}
                  />
                  <div
                    className={`flex flex-col max-w-xs sm:max-w-md ${
                      isOwnMessage ? "items-end" : ""
                    }`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200"
                      }`}>
                      <p className="text-sm break-words">{msg.text}</p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input de mensaje */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={`Mensaje para ${otherUser?.name}...`}
            disabled={sending || !isConnected}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            maxLength={1000}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending || !isConnected}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {sending ? "..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  )
}
