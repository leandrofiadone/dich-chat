import {useEffect, useState, useRef} from "react"
import {useNavigate} from "react-router-dom"
import {useMe} from "../hooks/useMe"
import api from "../lib/api"
import Header from "../components/Header"

type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
  bio?: string
}

type Conversation = {
  id: string
  participantIds: string[]
  lastMessageAt: string
  participants: User[]
  messages?: Array<{
    text: string
    createdAt: string
    sender: User
  }>
}

export default function Conversations() {
  const {user, loading: authLoading} = useMe()
  const navigate = useNavigate()

  // Estados principales
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)

  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Estado de creación
  const [creatingWith, setCreatingWith] = useState<string | null>(null)

  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<number>()

  // Cargar conversaciones existentes
  useEffect(() => {
    if (!user) return

    const loadConversations = async () => {
      try {
        const response = await api.get("/api/conversations")
        setConversations(response.data)
        console.log("✅ Conversaciones cargadas:", response.data.length)
      } catch (error) {
        console.error("Error cargando conversaciones:", error)
      } finally {
        setLoadingConvs(false)
      }
    }

    loadConversations()
  }, [user])

  // Búsqueda con debounce
  useEffect(() => {
    // Limpiar timeout anterior
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
    }

    // Si no hay query, limpiar resultados
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    // Buscar después de 300ms
    setSearching(true)
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const response = await api.get(`/api/users/search?q=${searchQuery}`)
        setSearchResults(response.data)
        setShowSearchDropdown(true)
        console.log(`🔍 Encontrados ${response.data.length} usuarios`)
      } catch (error) {
        console.error("Error buscando usuarios:", error)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Crear o abrir conversación
  const startConversation = async (otherUser: User) => {
    setCreatingWith(otherUser.id)
    setShowSearchDropdown(false)
    setSearchQuery("")

    try {
      const response = await api.post("/api/conversations", {
        userId: otherUser.id
      })

      console.log("✅ Conversación lista:", response.data)

      // Si es nueva, agregarla a la lista
      if (
        response.data.isNew &&
        !conversations.find((c) => c.id === response.data.conversation.id)
      ) {
        const newConv: Conversation = {
          id: response.data.conversation.id,
          participantIds: response.data.conversation.participantIds,
          lastMessageAt: response.data.conversation.lastMessageAt,
          participants: response.data.participants,
          messages: []
        }
        setConversations((prev) => [newConv, ...prev])
      }

      // Navegar al chat
      navigate(`/chat/${response.data.conversation.id}`)
    } catch (error: any) {
      console.error("Error creando conversación:", error)
      alert(
        error.response?.data?.message ||
          "No se pudo crear la conversación. Intenta de nuevo."
      )
    } finally {
      setCreatingWith(null)
    }
  }

  // Formatear timestamp relativo
  const formatRelativeTime = (dateString: string) => {
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
    return date.toLocaleDateString("es-ES", {day: "2-digit", month: "short"})
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-6">💬</div>
            <h1 className="text-2xl font-bold mb-4 text-gray-900">
              Inicia sesión para ver tus mensajes
            </h1>
            <p className="text-gray-600 mb-8">
              Conecta con otros usuarios y mantén conversaciones privadas
            </p>
            <a
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
              Iniciar sesión con Google
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto p-4">
        {/* Header de página */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
          <p className="text-gray-600 text-sm mt-1">
            Conversaciones privadas con otros usuarios
          </p>
        </div>

        {/* Buscador de usuarios */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative" ref={searchInputRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() =>
                  searchResults.length > 0 && setShowSearchDropdown(true)
                }
                placeholder="Buscar usuarios por nombre o email..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searching && (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Dropdown de resultados */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg max-h-80 overflow-y-auto">
                {searchResults.map((searchUser) => (
                  <button
                    key={searchUser.id}
                    onClick={() => startConversation(searchUser)}
                    disabled={creatingWith === searchUser.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors disabled:opacity-50 border-b border-gray-100 last:border-b-0">
                    <img
                      src={searchUser.avatarUrl || "https://placehold.co/40"}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      alt={searchUser.name}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {searchUser.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {searchUser.email}
                      </p>
                      {searchUser.bio && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {searchUser.bio}
                        </p>
                      )}
                    </div>
                    {creatingWith === searchUser.id ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-400"
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
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Sin resultados */}
            {showSearchDropdown &&
              searchResults.length === 0 &&
              !searching &&
              searchQuery.length >= 2 && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">🔍</div>
                  <p className="text-sm text-gray-600">
                    No se encontraron usuarios
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Intenta con otro nombre o email
                  </p>
                </div>
              )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            💡 Escribe al menos 2 caracteres para buscar
          </p>
        </div>

        {/* Lista de conversaciones */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loadingConvs ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                Cargando conversaciones...
              </p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes conversaciones
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Busca usuarios arriba para iniciar un chat privado
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm mx-auto">
                <p className="text-sm text-blue-800">
                  👆 Usa el buscador para encontrar a otros usuarios y empezar a
                  chatear
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => {
                const otherUser = conv.participants.find(
                  (p) => p.id !== user.id
                )
                const lastMessage = conv.messages?.[0]

                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={otherUser?.avatarUrl || "https://placehold.co/48"}
                        className="w-12 h-12 rounded-full"
                        alt={otherUser?.name}
                      />
                      {/* Indicador online (futuro) */}
                      {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div> */}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {otherUser?.name || "Usuario"}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      {lastMessage ? (
                        <p className="text-sm text-gray-600 truncate">
                          {lastMessage.sender.id === user.id && "Tú: "}
                          {lastMessage.text}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Inicia la conversación
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Tienes {conversations.length}{" "}
            {conversations.length === 1 ? "conversación" : "conversaciones"}
          </p>
        </div>
      </div>
    </div>
  )
}
