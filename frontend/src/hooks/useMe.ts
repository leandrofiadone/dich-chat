import {useEffect, useState} from "react"
import api from "../lib/api"

export function useMe() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authSource, setAuthSource] = useState<string>("")

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        // 🔧 Primer intento: método normal con cookies
        console.log("🍪 Intentando autenticación con cookies...")
        const response = await api.get("/auth/me")

        if (mounted) {
          if (response.data.user) {
            console.log("✅ Autenticación exitosa con cookies")
            setUser(response.data.user)
            setAuthSource(response.data.authSource || "cookie")
          } else {
            console.log(
              "❌ Sin usuario con cookies, intentando método alternativo..."
            )
            await tryJWTAuth()
          }
        }
      } catch (error) {
        console.log("❌ Error con cookies, intentando método alternativo...")
        if (mounted) {
          await tryJWTAuth()
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const tryJWTAuth = async () => {
      // Si hay JWT en localStorage, intentar usarlo
      const savedToken = localStorage.getItem("auth_token")
      if (savedToken) {
        try {
          console.log("🔑 Intentando con JWT guardado...")
          // Configurar token en header y reintentar
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

      // 🔧 NUEVO: Si estamos en móvil y parece que deberíamos estar logueados,
      // intentar obtener JWT del backend
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile && window.location.pathname !== "/") {
        try {
          console.log(
            "📱 Dispositivo móvil detectado, intentando obtener JWT..."
          )
          const jwtResponse = await api.post("/auth/get-jwt")

          if (jwtResponse.data.token) {
            console.log("🔑 JWT obtenido del backend")
            localStorage.setItem("auth_token", jwtResponse.data.token)

            // Reintentar con el nuevo token
            const userResponse = await api.get("/auth/me", {
              headers: {Authorization: `Bearer ${jwtResponse.data.token}`}
            })

            if (userResponse.data.user) {
              console.log("✅ Autenticación exitosa con JWT obtenido")
              setUser(userResponse.data.user)
              setAuthSource("header")
            }
          }
        } catch (error) {
          console.log("❌ No se pudo obtener JWT del backend")
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  return {user, loading, authSource}
}
