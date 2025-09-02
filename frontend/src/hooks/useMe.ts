// 2. MEJORAR frontend/src/hooks/useMe.ts

import {useEffect, useState} from "react"
import api from "../lib/api"

export function useMe() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 🔧 MEJORAR: Manejar token desde URL si existe
    const handleAuthFromURL = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromUrl = urlParams.get("token")

      if (tokenFromUrl) {
        console.log("🔄 Token detectado en URL, limpiando URL...")
        // Limpiar la URL sin recargar la página
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, document.title, cleanUrl)
      }

      return tokenFromUrl
    }

    const fetchUser = async () => {
      try {
        // Detectar token en URL primero
        const tokenFromUrl = handleAuthFromURL()

        // Construir la request, incluyendo token en query si existe
        const config = tokenFromUrl
          ? {
              params: {token: tokenFromUrl}
            }
          : {}

        const res = await api.get("/auth/me", config)

        if (mounted) {
          setUser(res.data.user)

          // Si el login fue exitoso y había token en URL, mostrar notificación
          if (tokenFromUrl && res.data.user) {
            console.log("✅ Login exitoso desde URL redirect")
            // Opcional: mostrar notificación de éxito
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchUser()

    return () => {
      mounted = false
    }
  }, [])

  return {user, loading}
}
