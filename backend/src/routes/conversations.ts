// backend/src/routes/conversations.ts
import {Router} from "express"
import {prisma} from "../db.js"
import {authenticate, AuthRequest} from "../middleware/auth.js"

export const router = Router()

// ✨ OPTIMIZADO: Cargar conversaciones con QUERIES EFICIENTES
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // 1️⃣ Obtener conversaciones (ya optimizado con índice)
    const conversations = await prisma.conversation.findMany({
      where: {participantIds: {has: userId}},
      orderBy: {lastMessageAt: "desc"},
      take: 50 // ✨ LÍMITE: Solo las 50 más recientes
    })

    if (conversations.length === 0) {
      return res.json([])
    }

    // 2️⃣ Extraer todos los IDs únicos de participantes
    const allParticipantIds = Array.from(
      new Set(conversations.flatMap((c) => c.participantIds))
    )

    // 3️⃣ Cargar TODOS los usuarios en UNA SOLA QUERY
    const users = await prisma.user.findMany({
      where: {id: {in: allParticipantIds}},
      select: {id: true, name: true, email: true, avatarUrl: true}
    })

    // Crear mapa para acceso rápido
    const userMap = new Map(users.map((u) => [u.id, u]))

    // 4️⃣ Extraer IDs de conversaciones
    const conversationIds = conversations.map((c) => c.id)

    // 5️⃣ Cargar último mensaje de cada conversación (optimizado)
    // Hacemos una query por cada conversación pero de forma paralela
    const lastMessagesPromises = conversationIds.map((convId) =>
      prisma.directMessage.findFirst({
        where: {conversationId: convId},
        orderBy: {createdAt: "desc"},
        select: {
          id: true,
          text: true,
          createdAt: true,
          senderId: true,
          conversationId: true
        }
      })
    )

    const lastMessagesArray = await Promise.all(lastMessagesPromises)

    // Crear mapa de últimos mensajes
    const lastMessageMap = new Map(
      lastMessagesArray
        .filter((msg) => msg !== null)
        .map((msg) => [msg!.conversationId, msg!])
    )

    // 6️⃣ Contar mensajes no leídos en UNA SOLA QUERY
    const unreadCounts = await prisma.directMessage.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: {in: conversationIds},
        receiverId: userId,
        isRead: false
      },
      _count: {id: true}
    })

    const unreadMap = new Map(
      unreadCounts.map((uc) => [uc.conversationId, uc._count.id])
    )

    // 7️⃣ Ensamblar respuesta
    const result = conversations.map((conv) => {
      const participants = conv.participantIds
        .map((id) => userMap.get(id))
        .filter(Boolean)

      const lastMsg = lastMessageMap.get(conv.id)
      const messages = lastMsg
        ? [
            {
              id: lastMsg.id,
              text: lastMsg.text,
              createdAt: lastMsg.createdAt,
              sender: userMap.get(lastMsg.senderId) || {
                id: lastMsg.senderId,
                name: "Usuario",
                email: "",
                avatarUrl: null
              }
            }
          ]
        : []

      return {
        ...conv,
        participants,
        messages,
        unreadCount: unreadMap.get(conv.id) || 0
      }
    })

    console.log(
      `✅ ${conversations.length} conversaciones cargadas (optimizado)`
    )
    res.json(result)
  } catch (error: any) {
    console.error("❌ Error en GET /conversations:", error)
    res.status(500).json({error: "Failed to load conversations"})
  }
})

// ✨ POST /api/conversations - Crear o obtener conversación
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id
    const {userId: otherUserId} = req.body

    if (!otherUserId) {
      return res.status(400).json({error: "userId is required"})
    }

    if (currentUserId === otherUserId) {
      return res.status(400).json({error: "Cannot chat with yourself"})
    }

    const otherUser = await prisma.user.findUnique({
      where: {id: otherUserId},
      select: {id: true, name: true, email: true, avatarUrl: true}
    })

    if (!otherUser) {
      return res.status(404).json({error: "User not found"})
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {participantIds: {has: currentUserId}},
          {participantIds: {has: otherUserId}}
        ]
      }
    })

    if (existingConversation) {
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

      return res.json({
        conversation: existingConversation,
        participants,
        lastMessage,
        isNew: false
      })
    }

    const newConversation = await prisma.conversation.create({
      data: {
        participantIds: [currentUserId, otherUserId],
        lastMessageAt: new Date()
      }
    })

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
    res.status(500).json({error: "Failed to create conversation"})
  }
})

