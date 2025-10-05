import {Router} from "express"
import {prisma} from "../db.js"
import {z} from "zod"
import {authenticate, AuthRequest} from "../middleware/auth.js"

export const router = Router()

// Esquema de validación
const BioSchema = z.object({
  bio: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  avatarUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val))
    .or(z.literal("").transform(() => null))
})

// 🔐 RUTA PROTEGIDA: Obtener perfil del usuario actual
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    console.log("\n📋 === GET /api/users/me ===")
    console.log("👤 Usuario autenticado:", req.user?.email)

    const user = await prisma.user.findUnique({
      where: {id: req.user!.id},
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      console.log("❌ Usuario no encontrado en DB")
      return res.status(404).json({error: "User not found"})
    }

    console.log("✅ Usuario encontrado:", {
      id: user.id,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl
    })
    console.log("===============================\n")

    res.json(user)
  } catch (error) {
    console.error("❌ Error en GET /me:", error)
    res.status(500).json({error: "Internal server error"})
  }
})

// 🆕 BÚSQUEDA DE USUARIOS (nuevo endpoint)
router.get("/search", authenticate, async (req: AuthRequest, res) => {
  try {
    const {q} = req.query
    const currentUserId = req.user!.id

    console.log("\n🔍 === SEARCH USERS ===")
    console.log("👤 Usuario buscando:", req.user!.email)
    console.log("🔎 Query:", q)

    // Validar que haya query
    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.json([])
    }

    const searchTerm = q.trim().toLowerCase()

    // Buscar usuarios que coincidan con nombre o email
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {not: currentUserId} // Excluir al usuario actual
          },
          {
            OR: [
              {
                name: {
                  contains: searchTerm,
                  mode: "insensitive"
                }
              },
              {
                email: {
                  contains: searchTerm,
                  mode: "insensitive"
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true
      },
      take: 10 // Limitar a 10 resultados
    })

    console.log(`✅ Encontrados ${users.length} usuarios`)
    console.log("=======================\n")

    res.json(users)
  } catch (error: any) {
    console.error("❌ Error en búsqueda:", error)
    res.status(500).json({
      error: "Search failed",
      message: error.message
    })
  }
})

// 🔐 RUTA PROTEGIDA: Obtener perfil de otro usuario por ID
router.get("/:id", async (req, res) => {
  try {
    const {id} = req.params
    console.log("👤 GET /:id - Buscando usuario:", id)

    const user = await prisma.user.findUnique({
      where: {id},
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({error: "User not found"})
    }

    res.json(user)
  } catch (error) {
    console.error("❌ Error en GET /:id:", error)
    res.status(500).json({error: "Internal server error"})
  }
})

// 🔐 RUTA PROTEGIDA: Actualizar perfil del usuario actual
router.put("/me", authenticate, async (req: AuthRequest, res) => {
  const timestamp = new Date().toISOString().substring(11, 23)

  try {
    console.log(`\n💾 === [${timestamp}] PUT /api/users/me ===`)
    console.log("👤 Usuario:", req.user?.email)
    console.log("📝 Body original:", JSON.stringify(req.body, null, 2))

    const parse = BioSchema.safeParse(req.body)
    if (!parse.success) {
      console.error("❌ Validación fallida:", parse.error.flatten())
      return res.status(400).json({
        error: "Validation failed",
        details: parse.error.flatten()
      })
    }

    console.log("✅ Datos validados:", JSON.stringify(parse.data, null, 2))

    const updateData: any = {}

    if (parse.data.bio !== undefined) {
      updateData.bio = parse.data.bio
    }

    if (parse.data.avatarUrl !== undefined) {
      updateData.avatarUrl = parse.data.avatarUrl
    }

    if (Object.keys(updateData).length === 0) {
      console.log("⚠️ No hay cambios para guardar")
      return res.status(400).json({
        error: "No changes to update",
        message: "No fields provided for update"
      })
    }

    const updated = await prisma.user.update({
      where: {id: req.user!.id},
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        updatedAt: true
      }
    })

    console.log("✅ Usuario actualizado exitosamente")
    console.log("=======================================\n")

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updated,
      changes: updateData
    })
  } catch (error: any) {
    console.error(`❌ [${timestamp}] Error actualizando perfil:`, error)
    console.log("=======================================\n")

    if (error.code === "P2025") {
      return res.status(404).json({
        error: "User not found",
        message: "User does not exist in database"
      })
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Conflict",
        message: "Duplicate value for unique field"
      })
    }

    res.status(500).json({
      error: "Failed to update profile",
      message: error.message,
      code: error.code || "UNKNOWN_ERROR"
    })
  }
})

// 🧪 RUTA DE DEBUG (solo en desarrollo)
if (process.env.NODE_ENV !== "production") {
  router.get("/debug/me", authenticate, async (req: AuthRequest, res) => {
    try {
      console.log("\n🔍 === DEBUG USER ===")

      console.log("🔑 Token info:", {
        userId: req.user?.id,
        email: req.user?.email
      })

      const dbUser = await prisma.user.findUnique({
        where: {id: req.user!.id}
      })

      console.log("🗄️ Usuario en DB:", dbUser)

      const userCount = await prisma.user.count()
      console.log("📊 Total usuarios en DB:", userCount)

      console.log("====================\n")

      res.json({
        tokenUser: req.user,
        dbUser: dbUser,
        totalUsers: userCount,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error("❌ Debug error:", error)
      res.status(500).json({error: "Debug failed"})
    }
  })
}
