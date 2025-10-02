import {Server} from "socket.io"
import type {Server as HttpServer} from "http"
import {prisma} from "./db.js"
import jwt from "jsonwebtoken"

export function setupSockets(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN_CORS || "http://localhost:5173",
      credentials: true
    }
  })

  // ✨ MIDDLEWARE DE AUTENTICACIÓN PARA SOCKET.IO
  io.use(async (socket, next) => {
    console.log("\n🔐 === SOCKET AUTH MIDDLEWARE ===")

    // Obtener token del handshake
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.cookie?.match(/auth_token=([^;]+)/)?.[1]

    if (!token) {
      console.log("❌ Socket sin token")
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
        console.log("❌ Usuario no encontrado en DB")
        return next(new Error("User not found"))
      }

      console.log(`✅ Socket autenticado: ${user.email}`)

      // ⭐ Guardar usuario en el socket
      socket.data.user = user
      next()
    } catch (err: any) {
      console.log(`❌ Token inválido: ${err.message}`)
      return next(new Error("Invalid token"))
    }
  })

  io.on("connection", (socket) => {
    const user = socket.data.user
    console.log(`✅ Socket conectado: ${user.email} (${socket.id})`)

    // ====================================
    // MURO PÚBLICO (Chat global)
    // ====================================
    socket.on("chat:message", async (payload: {text: string}) => {
      // ✅ Ahora usamos el userId del usuario autenticado
      const userId = user.id

      if (!payload?.text) {
        console.log("❌ Mensaje sin texto")
        return
      }

      try {
        const message = await prisma.message.create({
          data: {
            text: payload.text,
            userId: userId // ⭐ Usuario verificado
          },
          include: {user: true}
        })

        // Broadcast a todos
        io.emit("chat:message", message)
        console.log(
          `📢 Mensaje público de ${user.name}: ${message.text.substring(0, 30)}`
        )
      } catch (error) {
        console.error("❌ Error en chat público:", error)
      }
    })

    // ====================================
    // MENSAJERÍA PRIVADA
    // ====================================

    // Unirse a una conversación
    socket.on("join-conversation", async (conversationId: string) => {
      if (!conversationId) return

      // ✅ Verificar que el usuario sea parte de la conversación
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participantIds: {has: user.id}
        }
      })

      if (!conversation) {
        console.log(
          `❌ ${user.email} no tiene acceso a conversación ${conversationId}`
        )
        return
      }

      socket.join(conversationId)
      console.log(
        `👤 ${user.email} se unió a conversación ${conversationId.substring(
          0,
          8
        )}...`
      )
    })

    // Salir de una conversación
    socket.on("leave-conversation", (conversationId: string) => {
      if (!conversationId) return
      socket.leave(conversationId)
      console.log(
        `👋 ${user.email} salió de conversación ${conversationId.substring(
          0,
          8
        )}...`
      )
    })

    // Enviar mensaje directo
    socket.on(
      "direct-message",
      async (payload: {conversationId: string; message: any}) => {
        if (!payload?.conversationId || !payload?.message) return

        const {conversationId, message} = payload

        try {
          // ✅ Verificar que el usuario sea parte de la conversación
          const conversation = await prisma.conversation.findFirst({
            where: {
              id: conversationId,
              participantIds: {has: user.id}
            }
          })

          if (!conversation) {
            console.log(
              `❌ ${user.email} intentó enviar mensaje a conversación sin acceso`
            )
            return
          }

          // Enviar mensaje solo a los usuarios de esta conversación
          socket.to(conversationId).emit("direct-message", message)

          console.log(
            `💬 Mensaje directo de ${user.name} en ${conversationId.substring(
              0,
              8
            )}...`
          )
        } catch (error) {
          console.error("❌ Error en mensaje directo:", error)
        }
      }
    )

    // ✨ NUEVO: Indicador de "escribiendo..."
    socket.on("typing", async (payload: {conversationId: string}) => {
      if (!payload?.conversationId) return

      const {conversationId} = payload

      // Verificar acceso
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participantIds: {has: user.id}
        }
      })

      if (!conversation) return

      // Emitir a los demás en la conversación
      socket.to(conversationId).emit("user-typing", {
        userId: user.id,
        userName: user.name
      })
    })

    socket.on("stop-typing", async (payload: {conversationId: string}) => {
      if (!payload?.conversationId) return

      const {conversationId} = payload

      socket.to(conversationId).emit("user-stopped-typing", {
        userId: user.id
      })
    })

    // Desconexión
    socket.on("disconnect", () => {
      console.log(`❌ Socket desconectado: ${user.email} (${socket.id})`)
    })
  })

  console.log("✅ Socket.IO configurado con autenticación")
}
