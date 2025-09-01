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

      res.cookie("auth_token", token, {httpOnly: true, sameSite: "lax"})
      const origin = process.env.ORIGIN_CORS || "http://localhost:5173"
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
  res.clearCookie("auth_token")

  // Si es una petición GET, redirigir al home
  if (req.method === "GET") {
    const origin = process.env.ORIGIN_CORS || "http://localhost:5173"
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
