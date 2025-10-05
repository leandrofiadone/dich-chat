// frontend/src/pages/ChatView.tsx
import {useEffect, useRef, useState, useCallback} from "react"
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
  participants: User[]
  hasMore?: boolean
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

  // ✨ PAGINACIÓN
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const isInitialLoad = useRef(true)
  const userHasScrolled = useRef(false)

  // ✨ Scroll inteligente: solo al final si es inicial o mensaje nuevo propio
  const scrollToBottom = (force = false) => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150

    // Scroll automático solo si:
    // 1. Es carga inicial (force=true)
    // 2. El usuario está cerca del final
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isInitialLoad.current ? "auto" : "smooth"
      })
    }
  }

  // ✨ Cargar mensajes iniciales
  useEffect(() => {
    if (!user || !conversationId) return

    const loadConversation = async () => {
      try {
        const response = await api.get(
          `/api/conversations/${conversationId}?limit=30`
        )
        setConversation(response.data)
        setMessages(response.data.messages || [])
        setHasMore(response.data.hasMore || false)
        console.log(
          "✅ Conversación cargada:",
          response.data.messages.length,
          "mensajes"
        )

        // Scroll al final solo en carga inicial
        setTimeout(() => {
          scrollToBottom(true)
          isInitialLoad.current = false
        }, 100)
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

  // ✨ Detectar scroll manual del usuario
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      userHasScrolled.current = true
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // ✨ Cargar mensajes antiguos (scroll infinito estilo Twitter)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return

    setLoadingMore(true)
    const oldestMessageId = messages[0].id

    try {
      const response = await api.get(
        `/api/conversations/${conversationId}?limit=20&before=${oldestMessageId}`
      )

      const newMessages = response.data.messages || []
      if (newMessages.length > 0) {
        // Guardar posición del scroll
        const container = messagesContainerRef.current
        const previousScrollHeight = container?.scrollHeight || 0

        setMessages((prev) => [...newMessages, ...prev])
        setHasMore(response.data.hasMore || false)

        // ✨ Mantener posición visual (como Twitter)
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - previousScrollHeight
          }
        }, 0)

        console.log(`✅ Cargados ${newMessages.length} mensajes antiguos`)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("❌ Error cargando más mensajes:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, messages, hasMore, loadingMore])

  // ✨ Detectar scroll hacia arriba (estilo Facebook/Twitter)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop

      // Si está en el tope (primeros 50px), cargar más
      if (scrollTop < 50 && hasMore && !loadingMore) {
        loadMoreMessages()
      }
    }

    // Throttle: ejecutar máximo cada 300ms
    let timeoutId: number | null = null
    const throttledScroll = () => {
      if (timeoutId) return
      timeoutId = window.setTimeout(() => {
        handleScroll()
        timeoutId = null
      }, 300)
    }

    container.addEventListener("scroll", throttledScroll)
    return () => {
      container.removeEventListener("scroll", throttledScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [loadMoreMessages, hasMore, loadingMore])

  // Socket.IO
  useEffect(() => {
    if (!conversationId) return

    const token = localStorage.getItem("auth_token")
    const socket = io(import.meta.env.VITE_API_URL, {
      withCredentials: true,
      auth: {token}
    })
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("✅ Socket conectado")
      setIsConnected(true)
      socket.emit("join-conversation", conversationId)
    })

    socket.on("disconnect", () => {
      console.log("❌ Socket desconectado")
      setIsConnected(false)
    })

    socket.on("direct-message", (message: DirectMessage) => {
      console.log("📨 Mensaje recibido:", message.id)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev
        }
        const updated = [...prev, message]
        // Solo hacer scroll si el mensaje es de otra persona y el usuario está cerca del final
        setTimeout(() => scrollToBottom(), 100)
        return updated
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [conversationId])

  // ✨ Enviar mensaje (optimista)
  const sendMessage = async () => {
    if (!text.trim() || !conversationId || sending) return

    const optimisticMessage: DirectMessage = {
      id: `temp-${Date.now()}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      senderId: user!.id,
      receiverId: conversation!.participantIds.find((id) => id !== user!.id)!,
      sender: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        avatarUrl: user!.avatarUrl
      }
    }

    // Agregar mensaje optimista
    setMessages((prev) => [...prev, optimisticMessage])
    setText("")

    // Scroll automático al enviar mensaje propio
    setTimeout(() => scrollToBottom(true), 50)

    setSending(true)
    try {
      const response = await api.post(
        `/api/conversations/${conversationId}/messages`,
        {text: optimisticMessage.text}
      )

      // Reemplazar mensaje temporal con el real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? response.data : m))
      )

      // Emitir por socket
      socketRef.current?.emit("direct-message", {
        conversationId,
        message: response.data
      })

      console.log("✅ Mensaje enviado:", response.data.id)
    } catch (error) {
      console.error("❌ Error enviando mensaje:", error)
      // Eliminar mensaje fallido
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      alert("Error al enviar el mensaje")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Volver a conversaciones
          </button>
        </div>
      </div>
    )
  }

  const otherUser = conversation.participants.find((p) => p.id !== user?.id)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ✨ Header estilo Facebook/Twitter */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate("/conversations")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
              className="w-9 h-9 rounded-full border-2 border-gray-200"
              alt={otherUser?.name}
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-gray-900 truncate text-sm">
                {otherUser?.name || "Usuario"}
              </h1>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  }`}></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? "Activo" : "Desconectado"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ✨ Mensajes estilo feed de redes sociales */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50"
        style={{scrollBehavior: "smooth"}}>
        <div className="max-w-2xl mx-auto">
          {/* Indicador de "cargar más" en la parte superior */}
          {hasMore && (
            <div className="py-4 text-center sticky top-0 bg-gray-50 z-5">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 text-gray-500 text-sm bg-white px-4 py-2 rounded-full shadow-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  Cargando mensajes...
                </div>
              ) : (
                <button
                  onClick={loadMoreMessages}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all">
                  ↑ Ver mensajes anteriores
                </button>
              )}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-gray-600 text-lg">
                  ¡Inicia la conversación con {otherUser?.name}!
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.senderId === user?.id
                const isOptimistic = msg.id.startsWith("temp-")

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      isOwnMessage ? "flex-row-reverse" : ""
                    } ${isOptimistic ? "opacity-60" : ""}`}>
                    {/* Avatar */}
                    <img
                      src={msg.sender.avatarUrl || "https://placehold.co/40"}
                      className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                      alt={msg.sender.name}
                    />

                    {/* Mensaje */}
                    <div
                      className={`flex flex-col max-w-[70%] ${
                        isOwnMessage ? "items-end" : ""
                      }`}>
                      {/* Nombre y timestamp */}
                      <div
                        className={`flex items-center gap-2 mb-1 px-1 ${
                          isOwnMessage ? "flex-row-reverse" : ""
                        }`}>
                        <span className="text-sm font-semibold text-gray-900">
                          {isOwnMessage ? "Tú" : msg.sender.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Burbuja de mensaje */}
                      <div
                        className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                          isOwnMessage
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-white text-gray-900 rounded-tl-sm border border-gray-200"
                        }`}>
                        <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      </div>

                      {/* Estado de envío */}
                      {isOptimistic && (
                        <span className="text-xs text-gray-400 mt-1 px-1">
                          Enviando...
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ✨ Input estilo redes sociales */}
      <div className="bg-white border-t shadow-lg sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={`Escribe un mensaje...`}
                disabled={sending || !isConnected}
                rows={1}
                className="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50 resize-none max-h-32"
                style={{
                  minHeight: "42px",
                  height: "auto"
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height =
                    Math.min(target.scrollHeight, 128) + "px"
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending || !isConnected}
              className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-md hover:shadow-lg active:scale-95">
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Estado de conexión */}
          {!isConnected && (
            <div className="text-center mt-2">
              <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full">
                Sin conexión • Reconectando...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
