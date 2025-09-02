import Header from "../components/Header"
import {useMe} from "../hooks/useMe"

export default function Dashboard() {
  const {user, loading} = useMe()

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 text-sm">Tu información y actividad</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1"
                  style={{animationDelay: "0.1s"}}></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{animationDelay: "0.2s"}}></div>
                <span className="text-gray-600 ml-3">Cargando...</span>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatarUrl || "https://placehold.co/60"}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {user.name}
                    </h2>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                    {user.bio && (
                      <p className="text-gray-700 text-sm mt-2">{user.bio}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Estado</p>
                      <p className="font-semibold">En línea</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Perfil</p>
                      <p className="font-semibold">Completo</p>
                    </div>
                    <div className="text-green-500">✓</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold mb-3">Acciones rápidas</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/profile"
                    className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 text-center">
                    Editar perfil
                  </a>
                  <a
                    href="/"
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 text-center">
                    Ir al chat
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <div className="text-amber-700">
                <p className="font-semibold mb-2">Acceso restringido</p>
                <p className="text-sm mb-4">
                  Necesitas iniciar sesión para acceder
                </p>
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/google`}
                  className="inline-block px-4 py-2 bg-black text-white text-sm rounded">
                  Iniciar sesión
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
