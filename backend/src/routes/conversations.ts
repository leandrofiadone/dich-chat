import {Router} from "express"
import {prisma} from "../db.js"
import {authenticate, AuthRequest} from "../middleware/auth.js"

export const router = Router()

// 🔐 POST /api/conversations - Crear o obtener conversación con otro usuario
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const {userId: otherUserId} = req.body

    console.log("\n💬 === CREAR/OBTENER CONVERSACIÓN ===")
    console.log("👤 Usuario actual:", req.user!.email)
    console.log("👥 Crear conversación con:", otherUserId)

    if (!otherUserId) {
      return res.status(400).json({
        error: "userId is required",
        message: "Debes proporcionar el ID del usuario con quien chatear"
      })
    }

    if (currentUserId === otherUserId) {
      return res.status(400).json({
        error: "Cannot chat with yourself",
        message: "No puedes crear una conversación contigo mismo"
      })
    }

    const otherUser = await prisma.user.findUnique({
      where: {id: otherUserId},
      select: {id: true, name: true, email: true, avatarUrl: true}
    })

    if (!otherUser) {
      return res.status(404).json({
        error: "User not found",
        message: "El usuario con el que intentas chatear no existe"
      })
    }

    console.log("✅ Usuario encontrado:", otherUser.name)

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {participantIds: {has: currentUserId}},
          {participantIds: {has: otherUserId}}
        ]
      }
    })

    if (existingConversation) {
      console.log(
        "✅ Conversación existente encontrada:",
        existingConversation.id
      )

      const participants = await prisma.user.findMany({
        where: {id: {in: existingConversation.participantIds}},
        select: {id: true, name: true, email: true, avatarUrl: true, bio: true}
      })

      const lastMessage = await prisma.directMessage.findFirst({
        where: {conversationId: existingConversation.id},
        orderBy: {createdAt: "desc"},
        include: {
          sender: {
            select: {id: true, name: true, avatarUrl: true}
          }
        }
      })

      console.log("=====================================\n")

      return res.json({
        conversation: existingConversation,
        participants,
        lastMessage,
        isNew: false
      })
    }

    console.log("🆕 Creando nueva conversación...")
    const newConversation = await prisma.conversation.create({
      data: {
        participantIds: [currentUserId, otherUserId],
        lastMessageAt: new Date()
      }
    })

    console.log("✅ Conversación creada:", newConversation.id)
    console.log("=====================================\n")

    const participants = await prisma.user.findMany({
      where: {id: {in: newConversation.participantIds}},
      select: {id: true, name: true, email: true, avatarUrl: true, bio: true}
    })

    res.status(201).json({
      conversation: newConversation,
      participants,
      lastMessage: null,
      isNew: true
    })
  } catch (error: any) {
    console.error("❌ Error en POST /conversations:", error)
    console.log("=====================================\n")
    res.status(500).json({
      error: "Failed to create conversation",
      message: error.message
    })
  }
})

// 🔐 GET /api/conversations - Listar conversaciones con contador de no leídos
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    console.log("\n📋 === LISTAR CONVERSACIONES ===")
    console.log("👤 Usuario:", req.user!.email)

    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: {has: userId}
      },
      orderBy: {lastMessageAt: "desc"}
    })

    console.log(`✅ Encontradas ${conversations.length} conversaciones`)

    // Poblar cada conversación con sus datos
    const conversationsWithData = await Promise.all(
      conversations.map(async (conv) => {
        // Participantes
        const participants = await prisma.user.findMany({
          where: {id: {in: conv.participantIds}},
          select: {id: true, name: true, email: true, avatarUrl: true}
        })

        // Último mensaje
        const lastMessage = await prisma.directMessage.findFirst({
          where: {conversationId: conv.id},
          orderBy: {createdAt: "desc"},
          include: {
            sender: {
              select: {id: true, name: true, email: true, avatarUrl: true}
            }
          }
        })

        // ✨ CONTADOR DE MENSAJES NO LEÍDOS
        const unreadCount = await prisma.directMessage.count({
          where: {
            conversationId: conv.id,
            receiverId: userId, // Mensajes dirigidos a mí
            isRead: false // Que no he leído
          }
        })

        return {
          ...conv,
          participants,
          messages: lastMessage ? [lastMessage] : [],
          unreadCount // ⭐ Nuevo campo
        }
      })
    )

    console.log("=====================================\n")

    res.json(conversationsWithData)
  } catch (error: any) {
    console.error("❌ Error en GET /conversations:", error)
    console.log("=====================================\n")
    res.status(500).json({
      error: "Failed to load conversations",
      message: error.message
    })
  }
})

