import {formatRelativeTime, formatTime} from "../utils/format"
import Header from "../components/Header"
import AuthGuard from "../components/AuthGard"
import {useEffect, useState} from "react"
import {useMe} from "../hooks/useMe"
import api from "../lib/api"
import {Button} from "@/components/ui/button"
import {Avatar, AvatarImage, AvatarFallback} from "@/components/ui/avatar"
import {Badge} from "@/components/ui/badge"
import {getInitials} from "../utils/format"

// ✨ NUEVO: Toast simple para notificaciones
const Toast = ({
  message,
  type,
  onClose
}: {
  message: string
  type: "success" | "error" | "warning"
  onClose: () => void
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: "bg-green-600 border-green-700",
    error: "bg-red-600 border-red-700",
    warning: "bg-yellow-600 border-yellow-700"
  }

  return (
    <div
      className={`fixed bottom-4 right-4 ${styles[type]} text-white px-6 py-4 rounded-lg shadow-2xl border-2 flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 max-w-md`}>
      <span className="text-2xl">
        {type === "success" ? "✅" : type === "error" ? "❌" : "⚠️"}
      </span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="hover:bg-white/20 rounded p-1 transition-colors">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

export default function Profile() {
  const {user, loading: userLoading, refreshUser} = useMe()
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error" | "warning"
  } | null>(null)

  // ✨ NUEVO: Estado para validaciones
  const [avatarError, setAvatarError] = useState(false)

  // Cargar datos del usuario cuando esté disponible
  useEffect(() => {
    if (user) {
      console.log("👤 Usuario cargado en Profile:", user)
      setBio(user.bio || "")
      setAvatarUrl(user.avatarUrl || "")
    }
  }, [user])

  // ✨ NUEVO: Validar URL de avatar en tiempo real
  useEffect(() => {
    if (!avatarUrl.trim()) {
      setAvatarError(false)
      return
    }

    const img = new Image()
    img.onload = () => setAvatarError(false)
    img.onerror = () => setAvatarError(true)
    img.src = avatarUrl
  }, [avatarUrl])

  // ✨ NUEVO: Advertir antes de salir con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [bio, avatarUrl, user])

  const save = async () => {
    if (!user) {
      setToast({
        message: "Usuario no disponible. Intenta recargar la página.",
        type: "error"
      })
      return
    }

    setSaving(true)

    try {
      console.log("\n💾 === GUARDANDO PERFIL ===")

      // Preparar payload (solo enviar lo que cambió)
      const payload: any = {}

      if (bio.trim() !== (user.bio || "")) {
        payload.bio = bio.trim() || null
      }

      if (avatarUrl.trim() !== (user.avatarUrl || "")) {
        payload.avatarUrl = avatarUrl.trim() || null
      }

      if (Object.keys(payload).length === 0) {
        setToast({
          message: "No hay cambios para guardar",
          type: "warning"
        })
        return
      }

      const response = await api.put("/api/users/me", payload)

      if (response.data.success) {
        setToast({
          message: "¡Perfil actualizado correctamente!",
          type: "success"
        })

        // ✨ SOLUCIÓN: Usar refreshUser en vez de window.location.reload()
        console.log("🔄 Refrescando datos del usuario...")
        await refreshUser()
        console.log("✅ Usuario refrescado exitosamente")
      } else {
        throw new Error("Respuesta inesperada del servidor")
      }
    } catch (error: any) {
      console.error("❌ Error actualizando perfil:", error)

      if (error.response?.status === 401) {
        setToast({
          message: "Sesión expirada. Redirigiendo...",
          type: "error"
        })
        setTimeout(() => {
          window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
        }, 2000)
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || "Datos inválidos"
        setToast({message: errorMsg, type: "error"})
      } else {
        setToast({
          message: "Error al actualizar el perfil. Intenta de nuevo.",
          type: "error"
        })
      }
    } finally {
      setSaving(false)
      console.log("===============================\n")
    }
  }

  // Detectar cambios para habilitar/deshabilitar botón
  const hasChanges =
    user &&
    (bio.trim() !== (user.bio || "").trim() ||
      avatarUrl.trim() !== (user.avatarUrl || "").trim())

  // ✨ NUEVO: Calcular progreso de bio
  const bioProgress = (bio.length / 500) * 100
  const bioColorClass =
    bio.length > 450
      ? "text-red-600"
      : bio.length > 350
      ? "text-yellow-600"
      : "text-gray-500"

  return (
    <AuthGuard requireAuth={true}>
      <div
        className="flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
        style={{height: "100dvh"}}>
        <Header />

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
            {/* ✨ Header mejorado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Mi Perfil
                  {hasChanges && (
                    <Badge variant="default" className="animate-pulse">
                      Sin guardar
                    </Badge>
                  )}
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  Personaliza tu información pública
                </p>
              </div>

              {/* Quick actions */}
              {hasChanges && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBio(user?.bio || "")
                      setAvatarUrl(user?.avatarUrl || "")
                      setToast({
                        message: "Cambios descartados",
                        type: "warning"
                      })
                    }}
                    disabled={saving}>
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saving || avatarError}
                    className="min-w-[100px]">
                    {saving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Guardando
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* ✨ Card principal con mejor diseño */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header del card con avatar grande */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-24 relative">
                <div className="absolute -bottom-12 left-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-xl ring-2 ring-blue-100">
                      <AvatarImage
                        src={avatarUrl || user?.avatarUrl}
                        alt={user?.name}
                      />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                        {user?.name ? getInitials(user.name) : "??"}
                      </AvatarFallback>
                    </Avatar>
                    {avatarError && avatarUrl && (
                      <div className="absolute -bottom-2 -right-2 bg-red-500 text-white rounded-full p-1">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenido del card */}
              <div className="pt-16 px-6 pb-6 space-y-8">
                {/* Info básica */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.name}
                  </h2>
                  <p className="text-gray-600 mt-1">{user?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      ID: {user?.id.slice(0, 8)}...
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-green-200 text-green-700">
                      Cuenta activa
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* ✨ Sección Avatar URL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">
                      URL de foto de perfil
                    </label>
                    {avatarUrl && (
                      <Badge
                        variant={avatarError ? "destructive" : "default"}
                        className="text-xs">
                        {avatarError ? "❌ URL inválida" : "✅ Válida"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        avatarError && avatarUrl
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    La imagen se valida automáticamente
                  </p>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* ✨ Sección Bio mejorada */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-900 flex items-center justify-between">
                    <span>Biografía</span>
                    <span className={`text-xs font-mono ${bioColorClass}`}>
                      {bio.length}/500
                    </span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Cuéntanos sobre ti, tus intereses, profesión..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                  {/* Barra de progreso visual */}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        bio.length > 450
                          ? "bg-red-500"
                          : bio.length > 350
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                      style={{width: `${bioProgress}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Una buena bio ayuda a otros usuarios a conocerte mejor
                  </p>
                </div>

                {/* ✨ Acciones con mejor UX */}
                {hasChanges && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Tienes cambios sin guardar
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        No olvides guardar antes de salir de esta página
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBio(user?.bio || "")
                      setAvatarUrl(user?.avatarUrl || "")
                      setToast({
                        message: "Cambios restaurados",
                        type: "warning"
                      })
                    }}
                    disabled={saving || !hasChanges}
                    className="sm:flex-1">
                    Restaurar original
                  </Button>

                  <Button
                    onClick={save}
                    disabled={saving || !user || !hasChanges || avatarError}
                    className="sm:flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Guardando cambios...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Guardar cambios
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* ✨ Info adicional */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                💡 Consejos para tu perfil
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>
                  • Usa una foto clara donde se te vea bien para mayor confianza
                </li>
                <li>
                  • Tu bio aparecerá en búsquedas y conversaciones con otros
                  usuarios
                </li>
                <li>
                  • Puedes cambiar tu información cuando quieras desde aquí
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>

      {/* ✨ Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AuthGuard>
  )
}
