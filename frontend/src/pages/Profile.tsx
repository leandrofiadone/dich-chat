import {formatRelativeTime, formatTime} from "../utils/format"



import Header from "../components/Header"
import AuthGuard from "../components/AuthGard"
import {useEffect, useState} from "react"
import {useMe} from "../hooks/useMe"
import api from "../lib/api"

export default function Profile() {
  const {user, loading: userLoading} = useMe()
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Cargar datos del usuario cuando esté disponible
  useEffect(() => {
    if (user) {

      console.log("👤 Usuario cargado en Profile:", user)
      setBio(user.bio || "")
      setAvatarUrl(user.avatarUrl || "")
    }
  }, [user])

  // 🧪 Función de debug (solo en desarrollo)
  const loadDebugInfo = async () => {
    if (import.meta.env.PROD) return

    try {
      const response = await api.get("/api/users/debug/me")
      setDebugInfo(response.data)
      console.log("🔍 Debug info:", response.data)
    } catch (error) {
      console.error("❌ Error cargando debug info:", error)
    }
  }

  const save = async () => {
    if (!user) {
      setMessage("❌ Usuario no disponible")
      return
    }

    setSaving(true)
    setMessage("")

    try {
      console.log("\n💾 === GUARDANDO PERFIL ===")
      console.log("👤 Usuario actual:", user.email)
      console.log("📝 Bio original:", `"${user.bio}"`)
      console.log("📝 Bio nueva:", `"${bio}"`)
      console.log("🖼️ Avatar original:", `"${user.avatarUrl}"`)
      console.log("🖼️ Avatar nuevo:", `"${avatarUrl}"`)

      // Preparar payload (solo enviar lo que cambió)
      const payload: any = {}

      if (bio.trim() !== (user.bio || "")) {
        payload.bio = bio.trim() || null
        console.log("✏️ Bio cambió, incluyendo en payload")
      }

      if (avatarUrl.trim() !== (user.avatarUrl || "")) {
        payload.avatarUrl = avatarUrl.trim() || null
        console.log("🖼️ Avatar cambió, incluyendo en payload")
      }

      console.log("📦 Payload final:", JSON.stringify(payload, null, 2))

      if (Object.keys(payload).length === 0) {
        setMessage("⚠️ No hay cambios para guardar")
        console.log("⚠️ No hay cambios detectados")
        return
      }

      console.log("🚀 Enviando request a /api/users/me...")

      const response = await api.put("/api/users/me", payload)

      console.log("✅ Respuesta del servidor:", response.data)

      if (response.data.success) {
        setMessage("✅ Perfil actualizado correctamente")
        console.log("🎉 Perfil guardado exitosamente")

        // Recargar debug info si está disponible
        if (!import.meta.env.PROD) {
          setTimeout(loadDebugInfo, 1000)
        }

        // Opcional: recargar después de 3 segundos para sincronizar estado
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        throw new Error("Respuesta inesperada del servidor")
      }
    } catch (error: any) {
      console.error("❌ Error actualizando perfil:", error)
      console.error("📊 Error completo:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })

      if (error.response?.status === 401) {
        setMessage("❌ Sesión expirada. Recargando...")
        setTimeout(() => {
          window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
        }, 2000)
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || "Datos inválidos"
        setMessage(`❌ ${errorMsg}`)
      } else if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.message || "Error del servidor"
        setMessage(`❌ Error del servidor: ${errorMsg}`)
      } else {
        setMessage("❌ Error desconocido al actualizar el perfil")
      }
    } finally {
      setSaving(false)
      // Limpiar mensaje después de 8 segundos
      setTimeout(() => setMessage(""), 8000)
      console.log("===============================\n")
    }
  }

  // Detectar cambios para habilitar/deshabilitar botón
  const hasChanges =
    user &&
    (bio.trim() !== (user.bio || "").trim() ||
      avatarUrl.trim() !== (user.avatarUrl || "").trim())

  return (
    <AuthGuard requireAuth={true}>
      <div
        className="flex flex-col bg-gray-50 overflow-hidden"
        style={{height: "100dvh"}}>
        <Header />

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-2xl mx-auto p-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Mi Perfil
                </h1>
                <p className="text-gray-600 text-sm">
                  Personaliza tu información
                </p>
              </div>

              {/* Debug button (solo en desarrollo) */}
              {!import.meta.env.PROD && (
                <button
                  onClick={loadDebugInfo}
                  className="px-3 py-1 bg-yellow-500 text-white text-xs rounded">
                  Debug
                </button>
              )}
            </div>

            <div className="space-y-6">
              {message && (
                <div
                  className={`p-4 rounded-lg text-sm transition-all duration-300 border ${
                    message.includes("✅")
                      ? "bg-green-50 text-green-700 border-green-200"
                      : message.includes("⚠️")
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                  {message}
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 hover:shadow-md transition-shadow">
                {/* Current user info */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <img
                    src={user?.avatarUrl || "https://placehold.co/50"}
                    className="w-12 h-12 rounded-full transition-transform hover:scale-105"
                    alt={user?.name}
                  />
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {user?.name}
                    </h2>
                    <p className="text-gray-600 text-sm break-all">
                      {user?.email}
                    </p>
                    {user && (
                      <p className="text-xs text-gray-400">ID: {user.id}</p>
                    )}
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
                        avatarUrl ||
                        user?.avatarUrl ||
                        "https://placehold.co/60"
                      }
                      className="w-12 h-12 rounded-full transition-transform hover:scale-110 border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/60"
                      }}
                      alt="Preview"
                    />
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    URL de tu imagen de perfil (opcional)
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Comparte tus intereses o profesión</span>
                    <span className={bio.length > 450 ? "text-amber-600" : ""}>
                      {bio.length}/500
                    </span>
                  </div>
                </div>

                {/* Change indicator */}
                {hasChanges && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    ⚡ Hay cambios sin guardar
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      setBio(user?.bio || "")
                      setAvatarUrl(user?.avatarUrl || "")
                      setMessage("")
                    }}
                    disabled={saving || !hasChanges}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                    Restaurar
                  </button>

                  <button
                    onClick={save}
                    disabled={saving || !user || !hasChanges}
                    className="px-6 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
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

              {/* Debug info (solo en desarrollo) */}
              {!import.meta.env.PROD && debugInfo && (
                <div className="bg-gray-800 text-gray-200 rounded-lg p-4 text-xs font-mono">
                  <h3 className="text-yellow-400 mb-2">
                    🔍 Debug Information:
                  </h3>
                  <pre className="whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
