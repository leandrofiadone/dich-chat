// Dashboard.jsx
import Header from "../components/Header"
import {useMe} from "../hooks/useMe"

export default function Dashboard() {
  const {user, loading} = useMe()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-2">
            Información de tu cuenta y actividad
          </p>
        </div>

        {loading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{animationDelay: "0.1s"}}></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{animationDelay: "0.2s"}}></div>
              <span className="text-slate-600 ml-3">Cargando...</span>
            </div>
          </div>
        ) : user ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={user.avatarUrl || "https://placehold.co/80"}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                  alt="Avatar"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full ring-2 ring-white"></div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  {user.name}
                </h2>
                <p className="text-blue-600 font-medium">{user.email}</p>
                <p className="text-slate-700 mt-3 leading-relaxed">
                  {user.bio || "Sin bio aún. ¡Agrega una descripción sobre ti!"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
            <div className="text-amber-600 text-lg font-medium">
              🔒 Necesitas iniciar sesión para acceder a tu dashboard
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
