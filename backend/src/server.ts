import http from "http"
import {app} from "./app.js"
import {setupSockets} from "./sockets.js"
import {prisma} from "./db.js"

const port = process.env.PORT || 8080

const server = http.createServer(app)
setupSockets(server)

// Función para probar la conexión a MongoDB
async function testDatabaseConnection() {
  try {
    console.log("🔄 Probando conexión a MongoDB...")
    await prisma.$connect()
    console.log("✅ MongoDB conectado exitosamente!")

    // Opcional: mostrar conteo de usuarios
    const userCount = await prisma.user.count()
    console.log(`📊 Usuarios en la base de datos: ${userCount}`)
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:")
    console.error(error)
    console.error("🔧 Verifica tu DATABASE_URL en el archivo .env")
  }
}

server.listen(port, async () => {
  console.log(`[server] listening on port ${port}`)

  // Probar conexión a la base de datos al iniciar
  await testDatabaseConnection()
})
