// 1. CORREGIR backend/src/routes/auth.ts

import {Router} from "express"
import passport from "../auth/google.js"
import jwt from "jsonwebtoken"
import {prisma} from "../db.js"

export const router = Router()

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

      const isProduction = process.env.NODE_ENV === "production"

      // 🔧 CONFIGURACIÓN CORREGIDA DE COOKIES
      const cookieOptions = {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        // Para cross-domain, SIEMPRE necesitas secure=true Y sameSite='none'
        ...(isProduction
          ? {
              secure: true,
              sameSite: "none" as const
            }
          : {
              // En desarrollo local, usar lax (funciona sin HTTPS)
              secure: false,
              sameSite: "lax" as const
            })
      }

      res.cookie("auth_token", token, cookieOptions)

      // 🔧 ALTERNATIVE: También guardar el token en la URL como fallback
      // para navegadores que bloquean cookies
      const origin =
        process.env.FRONTEND_URL ||
        process.env.ORIGIN_CORS ||
        "http://localhost:5173"

      // Agregar token como query param para fallback
      const redirectUrl = `${origin}/dashboard?token=${token}`

      console.log("🔄 Redirecting after Google auth to:", redirectUrl)
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

// 🔍 MEJORAR /me endpoint para manejar token desde URL también
router.get("/me", async (req, res) => {
  console.log("=== AUTH DEBUG ===")

  // Intentar obtener token de cookies primero
  let token = req.cookies?.auth_token

  // Si no hay token en cookies, intentar desde query params (fallback)
  if (!token && req.query?.token) {
    token = req.query.token as string
    console.log("🔄 Token obtenido desde URL query param")

    // Si obtenemos token de URL, intentar guardarlo en cookie para próximas requests
    const isProduction = process.env.NODE_ENV === "production"
    const cookieOptions = {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      ...(isProduction
        ? {
            secure: true,
            sameSite: "none" as const
          }
        : {
            secure: false,
            sameSite: "lax" as const
          })
    }
    res.cookie("auth_token", token, cookieOptions)
  }

  console.log("🔑 Token presente:", token ? "✅ Sí" : "❌ No")

  if (!token) {
    console.log("⛔ No hay token en cookies ni URL")
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

    return res.json({user})
  } catch (err: any) {
    console.log("💥 Error al verificar token:", err.message)
    console.log("==================")
    return res.json({user: null})
  }
})

router.get("/failure", (_req, res) =>
  res.status(401).json({error: "Auth failed"})
)

// Función helper para logout mejorada
const performLogout = (req: any, res: any) => {
  if (req.logout) {
    req.logout({keepSessionInfo: false}, () => {})
  }

  // 🔧 Limpiar cookie con las mismas opciones que se usaron para crearla
  const isProduction = process.env.NODE_ENV === "production"
  res.clearCookie("auth_token", {
    httpOnly: true,
    ...(isProduction
      ? {
          secure: true,
          sameSite: "none"
        }
      : {
          secure: false,
          sameSite: "lax"
        })
  })

  if (req.method === "GET") {
    const origin =
      process.env.FRONTEND_URL ||
      process.env.ORIGIN_CORS ||
      "http://localhost:5173"
    res.redirect(origin)
  } else {
    res.json({ok: true})
  }
}

router.get("/logout", performLogout)
router.post("/logout", performLogout)

// import {Router} from "express"
// import passport from "../auth/google.js"
// import jwt from "jsonwebtoken"
// import {prisma} from "../db.js"

// export const router = Router()

// // Verificar si Google Auth está configurado
// const isGoogleAuthConfigured =
//   process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET

// if (isGoogleAuthConfigured) {
//   router.get(
//     "/google",
//     passport.authenticate("google", {scope: ["profile", "email"]})
//   )

//   router.get(
//     "/google/callback",
//     passport.authenticate("google", {failureRedirect: "/auth/failure"}),
//     (req: any, res) => {
//       const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
//       const payload = {id: req.user.id}
//       const token = jwt.sign(payload, JWT_SECRET, {expiresIn: "7d"})

//       // 🔧 Cookies cross-domain
//       const isProduction = process.env.NODE_ENV === "production"

//       res.cookie("auth_token", token, {
//         httpOnly: true,
//         secure: isProduction, // true en HTTPS (producción)
//         sameSite: isProduction ? "none" : "lax", // "none" para cross-domain
//         maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
//       })

//       const origin =
//         process.env.FRONTEND_URL ||
//         process.env.ORIGIN_CORS ||
//         "http://localhost:5173"
//       console.log("🔄 Redirecting after Google auth to:", origin + "/dashboard")
//       res.redirect(origin + "/dashboard")
//     }
//   )
// } else {
//   router.get("/google", (_req, res) => {
//     res.status(501).json({
//       error: "Google Auth not configured",
//       message: "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
//     })
//   })

//   router.get("/google/callback", (_req, res) => {
//     res.status(501).json({
//       error: "Google Auth not configured"
//     })
//   })
// }

// // 🔍 Nueva versión de /me con JWT
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

// router.get("/failure", (_req, res) =>
//   res.status(401).json({error: "Auth failed"})
// )

// // Función helper para logout
// const performLogout = (req: any, res: any) => {
//   if (req.logout) {
//     req.logout({keepSessionInfo: false}, () => {})
//   }

//   // 🔧 Limpiar cookie con las mismas opciones
//   const isProduction = process.env.NODE_ENV === "production"
//   res.clearCookie("auth_token", {
//     httpOnly: true,
//     secure: isProduction,
//     sameSite: isProduction ? "none" : "lax"
//   })

//   // Si es una petición GET, redirigir al home
//   if (req.method === "GET") {
//     const origin =
//       process.env.FRONTEND_URL ||
//       process.env.ORIGIN_CORS ||
//       "http://localhost:5173"
//     res.redirect(origin)
//   } else {
//     // Si es POST, devolver JSON
//     res.json({ok: true})
//   }
// }

// // Logout con GET (para enlaces directos)
// router.get("/logout", performLogout)

// // Logout con POST (para llamadas AJAX)
// router.post("/logout", performLogout)
