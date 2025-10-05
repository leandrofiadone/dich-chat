import {useEffect, useRef, useState, useCallback} from "react"
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)

  const socketRef = useRef<Socket | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ✨ Cargar mensajes iniciales (más recientes)
  useEffect(() => {
    const loadInitialMessages = async () => {
      try {
        const response = await api.get("/api/chat/history")
        const allMessages = response.data as Message[]

        // Tomar solo los últimos 30 mensajes
        const recentMessages = allMessages.slice(-30)
        setMessages(recentMessages)
        setHasMore(allMessages.length > 30)

        console.log(`📨 Cargados ${recentMessages.length} mensajes iniciales`)
      } catch (error) {
        console.error("❌ Error cargando historial:", error)
      } finally {
        setInitialLoad(false)
      }
    }

    loadInitialMessages()
  }, [])

  // ✨ Cargar mensajes antiguos (lazy loading hacia arriba)
  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return

    setLoadingMore(true)
    const oldestMessageId = messages[0].id

    try {
      const response = await api.get("/api/chat/history")
      const allMessages = response.data as Message[]

      // Encontrar el índice del mensaje más antiguo actual
      const oldestIndex = allMessages.findIndex((m) => m.id === oldestMessageId)

      if (oldestIndex > 0) {
        // Cargar 20 mensajes anteriores
        const olderMessages = allMessages.slice(
          Math.max(0, oldestIndex - 20),
          oldestIndex
        )

        if (olderMessages.length > 0) {
          // Guardar posición del scroll
          const container = messagesContainerRef.current
          const previousScrollHeight = container?.scrollHeight || 0

          setMessages((prev) => [...olderMessages, ...prev])
          setHasMore(oldestIndex > 20)

          // ✨ Mantener posición visual (evitar "salto")
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight
              container.scrollTop = newScrollHeight - previousScrollHeight
            }
          }, 0)

          console.log(`✅ Cargados ${olderMessages.length} mensajes antiguos`)
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("❌ Error cargando mensajes antiguos:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [messages, hasMore, loadingMore])

  // ✨ Detectar scroll hacia arriba
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop

      // Si está en el tope (primeros 100px), cargar más
      if (scrollTop < 100 && hasMore && !loadingMore) {
        loadOlderMessages()
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
  }, [loadOlderMessages, hasMore, loadingMore])

  // Socket.IO
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const socket = io(import.meta.env.VITE_API_URL, {
      withCredentials: true,
      auth: {token}
    })
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("✅ Socket conectado al muro público")
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("❌ Socket desconectado")
      setIsConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("❌ Error de conexión:", error.message)
      setIsConnected(false)
    })

    socket.on("chat:message", (msg: Message) => {
      setMessages((prev) => {
        // Evitar duplicados
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // ✨ Enviar mensaje
  const send = () => {
    if (!user) return alert("Inicia sesión para publicar")
    if (!text.trim()) return

    socketRef.current?.emit("chat:message", {text: text.trim()})
    setText("")

    // Reset altura del textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Ahora"
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays === 1) return "Ayer"
    if (diffDays < 7) return `Hace ${diffDays}d`

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short"
    })
  }

  if (initialLoad) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Cargando mensajes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ✨ Header con estado de conexión */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Muro Público</h1>
            <p className="text-xs text-gray-500">
              {messages.length} {messages.length === 1 ? "mensaje" : "mensajes"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}></div>
            <span className="text-xs text-gray-600">
              {isConnected ? "En vivo" : "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      {/* ✨ Feed de mensajes estilo Twitter/Facebook */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        style={{scrollBehavior: "smooth"}}>
        <div className="max-w-2xl mx-auto">
          {/* Indicador de carga superior */}
          {hasMore && (
            <div className="py-4 text-center sticky top-0 bg-gray-50 z-10">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 text-gray-500 text-sm bg-white px-4 py-2 rounded-full shadow-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  Cargando mensajes anteriores...
                </div>
              ) : (
                <button
                  onClick={loadOlderMessages}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all">
                  ↑ Ver mensajes anteriores
                </button>
              )}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ¡Sé el primero en publicar!
              </h2>
              <p className="text-gray-600 text-center max-w-sm">
                Comparte tus pensamientos con la comunidad
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((m) => {
                const isOwnMessage = user && m.user.id === user.id
                return (
                  <article
                    key={m.id}
                    className="bg-white hover:bg-gray-50 transition-colors px-4 py-4">
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <img
                        src={m.user.avatarUrl || "https://placehold.co/48"}
                        className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-gray-100"
                        alt={m.user.name}
                      />

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        {/* Header del post */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-semibold text-gray-900 text-sm truncate ${
                              isOwnMessage ? "text-blue-600" : ""
                            }`}>
                            {isOwnMessage ? "Tú" : m.user.name}
                          </span>
                          <span className="text-gray-400 text-sm">·</span>
                          <time className="text-gray-500 text-sm flex-shrink-0">
                            {formatTime(m.createdAt)}
                          </time>
                        </div>

                        {/* Mensaje */}
                        <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {m.text}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✨ Composer estilo Twitter/Facebook */}
      <div className="bg-white border-t shadow-lg flex-shrink-0 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {!user ? (
            <div className="text-center py-2">
              <p className="text-gray-600 text-sm mb-3">
                Inicia sesión para participar en la conversación
              </p>
              <a
                href={`${import.meta.env.VITE_API_URL}/auth/google`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Iniciar sesión
              </a>
            </div>
          ) : (
            <div className="flex gap-3">
              {/* Avatar del usuario */}
              <img
                src={user.avatarUrl || "https://placehold.co/40"}
                className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-gray-200"
                alt={user.name}
              />

              {/* Input expandible */}
              <div className="flex-1 flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="¿Qué estás pensando?"
                  disabled={!isConnected}
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50 resize-none text-sm"
                  style={{
                    minHeight: "42px",
                    maxHeight: "120px"
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = "auto"
                    target.style.height =
                      Math.min(target.scrollHeight, 120) + "px"
                  }}
                  maxLength={500}
                />

                {/* Botón de envío */}
                <button
                  onClick={send}
                  disabled={!text.trim() || !isConnected}
                  className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-md hover:shadow-lg active:scale-95"
                  title="Publicar (Enter)">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Contador de caracteres */}
          {user && text.length > 400 && (
            <div className="text-right mt-2">
              <span
                className={`text-xs ${
                  text.length > 480
                    ? "text-red-600 font-semibold"
                    : "text-gray-500"
                }`}>
                {text.length}/500
              </span>
            </div>
          )}

          {/* Estado sin conexión */}
          {!isConnected && user && (
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
