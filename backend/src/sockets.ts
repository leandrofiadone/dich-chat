import {Server} from "socket.io"
import type {Server as HttpServer} from "http"
import {prisma} from "./db.js"

export function setupSockets(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN_CORS || "http://localhost:5173",
      credentials: true
    }
  })

  io.on("connection", (socket) => {
    console.log("✅ Socket conectado:", socket.id)

    // ====================================
    // MURO PÚBLICO (Chat global existente)
    // ====================================
    socket.on(
      "chat:message",
      async (payload: {userId: string; text: string}) => {
        if (!payload?.userId || !payload?.text) return

        try {
          const message = await prisma.message.create({
            data: {
              text: payload.text,
              userId: payload.userId
            },
            include: {user: true}
          })

          // Broadcast a todos (muro público)
          io.emit("chat:message", message)
          console.log(
            "📢 Mensaje público enviado:",
            message.text.substring(0, 30)
          )
        } catch (error) {
          console.error("❌ Error en chat público:", error)
        }
      }
    )

    // ====================================
    // MENSAJERÍA PRIVADA (Nuevo)
    // ====================================

    // Unirse a una conversación específica
    socket.on("join-conversation", (conversationId: string) => {
      if (!conversationId) return

      socket.join(conversationId)
      console.log(
        `👤 Socket ${socket.id} se unió a conversación ${conversationId}`
      )
    })

    // Salir de una conversación
    socket.on("leave-conversation", (conversationId: string) => {
      if (!conversationId) return

      socket.leave(conversationId)
      console.log(
        `👋 Socket ${socket.id} salió de conversación ${conversationId}`
      )
    })

    // Enviar mensaje directo
    socket.on(
      "direct-message",
      async (payload: {conversationId: string; message: any}) => {
        if (!payload?.conversationId || !payload?.message) return

        const {conversationId, message} = payload

        try {
          // Enviar mensaje solo a los usuarios de esta conversación
          socket.to(conversationId).emit("direct-message", message)

          console.log(
            `💬 Mensaje directo en conversación ${conversationId.substring(
              0,
              8
            )}...`
          )
        } catch (error) {
          console.error("❌ Error en mensaje directo:", error)
        }
      }
    )

    // Desconexión
    socket.on("disconnect", () => {
      console.log("❌ Socket desconectado:", socket.id)
    })
  })

  console.log("✅ Socket.IO configurado")
}
