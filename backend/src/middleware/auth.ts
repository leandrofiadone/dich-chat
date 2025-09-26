// backend/src/middleware/auth.ts
import {Request, Response, NextFunction} from "express"
import jwt from "jsonwebtoken"
import {prisma} from "../db.js"

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    avatarUrl?: string
    bio?: string
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log("\n🔐 === AUTH MIDDLEWARE ===")

  let token = req.cookies?.auth_token
  let authSource = "cookie"

  // Si no hay token en cookies, buscar en headers
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      authSource = "header"
    }
  }

  console.log(`🔑 Token: ${token ? "✅ PRESENTE" : "❌ AUSENTE"}`)
  console.log(`🔑 Fuente: ${authSource}`)

  if (!token) {
    console.log("⛔ Sin token - Acceso denegado")
    console.log("==========================\n")
    return res.status(401).json({
      error: "Authentication required",
      message: "No token provided"
    })
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
    const decoded = jwt.verify(token, JWT_SECRET) as {id: string}

    const user = await prisma.user.findUnique({
      where: {id: decoded.id},
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true
      }
    })

    if (!user) {
      console.log(`❌ Usuario no encontrado - ID: ${decoded.id}`)
      console.log("==========================\n")
      return res.status(401).json({
        error: "User not found",
        message: "Invalid token"
      })
    }

    console.log(`✅ Usuario autenticado: ${user.email}`)
    console.log("==========================\n")

    req.user = user
    next()
  } catch (err: any) {
    console.log(`💥 Token error: ${err.message}`)
    console.log("==========================\n")
    return res.status(401).json({
      error: "Invalid token",
      message: err.message
    })
  }
}
