// Profile.jsx
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
      setMessage("✅ Perfil actualizado correctamente")
    } catch (error) {
      setMessage("❌ Error al actualizar el perfil")
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(""), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="text-slate-600 mt-2">
            Personaliza tu información y apariencia
          </p>
        </div>

        {!user ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
            <div className="text-amber-600 text-lg font-medium">
              🔒 Inicia sesión para editar tu perfil
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 space-y-8">
            {/* Avatar Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-slate-800">
                Foto de perfil
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img
                    src={avatarUrl || "https://placehold.co/100"}
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                    alt="Avatar preview"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/0 hover:bg-black/10 transition-colors cursor-pointer"></div>
                </div>
                <div className="flex-1">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/mi-avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 px-4 py-3 text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    Ingresa la URL de tu imagen de perfil
                  </p>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-slate-800">
                Biografía
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Cuéntanos algo sobre ti..."
                className="w-full rounded-2xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 p-4 text-slate-700 placeholder-slate-400 transition-all outline-none resize-none"
              />
              <p className="text-sm text-slate-500">Máximo 500 caracteres</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              {message && (
                <div
                  className={`px-4 py-2 rounded-xl font-medium ${
                    message.includes("✅")
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                  {message}
                </div>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="ml-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Guardando...
                  </span>
                ) : (
                  "💾 Guardar cambios"
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
