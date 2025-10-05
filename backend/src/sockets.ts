// backend/src/sockets.ts
import {Server} from "socket.io"
import type {Server as HttpServer} from "http"
import {prisma} from "./db.js"
import jwt from "jsonwebtoken"

// ✨ CACHÉ EN MEMORIA para conversaciones activas
const conversationCache = new Map<
  string,
  {
    participantIds: string[]
    expiresAt: number
  }
>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Función para verificar acceso (con caché)
async function hasConversationAccess(
  userId: string,
  conversationId: string
): Promise<boolean> {
  // Revisar caché primero
  const cached = conversationCache.get(conversationId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.participantIds.includes(userId)
  }

  // Si no está en caché, consultar BD
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participantIds: {has: userId}
    },
    select: {participantIds: true}
  })

  if (conv) {
    // Guardar en caché
    conversationCache.set(conversationId, {
      participantIds: conv.participantIds,
      expiresAt: Date.now() + CACHE_TTL
    })
    return true
  }

  return false
}

// Limpiar caché cada 10 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of conversationCache.entries()) {
    if (value.expiresAt < now) {
      conversationCache.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function setupSockets(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN_CORS || "http://localhost:5173",
      credentials: true
    },
    // ✨ OPTIMIZACIÓN: Configuración de transporte
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.cookie?.match(/auth_token=([^;]+)/)?.[1]

    if (!token) {
      return next(new Error("Authentication required"))
    }

    try {
      const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt"
      const decoded = jwt.verify(token, JWT_SECRET) as {id: string}

      const user = await prisma.user.findUnique({
        where: {id: decoded.id},
        select: {id: true, email: true, name: true, avatarUrl: true}
      })

      if (!user) {
        return next(new Error("User not found"))
      }

      socket.data.user = user
      next()
    } catch (err: any) {
      return next(new Error("Invalid token"))
    }
  })

  io.on("connection", (socket) => {
    const user = socket.data.user
    console.log(`✅ Socket conectado: ${user.email}`)

    // ====================================
    // MURO PÚBLICO (sin cambios)
    // ====================================
    socket.on("chat:message", async (payload: {text: string}) => {
      if (!payload?.text) return

      try {
        const message = await prisma.message.create({
          data: {
            text: payload.text,
            userId: user.id
          },
          include: {user: true}
        })

        io.emit("chat:message", message)
      } catch (error) {
        console.error("❌ Error en chat público:", error)
      }
    })

    // ====================================
    // MENSAJERÍA PRIVADA OPTIMIZADA
    // ====================================

    // ✨ Unirse a conversación (con caché)
    socket.on("join-conversation", async (conversationId: string) => {
      if (!conversationId) return

      const hasAccess = await hasConversationAccess(user.id, conversationId)

      if (!hasAccess) {
        console.log(`❌ ${user.email} sin acceso a ${conversationId}`)
        return
      }

      socket.join(conversationId)
      console.log(`👤 ${user.email} → ${conversationId.substring(0, 8)}`)
    })

    // Salir de conversación
    socket.on("leave-conversation", (conversationId: string) => {
      if (!conversationId) return
      socket.leave(conversationId)
      console.log(`👋 ${user.email} salió de ${conversationId.substring(0, 8)}`)
    })

    // ✨ Mensaje directo (SIN validación redundante)
    socket.on(
      "direct-message",
      async (payload: {conversationId: string; message: any}) => {
        if (!payload?.conversationId || !payload?.message) return

        const {conversationId, message} = payload

        // ✅ Confiar en la validación del endpoint HTTP
        // El mensaje ya fue guardado en BD por el POST
        socket.to(conversationId).emit("direct-message", message)

        console.log(
          `💬 Mensaje de ${user.name} → ${conversationId.substring(0, 8)}`
        )
      }
    )

    // ✨ Indicador "escribiendo" (sin validación de BD)
    socket.on("typing", (payload: {conversationId: string}) => {
      if (!payload?.conversationId) return

      socket.to(payload.conversationId).emit("user-typing", {
        userId: user.id,
        userName: user.name
      })
    })

    socket.on("stop-typing", (payload: {conversationId: string}) => {
      if (!payload?.conversationId) return

      socket.to(payload.conversationId).emit("user-stopped-typing", {
        userId: user.id
      })
    })

    socket.on("disconnect", () => {
      console.log(`❌ Socket desconectado: ${user.email}`)
    })
  })

  console.log("✅ Socket.IO configurado (optimizado)")
}
