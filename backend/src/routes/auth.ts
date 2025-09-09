

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
      const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
      const payload = {id: req.user.id}
      const token = jwt.sign(payload, JWT_SECRET, {expiresIn: "7d"})

      // 🔧 Cookies cross-domain
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

// 🔍 Nueva versión de /me con JWT
// router.get("/me", async (req, res) => {
//   console.log("=== AUTH DEBUG ===")

//   const token = req.cookies?.auth_token
//   console.log("🔑 Token presente:", token ? "✅ Sí" : "❌ No")

//   if (!token) {
//     console.log("⛔ No hay token en cookies")
//     console.log("==================")
//     return res.json({user: null})
//   }

//   try {
//     const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
//     const decoded = jwt.verify(token, JWT_SECRET) as {id: string}
//     console.log("🧩 Payload JWT:", decoded)

//     const user = await prisma.user.findUnique({
//       where: {id: decoded.id}
//     })

//     console.log("👤 Usuario en DB:", user ? user.email : "❌ No encontrado")
//     console.log("==================")

//     return res.json({user})
//   } catch (err: any) {
//     console.log("💥 Error al verificar token:", err.message)
//     console.log("==================")
//     return res.json({user: null})
//   }
// })





router.get("/me", async (req, res) => {
  console.log("=== AUTH DEBUG ===")

  // 🔧 ORDEN DE PRIORIDAD: Primero cookies (funciona normal), luego JWT header
  let token = req.cookies?.auth_token
  let authSource = "cookie"

  // Solo si NO hay cookie, intentar con Authorization header
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      authSource = "header"
    }
  }

  console.log("🔑 Token presente:", token ? "✅ Sí" : "❌ No")
  console.log("🔑 Fuente:", authSource)

  if (!token) {
    console.log("⛔ No hay token en cookies ni headers")
    console.log("==================")
    return res.json({user: null})
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
    const decoded = jwt.verify(token, JWT_SECRET) as {id: string}
    console.log("🧩 Payload JWT:", decoded)

    const user = await prisma.user.findUnique({
      where: {id: decoded.id}
    })

    console.log("👤 Usuario en DB:", user ? user.email : "❌ No encontrado")
    console.log("==================")

    return res.json({user, authSource}) // Incluir fuente para debugging
  } catch (err: any) {
    console.log("💥 Error al verificar token:", err.message)
    console.log("==================")
    return res.json({user: null})
  }
})

// 🔧 NUEVO: Endpoint para obtener JWT manualmente (para casos problemáticos)
router.post("/get-jwt", async (req, res) => {
  // Este endpoint solo funciona si ya tienes una sesión válida con cookies
  const token = req.cookies?.auth_token

  if (!token) {
    return res.status(401).json({error: "No hay sesión activa"})
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
    const decoded = jwt.verify(token, JWT_SECRET) as {id: string}

    // Devolver el mismo token que ya está en la cookie
    return res.json({token})
  } catch (err) {
    return res.status(401).json({error: "Sesión inválida"})
  }
})



///////////////////////





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
