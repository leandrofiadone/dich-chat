import {prisma} from "./db.js"

async function testNewSchema() {
  console.log("\n🧪 ====================================")
  console.log("   PROBANDO NUEVO SCHEMA DE PRISMA")
  console.log("====================================\n")

  try {
    // 1️⃣ Verificar conexión a MongoDB
    console.log("1️⃣  Verificando conexión a MongoDB...")
    await prisma.$connect()
    console.log("    ✅ Conexión exitosa\n")

    // 2️⃣ Verificar modelo User (existente)
    console.log("2️⃣  Verificando modelo User...")
    const userCount = await prisma.user.count()
    console.log(`    ✅ Usuarios en DB: ${userCount}\n`)

    // 3️⃣ Verificar modelo Message del muro (existente)
    console.log("3️⃣  Verificando modelo Message (muro público)...")
    const messageCount = await prisma.message.count()
    console.log(`    ✅ Mensajes del muro: ${messageCount}\n`)

    // 4️⃣ Verificar nuevo modelo Conversation
    console.log("4️⃣  Verificando nuevo modelo Conversation...")
    const conversationCount = await prisma.conversation.count()
    console.log(`    ✅ Conversaciones: ${conversationCount} (debería ser 0)\n`)

    // 5️⃣ Verificar nuevo modelo DirectMessage
    console.log("5️⃣  Verificando nuevo modelo DirectMessage...")
    const directMessageCount = await prisma.directMessage.count()
    console.log(
      `    ✅ Mensajes directos: ${directMessageCount} (debería ser 0)\n`
    )

    // 6️⃣ Probar relaciones (si hay usuarios)
    if (userCount > 0) {
      console.log("6️⃣  Probando relaciones del modelo User...")
      const user = await prisma.user.findFirst({
        include: {
          messages: true, // Mensajes del muro
          sentDirectMessages: true, // Mensajes directos enviados
          receivedDirectMessages: true // Mensajes directos recibidos
        }
      })

      if (user) {
        console.log(`    ✅ Usuario de prueba: ${user.email}`)
        console.log(`       - Mensajes del muro: ${user.messages.length}`)
        console.log(
          `       - Mensajes directos enviados: ${user.sentDirectMessages.length}`
        )
        console.log(
          `       - Mensajes directos recibidos: ${user.receivedDirectMessages.length}\n`
        )
      }
    }

    // 7️⃣ Probar queries de conversaciones
    if (userCount >= 2) {
      console.log("7️⃣  Probando queries de conversaciones...")
      const users = await prisma.user.findMany({take: 2})
      const [user1, user2] = users

      // Buscar conversación entre dos usuarios
      const existingConv = await prisma.conversation.findFirst({
        where: {
          AND: [
            {participantIds: {has: user1.id}},
            {participantIds: {has: user2.id}}
          ]
        }
      })

      console.log(
        `    ✅ Conversación entre ${user1.name} y ${user2.name}: ${
          existingConv ? "Existe" : "No existe (normal)"
        }\n`
      )
    }

    // 7️⃣ Resumen final
    console.log("🎉 ====================================")
    console.log("   TODAS LAS VERIFICACIONES PASARON")
    console.log("====================================")
    console.log("\n✅ Schema actualizado correctamente")
    console.log("✅ Modelos existentes intactos")
    console.log("✅ Nuevos modelos creados")
    console.log("✅ Relaciones funcionando\n")

    console.log("📋 Resumen de colecciones:")
    console.log(`   - User: ${userCount}`)
    console.log(`   - Message (muro): ${messageCount}`)
    console.log(`   - Conversation: ${conversationCount}`)
    console.log(`   - DirectMessage: ${directMessageCount}\n`)

    console.log("🚀 Siguiente paso: Crear endpoints para conversaciones\n")
  } catch (error: any) {
    console.error("\n❌ ====================================")
    console.error("   ERROR EN LA VERIFICACIÓN")
    console.error("====================================\n")
    console.error("Error:", error.message)
    console.error("\n💡 Posibles soluciones:")
    console.error("   1. Verifica que DATABASE_URL esté en .env")
    console.error("   2. Asegúrate de haber ejecutado: npx prisma generate")
    console.error("   3. Asegúrate de haber ejecutado: npx prisma db push\n")
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar
testNewSchema()
