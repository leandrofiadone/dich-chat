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

    // Validación: userId es requerido
    if (!otherUserId) {
      console.log("❌ userId faltante")
      return res.status(400).json({
        error: "userId is required",
        message: "Debes proporcionar el ID del usuario con quien chatear"
      })
    }

    // Validación: no puedes chatear contigo mismo
    if (currentUserId === otherUserId) {
      console.log("❌ Intento de chatear consigo mismo")
      return res.status(400).json({
        error: "Cannot chat with yourself",
        message: "No puedes crear una conversación contigo mismo"
      })
    }

    // Validación: el otro usuario debe existir
    const otherUser = await prisma.user.findUnique({
      where: {id: otherUserId},
      select: {id: true, name: true, email: true, avatarUrl: true}
    })

    if (!otherUser) {
      console.log("❌ Usuario no encontrado:", otherUserId)
      return res.status(404).json({
        error: "User not found",
        message: "El usuario con el que intentas chatear no existe"
      })
    }

    console.log("✅ Usuario encontrado:", otherUser.name)

    // 🔍 Buscar conversación existente entre ambos usuarios
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

      // Obtener participantes
      const participants = await prisma.user.findMany({
        where: {id: {in: existingConversation.participantIds}},
        select: {id: true, name: true, email: true, avatarUrl: true, bio: true}
      })

      // Obtener último mensaje
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

    // 🆕 Crear nueva conversación
    console.log("🆕 Creando nueva conversación...")
    const newConversation = await prisma.conversation.create({
      data: {
        participantIds: [currentUserId, otherUserId],
        lastMessageAt: new Date()
      }
    })

    console.log("✅ Conversación creada:", newConversation.id)
    console.log("=====================================\n")

    // Obtener participantes
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

// 🔐 GET /api/conversations - Listar conversaciones del usuario actual
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    console.log("\n📋 === LISTAR CONVERSACIONES ===")
    console.log("👤 Usuario:", req.user!.email)

    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: {has: userId}
      },
      orderBy: {lastMessageAt: "desc"},
      include: {
        messages: {
          take: 1,
          orderBy: {createdAt: "desc"}
        }
      }
    })

    console.log(`✅ Encontradas ${conversations.length} conversaciones`)

    // Poblar participantes para cada conversación
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await prisma.user.findMany({
          where: {id: {in: conv.participantIds}},
          select: {id: true, name: true, email: true, avatarUrl: true}
        })

        return {
          ...conv,
          participants
        }
      })
    )

    console.log("=====================================\n")

    res.json(conversationsWithParticipants)
  } catch (error: any) {
    console.error("❌ Error en GET /conversations:", error)
    console.log("=====================================\n")
    res.status(500).json({
      error: "Failed to load conversations",
      message: error.message
    })
  }
})

// 🔐 GET /api/conversations/:id - Obtener una conversación específica
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

    // Verificar que el usuario sea parte de la conversación
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

    // Obtener participantes
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

// 🔐 POST /api/conversations/:id/messages - Enviar mensaje en una conversación
router.post("/:id/messages", authenticate, async (req: AuthRequest, res) => {
  try {
    const {id: conversationId} = req.params
    const {text} = req.body
    const senderId = req.user!.id

    console.log("\n💬 === ENVIAR MENSAJE ===")
    console.log("👤 Remitente:", req.user!.email)
    console.log("📨 Conversación:", conversationId)
    console.log("📝 Texto:", text)

    // Validación: texto requerido
    if (!text || !text.trim()) {
      console.log("❌ Texto vacío")
      return res.status(400).json({
        error: "Text is required",
        message: "El mensaje no puede estar vacío"
      })
    }

    // Verificar que la conversación existe
    const conversation = await prisma.conversation.findUnique({
      where: {id: conversationId}
    })

    if (!conversation) {
      console.log("❌ Conversación no encontrada")
      return res.status(404).json({
        error: "Conversation not found"
      })
    }

    // Verificar que el usuario es parte de la conversación
    if (!conversation.participantIds.includes(senderId)) {
      console.log("❌ Usuario no autorizado")
      return res.status(403).json({
        error: "Forbidden",
        message: "No eres parte de esta conversación"
      })
    }

    // Obtener el ID del otro participante (receptor)
    const receiverId = conversation.participantIds.find((id) => id !== senderId)

    if (!receiverId) {
      console.log("❌ Receptor no encontrado")
      return res.status(500).json({
        error: "Receiver not found"
      })
    }

    // Crear mensaje
    const message = await prisma.directMessage.create({
      data: {
        text: text.trim(),
        conversationId,
        senderId,
        receiverId
      },
      include: {
        sender: {
          select: {id: true, name: true, email: true, avatarUrl: true}
        }
      }
    })

    // Actualizar lastMessageAt de la conversación
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
