import {Router} from "express"
import passport from "../auth/google.js"
import jwt from "jsonwebtoken"
import {prisma} from "../db.js"

export const router = Router()

// Verificar si Google Auth está configurado
const isGoogleAuthConfigured =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET

if (isGoogleAuthConfigured) {
  router.get(
    "/google",
    passport.authenticate("google", {scope: ["profile", "email"]})
  )

  router.get(
    "/google/callback",
    passport.authenticate("google", {failureRedirect: "/auth/failure"}),
    (req: any, res) => {
      console.log("\n🎯 === GOOGLE CALLBACK DEBUG ===")
      console.log("👤 Usuario autenticado:", req.user?.email)
      console.log("🆔 User ID:", req.user?.id)

      const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
      const payload = {id: req.user.id}
      const token = jwt.sign(payload, JWT_SECRET, {expiresIn: "7d"})

      console.log(
        "🔑 JWT creado:",
        token ? `${token.substring(0, 30)}...` : "ERROR"
      )

      // 🔑 Siempre fijar en producción: SameSite=None; Secure
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true, // obligatorio para Safari/iOS
        sameSite: "none", // obligatorio para Safari/iOS
        maxAge: 7 * 24 * 60 * 60 * 1000
      })

      const origin =
        process.env.FRONTEND_URL ||
        process.env.ORIGIN_CORS ||
        "http://localhost:5173"

      // 🔄 Mandar también como query param (plan B en iOS)
      // CAMBIO: Redirigir al chat (/) en lugar del dashboard
      const redirectUrl = `${origin}/?auth_token=${token}`

      console.log("🌐 Origin configurado:", origin)
      console.log(
        "🔗 URL de redirect completa:",
        `${redirectUrl.substring(0, 60)}...`
      )
      console.log("🔄 Ejecutando redirect al CHAT...")
      console.log("=====================================\n")

      res.redirect(redirectUrl)
    }
  )
} else {
  router.get("/google", (_req, res) => {
    res.status(501).json({
      error: "Google Auth not configured",
      message: "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
    })
  })

  router.get("/google/callback", (_req, res) => {
    res.status(501).json({
      error: "Google Auth not configured"
    })
  })
}

// 🔍 Nueva versión de /me con JWT
router.get("/me", async (req, res) => {
  const timestamp = new Date().toISOString().substring(11, 23)
  console.log(`\n=== [${timestamp}] AUTH CHECK ===`)

  let token = req.cookies?.auth_token
  let authSource = "cookie"

  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      authSource = "header"
    }
  }

  console.log(
    `🔑 [${timestamp}] Token: ${token ? "✅ PRESENTE" : "❌ AUSENTE"}`
  )
  console.log(`🔑 [${timestamp}] Fuente: ${authSource}`)

  // Detectar dispositivo
  const userAgent = req.headers["user-agent"] || ""
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  if (isMobile) {
    console.log(`📱 [${timestamp}] Dispositivo: ${isIOS ? "iOS" : "Android"}`)
  }

  if (!token) {
    console.log(`⛔ [${timestamp}] SIN TOKEN - Usuario no autenticado`)
    console.log("==========================================\n")
    return res.json({user: null})
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
    const decoded = jwt.verify(token, JWT_SECRET) as {id: string}

    const user = await prisma.user.findUnique({
      where: {id: decoded.id}
    })

    if (user) {
      console.log(`✅ [${timestamp}] AUTH SUCCESS - ${user.email}`)
    } else {
      console.log(`❌ [${timestamp}] USER NOT FOUND - ID: ${decoded.id}`)
    }

    console.log("==========================================\n")
    return res.json({user, authSource})
  } catch (err: any) {
    console.log(`💥 [${timestamp}] TOKEN ERROR: ${err.message}`)
    console.log("==========================================\n")
    return res.json({user: null})
  }
})

router.get("/failure", (_req, res) =>
  res.status(401).json({error: "Auth failed"})
)

// 🔧 FUNCIÓN HELPER PARA LOGOUT CORREGIDA
const performLogout = (req: any, res: any) => {
  console.log("\n🚪 === LOGOUT REQUEST ===")

  if (req.logout) {
    req.logout({keepSessionInfo: false}, () => {})
  }

  // 🔧 CRÍTICO: Limpiar cookie con EXACTAMENTE las mismas opciones
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/" // Importante: especificar path
  })

  console.log("🗑️ Cookie auth_token limpiada")
  console.log("========================\n")

  if (req.method === "GET") {
    const origin =
      process.env.FRONTEND_URL ||
      process.env.ORIGIN_CORS ||
      "http://localhost:5173"
    console.log("🔄 Redirecting to:", origin)
    res.redirect(origin)
  } else {
    res.json({ok: true, message: "Logged out successfully"})
  }
}

router.get("/logout", performLogout)
router.post("/logout", performLogout)
