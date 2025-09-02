import Header from "../components/Header"
import {useEffect, useState} from "react"
import {useMe} from "../hooks/useMe"
import api from "../lib/api"

export default function Profile() {
  const {user} = useMe()
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (user) {
      setBio(user.bio || "")
      setAvatarUrl(user.avatarUrl || "")
    }
  }, [user])

  const save = async () => {
    setSaving(true)
    setMessage("")

    try {
      await api.put("/api/users/me", {bio, avatarUrl})
      setMessage("✓ Perfil actualizado")
    } catch (error) {
      setMessage("✗ Error al actualizar")
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(""), 3000)
    }
  }

  return (
    <div
      className="flex flex-col bg-gray-50 overflow-hidden"
      style={{height: "100dvh"}}>
      <Header />

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-600 text-sm">Personaliza tu información</p>
          </div>

          {!user ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <div className="text-amber-700">
                <p className="font-semibold mb-2">Inicio de sesión requerido</p>
                <p className="text-sm mb-4">
                  Inicia sesión para editar tu perfil
                </p>
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/google`}
                  className="inline-block px-4 py-2 bg-black text-white text-sm rounded">
                  Iniciar sesión
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm transition-all duration-300 ${
                    message.includes("✓")
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}>
                  {message}
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 hover:shadow-md transition-shadow">
                {/* Current user info */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <img
                    src={user.avatarUrl || "https://placehold.co/50"}
                    className="w-12 h-12 rounded-full transition-transform hover:scale-105"
                  />
                  <div>
                    <h2 className="font-semibold text-gray-900">{user.name}</h2>
                    <p className="text-gray-600 text-sm break-all">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Avatar section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto de perfil
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        avatarUrl || user.avatarUrl || "https://placehold.co/60"
                      }
                      className="w-12 h-12 rounded-full transition-transform hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/60"
                      }}
                    />
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    URL de tu imagen de perfil
                  </p>
                </div>

                {/* Bio section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biografía
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Cuéntanos algo sobre ti..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all resize-none"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Comparte tus intereses o profesión</span>
                    <span className={bio.length > 450 ? "text-amber-600" : ""}>
                      {bio.length}/500
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      setBio(user.bio || "")
                      setAvatarUrl(user.avatarUrl || "")
                      setMessage("")
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-all duration-200 transform hover:scale-105">
                    Restaurar
                  </button>

                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-6 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                    {saving ? (
                      <>
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      "Guardar cambios"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
