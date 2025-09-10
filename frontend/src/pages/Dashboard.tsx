import Header from "../components/Header"
import {useMe} from "../hooks/useMe"
import {useEffect, useState} from "react"
import api from "../lib/api"

export default function Dashboard() {
  const {user, loading} = useMe()
  const [stats, setStats] = useState<any>({})
  const [recentMessages, setRecentMessages] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      // Cargar estadísticas y mensajes recientes
      api
        .get("/api/chat/history")
        .then((res) => {
          const messages = res.data
          setRecentMessages(messages.slice(-5)) // últimos 5 mensajes
          setStats({
            totalMessages: messages.length,
            todayMessages: messages.filter(
              (m: any) =>
                new Date(m.createdAt).toDateString() ===
                new Date().toDateString()
            ).length,
            userMessages: messages.filter((m: any) => m.user.id === user.id)
              .length
          })
        })
        .catch((err) => console.error("Error loading stats:", err))
    }
  }, [user])

  if (loading) {
    return (
      <div
        className="flex flex-col bg-gray-50 overflow-hidden"
        style={{height: "100dvh"}}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div
        className="flex flex-col bg-gray-50 overflow-hidden"
        style={{height: "100dvh"}}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Bienvenido a dich-chat!
            </h1>
            <p className="text-gray-600 mb-8">
              Inicia sesión para ver tu dashboard
            </p>
            <a
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
              Iniciar sesión con Google
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col bg-gray-50 overflow-hidden"
      style={{height: "100dvh"}}>
      <Header />

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <img
                src={user.avatarUrl || "https://placehold.co/60"}
                className="w-15 h-15 rounded-full"
                alt={user.name}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ¡Hola, {user.name}! 👋
                </h1>
                <p className="text-gray-600">Bienvenido a tu dashboard</p>
                {user.bio && (
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.totalMessages || 0}
              </div>
              <p className="text-gray-600 text-sm">Mensajes totales</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.todayMessages || 0}
              </div>
              <p className="text-gray-600 text-sm">Mensajes hoy</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {stats.userMessages || 0}
              </div>
              <p className="text-gray-600 text-sm">Tus mensajes</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Acciones rápidas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <a
                href="/"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  💬
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ir al Chat</p>
                  <p className="text-sm text-gray-600">Envía mensajes</p>
                </div>
              </a>

              <a
                href="/profile"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  👤
                </div>
                <div>
                  <p className="font-medium text-gray-900">Editar Perfil</p>
                  <p className="text-sm text-gray-600">Actualiza tu info</p>
                </div>
              </a>

              <a
                href={`${import.meta.env.VITE_API_URL}/auth/logout`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors text-red-600">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  🚪
                </div>
                <div>
                  <p className="font-medium">Cerrar Sesión</p>
                  <p className="text-sm text-red-500">Salir de la app</p>
                </div>
              </a>
            </div>
          </div>

          {/* Recent Messages */}
          {recentMessages.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Mensajes recientes
              </h2>
              <div className="space-y-3">
                {recentMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={msg.user.avatarUrl || "https://placehold.co/32"}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      alt={msg.user.name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {msg.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleString("es-ES")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <a
                  href="/"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Ver todos los mensajes →
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
