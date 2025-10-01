import {useEffect, useState} from "react"
import {useMe} from "../hooks/useMe"
import api from "../lib/api"
import Header from "../components/Header"

type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

type Conversation = {
  id: string
  participantIds: string[]
  lastMessageAt: string
  participants: User[]
}

export default function Conversations() {
  const {user, loading: authLoading} = useMe()
  const [users, setUsers] = useState<User[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [creatingWith, setCreatingWith] = useState<string | null>(null)

  // Cargar lista de usuarios
  useEffect(() => {
    if (!user) return

    const loadUsers = async () => {
      try {
        // Obtener todos los usuarios
        const response = await api.get("/api/users/me")
        const currentUser = response.data

        // Por ahora, vamos a simular una lista de usuarios
        // En producción, necesitarías un endpoint GET /api/users
        setUsers([currentUser])
      } catch (error) {
        console.error("Error cargando usuarios:", error)
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [user])

  // Cargar conversaciones existentes
  useEffect(() => {
    if (!user) return

    const loadConversations = async () => {
      try {
        const response = await api.get("/api/conversations")
        setConversations(response.data)
        console.log("✅ Conversaciones cargadas:", response.data)
      } catch (error) {
        console.error("Error cargando conversaciones:", error)
      } finally {
        setLoadingConvs(false)
      }
    }

    loadConversations()
  }, [user])

  // Crear conversación con un usuario
  const createConversation = async (otherUserId: string) => {
    setCreatingWith(otherUserId)
    try {
      const response = await api.post("/api/conversations", {
        userId: otherUserId
      })

      console.log("✅ Conversación creada/obtenida:", response.data)

      // Si es nueva, agregarla a la lista
      if (response.data.isNew) {
        setConversations((prev) => [
          {
            id: response.data.conversation.id,
            participantIds: response.data.conversation.participantIds,
            lastMessageAt: response.data.conversation.lastMessageAt,
            participants: response.data.participants
          },
          ...prev
        ])
      }

      alert(
        response.data.isNew
          ? "✅ Nueva conversación creada!"
          : "✅ Conversación existente encontrada!"
      )
    } catch (error: any) {
      console.error("Error creando conversación:", error)
      alert(
        "❌ Error: " +
          (error.response?.data?.message || "No se pudo crear la conversación")
      )
    } finally {
      setCreatingWith(null)
    }
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
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              Inicia sesión para ver conversaciones
            </h1>
            <a
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
              className="px-6 py-3 bg-black text-white rounded-lg">
              Iniciar sesión
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Prueba de Conversaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Interfaz simple para probar el backend
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel Izquierdo: Crear Conversación */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">
              🧪 Crear Conversación (Prueba Manual)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID del otro usuario:
                </label>
                <input
                  type="text"
                  id="userId-input"
                  placeholder="Pega aquí el ID del usuario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => {
                  const input = document.getElementById(
                    "userId-input"
                  ) as HTMLInputElement
                  const userId = input.value.trim()
                  if (!userId) {
                    alert("⚠️ Ingresa un ID de usuario")
                    return
                  }
                  createConversation(userId)
                }}
                disabled={creatingWith !== null}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {creatingWith ? "Creando..." : "Crear Conversación"}
              </button>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-900 mb-1">
                  💡 Cómo obtener IDs:
                </p>
                <ol className="text-yellow-800 space-y-1 ml-4 list-decimal">
                  <li>Abre DevTools (F12) → Console</li>
                  <li>
                    Ejecuta:{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      fetch('http://localhost:8080/api/users/me',
                      {`{credentials:'include'}`}
                      ).then(r=&gt;r.json()).then(console.log)
                    </code>
                  </li>
                  <li>Copia el ID de otro usuario</li>
                </ol>
              </div>
            </div>

            {/* Info del usuario actual */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Tu información:</p>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                <p>
                  <strong>ID:</strong> {user.id}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Conversaciones Existentes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">
              💬 Mis Conversaciones
            </h2>

            {loadingConvs ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Cargando...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-600 text-sm">
                  No tienes conversaciones aún
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Crea una con el formulario de la izquierda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => {
                  // Filtrar al otro participante (no el usuario actual)
                  const otherUser = conv.participants.find(
                    (p) => p.id !== user.id
                  )

                  return (
                    <a
                      key={conv.id}
                      href={`/chat/${conv.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            otherUser?.avatarUrl || "https://placehold.co/40"
                          }
                          className="w-10 h-10 rounded-full"
                          alt={otherUser?.name}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {otherUser?.name || "Usuario"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {otherUser?.email}
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400"
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
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          ID: {conv.id.substring(0, 12)}...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Creada:{" "}
                          {new Date(conv.lastMessageAt).toLocaleString()}
                        </p>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel Inferior: Debug Info */}
        <div className="bg-gray-800 text-gray-200 rounded-lg p-4 font-mono text-xs">
          <p className="text-green-400 font-semibold mb-2">
            🔍 Debug Information
          </p>
          <p>✅ Backend: {import.meta.env.VITE_API_URL}</p>
          <p>✅ Usuario autenticado: {user.email}</p>
          <p>✅ Conversaciones cargadas: {conversations.length}</p>
          <p className="text-gray-400 mt-2">
            Ver logs completos en la consola del navegador (F12)
          </p>
        </div>
      </div>
    </div>
  )
}
