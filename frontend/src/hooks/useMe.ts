import {useEffect, useState, useCallback} from "react"
import api from "../lib/api"

export function useMe() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authSource, setAuthSource] = useState<string>("")

  // Capturar token desde la URL y guardarlo en localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenFromURL = params.get("auth_token")

    if (tokenFromURL) {
      console.log("📥 Token encontrado en URL, guardando en localStorage")
      localStorage.setItem("auth_token", tokenFromURL)

      // Limpiar la URL sin recargar la página
      const newUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, "", newUrl)
    }
  }, [])

  // Función para refrescar datos del usuario
  const refreshUser = useCallback(async () => {
    console.log("\n🔄 === REFRESH USER ===")
    setLoading(true)

    try {
      console.log("🔄 Obteniendo datos actualizados del usuario...")
      const response = await api.get("/auth/me")

      if (response.data.user) {
        console.log(
          "✅ Datos de usuario actualizados:",
          response.data.user.email
        )
        setUser(response.data.user)
        setAuthSource(response.data.authSource || "cookie")
      } else {
        console.log("❌ No se encontró usuario en refresh")
        setUser(null)
        setAuthSource("")
      }
    } catch (error) {
      console.error("❌ Error refrescando usuario:", error)
      setUser(null)
      setAuthSource("")
    } finally {
      setLoading(false)
      console.log("🔄 Refresh completado")
      console.log("=====================\n")
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      console.log("\n🔍 === useMe: INICIANDO CHECK AUTH ===")

      try {
        console.log("🍪 Intentando autenticación con cookies...")
        const response = await api.get("/auth/me")

        if (mounted) {
          if (response.data.user) {
            console.log("✅ Autenticación exitosa con cookies/JWT")
            console.log("👤 Usuario:", response.data.user.email)
            console.log("🔑 Método:", response.data.authSource)
            setUser(response.data.user)
            setAuthSource(response.data.authSource || "cookie")
          } else {
            console.log("❌ Sin usuario, intentando método alternativo...")
            await tryJWTAuth()
          }
        }
      } catch (error) {
        console.log(
          "❌ Error con auth, intentando método alternativo...",
          error
        )
        if (mounted) {
          await tryJWTAuth()
        }
      } finally {
        if (mounted) {
          setLoading(false)
          console.log("🏁 useMe: Check auth completado")
          console.log("=======================================\n")
        }
      }
    }

    const tryJWTAuth = async () => {
      const savedToken = localStorage.getItem("auth_token")
      if (savedToken) {
        try {
          console.log("🔑 Intentando con JWT guardado...")
          const response = await api.get("/auth/me", {
            headers: {Authorization: `Bearer ${savedToken}`}
          })

          if (response.data.user) {
            console.log("✅ Autenticación exitosa con JWT")
            setUser(response.data.user)
            setAuthSource("header")
            return
          }
        } catch (error) {
          console.log("❌ JWT inválido, eliminando...")
          localStorage.removeItem("auth_token")
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  return {
    user,
    loading,
    authSource,
    refreshUser // Exportar función de refresh
  }
}
