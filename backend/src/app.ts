import "dotenv/config"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import session from "express-session"
import passport from "passport"
import {router as authRouter} from "./routes/auth.js"
import {router as userRouter} from "./routes/users.js"
import {router as chatRouter} from "./routes/chat.js"

// Configuración de CORS para producción
const getAllowedOrigins = () => {
  const origins = []

  // Desarrollo
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:5173")
    origins.push("http://localhost:3000")
  }

  // Producción - Vercel
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  // Dominio personalizado de frontend
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL)
  }

  // Fallback para desarrollo
  const corsOrigin = process.env.ORIGIN_CORS
  if (corsOrigin) {
    origins.push(corsOrigin)
  }

  return origins.length > 0 ? origins : ["http://localhost:5173"]
}

export const app = express()

const allowedOrigins = getAllowedOrigins()
console.log("🌐 CORS allowed origins:", allowedOrigins)

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      // En producción, rechazar orígenes no permitidos
      if (process.env.NODE_ENV === "production") {
        return callback(new Error("Not allowed by CORS"), false)
      }

      // En desarrollo, permitir cualquier origin
      return callback(null, true)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  })
)

app.use(express.json())
app.use(cookieParser())

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true solo en producción con HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" // 'none' para cross-origin en producción
    }
  })
)

app.use(passport.initialize())
app.use(passport.session())

// Health check
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  })
})

// Routes
app.use("/auth", authRouter)
app.use("/api/users", userRouter)
app.use("/api/chat", chatRouter)

// 404 handler
app.use("*", (_req, res) => {
  res.status(404).json({error: "Route not found"})
})
