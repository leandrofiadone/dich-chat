import {Router} from "express"
import {prisma} from "../db.js"
import {z} from "zod"
import {authenticate, AuthRequest} from "../middleware/auth.js"

export const router = Router()

// Esquema de validación más permisivo para debugging
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

// 🔐 RUTA PROTEGIDA: Actualizar perfil del usuario actual (CON DEBUGGING COMPLETO)
router.put("/me", authenticate, async (req: AuthRequest, res) => {
  const timestamp = new Date().toISOString().substring(11, 23)

  try {
    console.log(`\n💾 === [${timestamp}] PUT /api/users/me ===`)
    console.log("👤 Usuario:", req.user?.email)
    console.log("📝 Body original:", JSON.stringify(req.body, null, 2))
    console.log("🔍 Headers:", {
      "content-type": req.headers["content-type"],
      authorization: req.headers.authorization ? "Bearer xxx..." : "None"
    })

    // Validación
    const parse = BioSchema.safeParse(req.body)
    if (!parse.success) {
      console.error("❌ Validación fallida:", parse.error.flatten())
      return res.status(400).json({
        error: "Validation failed",
        details: parse.error.flatten()
      })
    }

    console.log("✅ Datos validados:", JSON.stringify(parse.data, null, 2))

    // Preparar datos para actualización (SOLO campos que cambiaron)
    const updateData: any = {}

    if (parse.data.bio !== undefined) {
      updateData.bio = parse.data.bio
      console.log(`📝 Bio a actualizar: "${parse.data.bio}"`)
    }

    if (parse.data.avatarUrl !== undefined) {
      updateData.avatarUrl = parse.data.avatarUrl
      console.log(`🖼️ Avatar a actualizar: "${parse.data.avatarUrl}"`)
    }

    // Si no hay nada que actualizar
    if (Object.keys(updateData).length === 0) {
      console.log("⚠️ No hay cambios para guardar")
      return res.status(400).json({
        error: "No changes to update",
        message: "No fields provided for update"
      })
    }

    console.log(
      "🔄 Datos finales para update:",
      JSON.stringify(updateData, null, 2)
    )

    // Verificar que el usuario existe antes de actualizar
    const existingUser = await prisma.user.findUnique({
      where: {id: req.user!.id}
    })

    if (!existingUser) {
      console.log("❌ Usuario no existe en DB:", req.user!.id)
      return res.status(404).json({error: "User not found"})
    }

    console.log("👤 Usuario actual en DB:", {
      id: existingUser.id,
      email: existingUser.email,
      bio: existingUser.bio,
      avatarUrl: existingUser.avatarUrl
    })

    // Actualizar usuario
    console.log("🔄 Ejecutando prisma.user.update...")

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

    console.log("✅ Usuario actualizado exitosamente:")
    console.log("📊 Resultado:", JSON.stringify(updated, null, 2))
    console.log("=======================================\n")

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updated,
      changes: updateData
    })
  } catch (error: any) {
    console.error(`❌ [${timestamp}] Error actualizando perfil:`, error)
    console.error("📊 Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack?.split("\n")[0]
    })
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

      // Información del token
      console.log("🔑 Token info:", {
        userId: req.user?.id,
        email: req.user?.email
      })

      // Usuario en base de datos
      const dbUser = await prisma.user.findUnique({
        where: {id: req.user!.id}
      })

      console.log("🗄️ Usuario en DB:", dbUser)

      // Contar usuarios total
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
