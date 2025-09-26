import {Router} from "express"
import {prisma} from "../db.js"
import {authenticate, AuthRequest} from "../middleware/auth.js"

export const router = Router()

// 🔐 RUTA PROTEGIDA: Solo usuarios autenticados pueden ver el historial
router.get("/history", authenticate, async (req: AuthRequest, res) => {
  try {
    console.log("📋 GET /history - Usuario:", req.user?.email)

    const messages = await prisma.message.findMany({
      orderBy: {createdAt: "asc"},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true
          }
        }
      },
      take: 100 // Limitar a los últimos 100 mensajes para performance
    })

    console.log(`📨 Enviando ${messages.length} mensajes`)
    res.json(messages)
  } catch (error) {
    console.error("❌ Error obteniendo historial:", error)
    res.status(500).json({error: "Failed to load chat history"})
  }
})