// ✨ OPTIMIZADO: Cargar mensajes con paginación
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const {id} = req.params
    const userId = req.user!.id

    // Query params para paginación
    const limit = parseInt(req.query.limit as string) || 50
    const before = req.query.before as string // ID del mensaje más antiguo

    const conversation = await prisma.conversation.findUnique({
      where: {id}
    })

    if (!conversation || !conversation.participantIds.includes(userId)) {
      return res.status(403).json({error: "Forbidden"})
    }

    // Cargar mensajes con paginación
    const whereClause: any = {conversationId: id}

    // Si hay cursor "before", cargar mensajes anteriores a ese ID
    if (before) {
      whereClause.id = {lt: before}
    }

    const messages = await prisma.directMessage.findMany({
      where: whereClause,
      orderBy: {createdAt: "desc"},
      take: limit,
      include: {
        sender: {
          select: {id: true, name: true, email: true, avatarUrl: true}
        }
      }
    })

    // Invertir para orden cronológico
    messages.reverse()

    // Marcar como leídos (sin await para no bloquear respuesta)
    prisma.directMessage
      .updateMany({
        where: {
          conversationId: id,
          receiverId: userId,
          isRead: false
        },
        data: {isRead: true, readAt: new Date()}
      })
      .catch((err) => console.error("Error marcando leídos:", err))

    const participants = await prisma.user.findMany({
      where: {id: {in: conversation.participantIds}},
      select: {id: true, name: true, email: true, avatarUrl: true}
    })

    res.json({
      ...conversation,
      messages,
      participants,
      hasMore: messages.length === limit
    })
  } catch (error: any) {
    console.error("❌ Error en GET /:id:", error)
    res.status(500).json({error: "Failed to load conversation"})
  }
})

// ✨ POST mensaje
router.post("/:id/messages", authenticate, async (req: AuthRequest, res) => {
  try {
    const {id: conversationId} = req.params
    const {text} = req.body
    const senderId = req.user!.id

    if (!text?.trim()) {
      return res.status(400).json({error: "Text is required"})
    }

    const conversation = await prisma.conversation.findUnique({
      where: {id: conversationId}
    })

    if (!conversation || !conversation.participantIds.includes(senderId)) {
      return res.status(403).json({error: "Forbidden"})
    }

    const receiverId = conversation.participantIds.find((id) => id !== senderId)
    if (!receiverId) {
      return res.status(500).json({error: "Receiver not found"})
    }

    const message = await prisma.directMessage.create({
      data: {
        text: text.trim(),
        conversationId,
        senderId,
        receiverId,
        isRead: false
      },
      include: {
        sender: {
          select: {id: true, name: true, email: true, avatarUrl: true}
        }
      }
    })

    // Actualizar lastMessageAt (sin await)
    prisma.conversation
      .update({
        where: {id: conversationId},
        data: {lastMessageAt: new Date()}
      })
      .catch((err) => console.error("Error actualizando timestamp:", err))

    res.status(201).json(message)
  } catch (error: any) {
    console.error("❌ Error enviando mensaje:", error)
    res.status(500).json({error: "Failed to send message"})
  }
})

// ✨ Contador total
router.get("/unread-count", authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.directMessage.count({
      where: {
        receiverId: req.user!.id,
        isRead: false
      }
    })
    res.json({count})
  } catch (error: any) {
    console.error("❌ Error obteniendo contador:", error)
    res.status(500).json({error: "Failed to get unread count"})
  }
})

// ✨ Marcar conversación como leída
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

    res.json({
      success: true,
      markedCount: updated.count
    })
  } catch (error: any) {
    console.error("❌ Error marcando como leído:", error)
    res.status(500).json({error: "Failed to mark as read"})
  }
})
