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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ✨ Cargar mensajes iniciales (más recientes) y scroll al final
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

        // ✨ Scroll al final después de cargar
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({behavior: "auto"})
        }, 100)
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

      const oldestIndex = allMessages.findIndex((m) => m.id === oldestMessageId)

      if (oldestIndex > 0) {
        const olderMessages = allMessages.slice(
          Math.max(0, oldestIndex - 20),
          oldestIndex
        )

        if (olderMessages.length > 0) {
          const container = messagesContainerRef.current
          const previousScrollHeight = container?.scrollHeight || 0

          setMessages((prev) => [...olderMessages, ...prev])
          setHasMore(oldestIndex > 20)

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

      if (scrollTop < 100 && hasMore && !loadingMore) {
        loadOlderMessages()
      }
    }

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
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const send = () => {
    if (!user) return alert("Inicia sesión para publicar")
    if (!text.trim()) return

    socketRef.current?.emit("chat:message", {text: text.trim()})
    setText("")

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
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return "Ayer"
    if (diffDays < 7) return `${diffDays}d`

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short"
    })
  }

  if (initialLoad) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">Cargando feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ✨ Feed principal - Diseño centrado estilo Twitter */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        {/* Container centrado */}
        <div className="max-w-3xl mx-auto bg-white min-h-full border-x border-gray-200">
          {/* Header sticky */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <h1 className="font-bold text-gray-900 text-xl">Inicio</h1>
              </div>
              <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}></div>
                <span className="text-xs font-medium text-green-700">
                  {isConnected ? "En vivo" : "Desconectado"}
                </span>
              </div>
            </div>
          </div>

          {/* ✨ Composer - Siempre visible arriba */}
          {user && (
            <div className="border-b border-gray-200 bg-white sticky top-[57px] z-10">
              <div className="px-4 py-4">
                <div className="flex gap-3">
                  <img
                    src={user.avatarUrl || "https://placehold.co/48"}
                    className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-gray-100"
                    alt={user.name}
                  />

                  <div className="flex-1">
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
                      placeholder="¿Qué está pasando?"
                      disabled={!isConnected}
                      rows={1}
                      className="w-full px-0 py-2 text-gray-900 text-lg placeholder-gray-500 border-0 focus:outline-none focus:ring-0 disabled:opacity-50 resize-none bg-transparent"
                      style={{
                        minHeight: "42px",
                        maxHeight: "200px"
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height =
                          Math.min(target.scrollHeight, 200) + "px"
                      }}
                      maxLength={500}
                    />

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                      <div className="text-xs text-gray-500">
                        {text.length > 0 && (
                          <span
                            className={
                              text.length > 450
                                ? "text-orange-600 font-semibold"
                                : ""
                            }>
                            {text.length}/500
                          </span>
                        )}
                      </div>
                      <button
                        onClick={send}
                        disabled={!text.trim() || !isConnected}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm disabled:shadow-none">
                        Publicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Login prompt */}
          {!user && (
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Únete a la conversación
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Inicia sesión para publicar y conectar con la comunidad
              </p>
              <a
                href={`${import.meta.env.VITE_API_URL}/auth/google`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Iniciar sesión con Google
              </a>
            </div>
          )}

          {/* Indicador de carga superior */}
          {hasMore && messages.length > 0 && (
            <div className="py-4 text-center border-b border-gray-100">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  Cargando anteriores...
                </div>
              ) : (
                <button
                  onClick={loadOlderMessages}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Cargar mensajes anteriores
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenido al feed
              </h2>
              <p className="text-gray-600 text-center max-w-sm">
                Cuando alguien publique, sus mensajes aparecerán aquí
              </p>
            </div>
          ) : (
            /* ✨ Feed de mensajes */
            <div>
              {messages.map((m) => {
                const isOwnMessage = user && m.user.id === user.id
                return (
                  <article
                    key={m.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="px-4 py-3 flex gap-3">
                      {/* Avatar */}
                      <img
                        src={m.user.avatarUrl || "https://placehold.co/48"}
                        className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-gray-100"
                        alt={m.user.name}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`font-bold text-gray-900 text-[15px] hover:underline truncate ${
                              isOwnMessage ? "text-blue-600" : ""
                            }`}>
                            {isOwnMessage ? "Tú" : m.user.name}
                          </span>
                          <span className="text-gray-500 text-sm flex-shrink-0">
                            · {formatTime(m.createdAt)}
                          </span>
                        </div>

                        {/* Message */}
                        <p className="text-gray-900 text-[15px] leading-normal whitespace-pre-wrap break-words">
                          {m.text}
                        </p>

                        {/* Actions (placeholder para futuras interacciones) */}
                        <div className="flex items-center gap-8 mt-3 text-gray-500">
                          <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group">
                            <div className="w-8 h-8 rounded-full group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                            </div>
                          </button>

                          <button className="flex items-center gap-1.5 hover:text-green-600 transition-colors group">
                            <div className="w-8 h-8 rounded-full group-hover:bg-green-50 flex items-center justify-center transition-colors">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </div>
                          </button>

                          <button className="flex items-center gap-1.5 hover:text-pink-600 transition-colors group">
                            <div className="w-8 h-8 rounded-full group-hover:bg-pink-50 flex items-center justify-center transition-colors">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