// 🆕 GET /api/conversations/unread-count - Contador total de mensajes no leídos
router.get("/unread-count", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const unreadCount = await prisma.directMessage.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    })

    console.log(
      `📬 Usuario ${req.user!.email} tiene ${unreadCount} mensajes no leídos`
    )

    res.json({count: unreadCount})
  } catch (error: any) {
    console.error("❌ Error obteniendo contador:", error)
    res.status(500).json({error: "Failed to get unread count"})
  }
})

// 🔐 GET /api/conversations/:id - Obtener conversación y marcar como leída
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const {id} = req.params
    const userId = req.user!.id

    console.log("\n🔍 === OBTENER CONVERSACIÓN ===")
    console.log("👤 Usuario:", req.user!.email)
    console.log("💬 Conversación ID:", id)

    const conversation = await prisma.conversation.findUnique({
      where: {id},
      include: {
        messages: {
          orderBy: {createdAt: "asc"},
          include: {
            sender: {
              select: {id: true, name: true, email: true, avatarUrl: true}
            }
          }
        }
      }
    })

    if (!conversation) {
      console.log("❌ Conversación no encontrada")
      return res.status(404).json({
        error: "Conversation not found"
      })
    }

    if (!conversation.participantIds.includes(userId)) {
      console.log("❌ Usuario no autorizado para esta conversación")
      return res.status(403).json({
        error: "Forbidden",
        message: "No tienes acceso a esta conversación"
      })
    }

    console.log(
      `✅ Conversación encontrada con ${conversation.messages.length} mensajes`
    )

    // ✨ MARCAR TODOS LOS MENSAJES COMO LEÍDOS
    const markedAsRead = await prisma.directMessage.updateMany({
      where: {
        conversationId: id,
        receiverId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    if (markedAsRead.count > 0) {
      console.log(`📖 Marcados ${markedAsRead.count} mensajes como leídos`)
    }

    const participants = await prisma.user.findMany({
      where: {id: {in: conversation.participantIds}},
      select: {id: true, name: true, email: true, avatarUrl: true}
    })

    console.log("=====================================\n")

    res.json({
      ...conversation,
      participants
    })
  } catch (error: any) {
    console.error("❌ Error en GET /conversations/:id:", error)
    console.log("=====================================\n")
    res.status(500).json({
      error: "Failed to load conversation",
      message: error.message
    })
  }
})

// 🔐 POST /api/conversations/:id/messages - Enviar mensaje
router.post("/:id/messages", authenticate, async (req: AuthRequest, res) => {
  try {
    const {id: conversationId} = req.params
    const {text} = req.body
    const senderId = req.user!.id

    console.log("\n💬 === ENVIAR MENSAJE ===")
    console.log("👤 Remitente:", req.user!.email)
    console.log("📨 Conversación:", conversationId)

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Text is required",
        message: "El mensaje no puede estar vacío"
      })
    }

    const conversation = await prisma.conversation.findUnique({
      where: {id: conversationId}
    })

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found"
      })
    }

    if (!conversation.participantIds.includes(senderId)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "No eres parte de esta conversación"
      })
    }

    const receiverId = conversation.participantIds.find((id) => id !== senderId)

    if (!receiverId) {
      return res.status(500).json({
        error: "Receiver not found"
      })
    }

    // ✨ Crear mensaje con isRead = false por defecto
    const message = await prisma.directMessage.create({
      data: {
        text: text.trim(),
        conversationId,
        senderId,
        receiverId,
        isRead: false // El receptor aún no lo ha leído
      },
      include: {
        sender: {
          select: {id: true, name: true, email: true, avatarUrl: true}
        }
      }
    })

    // Actualizar lastMessageAt
    await prisma.conversation.update({
      where: {id: conversationId},
      data: {lastMessageAt: new Date()}
    })

    console.log("✅ Mensaje creado:", message.id)
    console.log("=====================================\n")

    res.status(201).json(message)
  } catch (error: any) {
    console.error("❌ Error en POST /conversations/:id/messages:", error)
    console.log("=====================================\n")
    res.status(500).json({
      error: "Failed to send message",
      message: error.message
    })
  }
})

// 🆕 PUT /api/conversations/:id/mark-read - Marcar conversación como leída
router.put("/:id/mark-read", authenticate, async (req: AuthRequest, res) => {
  try {
    const {id} = req.params
    const userId = req.user!.id

    const updated = await prisma.directMessage.updateMany({
      where: {
        conversationId: id,
        receiverId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    console.log(
      `✅ Marcados ${updated.count} mensajes como leídos en conversación ${id}`
    )

    res.json({
      success: true,
      markedCount: updated.count
    })
  } catch (error: any) {
    console.error("❌ Error marcando como leído:", error)
    res.status(500).json({
      error: "Failed to mark as read"
    })
  }
})
