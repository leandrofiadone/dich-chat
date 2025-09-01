import {Router} from "express"
import passport from "../auth/google.js"
import jwt from "jsonwebtoken"

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
    (req, res) => {
      const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
      const payload = {id: (req.user as any).id}
      const token = jwt.sign(payload, JWT_SECRET, {expiresIn: "7d"})

      // 🔧 ESTE ES EL FIX PRINCIPAL: Cookies cross-domain
      const isProduction = process.env.NODE_ENV === "production"

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: isProduction, // true en HTTPS (producción)
        sameSite: isProduction ? "none" : "lax", // "none" para cross-domain
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      })

      const origin =
        process.env.FRONTEND_URL ||
        process.env.ORIGIN_CORS ||
        "http://localhost:5173"
      console.log("🔄 Redirecting after Google auth to:", origin + "/dashboard")
      res.redirect(origin + "/dashboard")
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

router.get("/me", (req, res) => {
  // 🔍 Debug para ver qué está pasando
  console.log("=== AUTH DEBUG ===")
  console.log("User:", req.user ? "✅ Found" : "❌ Not found")
  console.log("Cookies:", req.cookies)
  console.log("Session:", req.session)
  console.log("==================")

  res.json({user: req.user || null})
})

router.get("/failure", (_req, res) =>
  res.status(401).json({error: "Auth failed"})
)

// Función helper para logout
const performLogout = (req: any, res: any) => {
  if (req.logout) {
    req.logout({keepSessionInfo: false}, () => {})
  }

  // 🔧 Limpiar cookie con las mismas opciones
  const isProduction = process.env.NODE_ENV === "production"
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
  })

  // Si es una petición GET, redirigir al home
  if (req.method === "GET") {
    const origin =
      process.env.FRONTEND_URL ||
      process.env.ORIGIN_CORS ||
      "http://localhost:5173"
    res.redirect(origin)
  } else {
    // Si es POST, devolver JSON
    res.json({ok: true})
  }
}

// Logout con GET (para enlaces directos)
router.get("/logout", performLogout)

// Logout con POST (para llamadas AJAX)
router.post("/logout", performLogout)
