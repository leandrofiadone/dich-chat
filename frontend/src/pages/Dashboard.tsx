import {useEffect, useState} from "react"
import api from "../lib/api"

export function useMe() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authSource, setAuthSource] = useState<string>("")

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

  return {user, loading, authSource}
}
