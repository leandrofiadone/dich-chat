import "dotenv/config"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import session from "express-session" // ← Cambio aquí
import passport from "passport"
import {router as authRouter} from "./routes/auth.js"
import {router as userRouter} from "./routes/users.js"
import {router as chatRouter} from "./routes/chat.js"

const ORIGIN = process.env.ORIGIN_CORS || "http://localhost:5173"

export const app = express()

app.use(
  cors({
    origin: ORIGIN,
    credentials: true
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
      secure: false, // true en producción con HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  })
)

app.use(passport.initialize())
app.use(passport.session())

// routes
app.use("/auth", authRouter)
app.use("/api/users", userRouter)
app.use("/api/chat", chatRouter)

app.get("/health", (_req, res) => res.json({ok: true}))
