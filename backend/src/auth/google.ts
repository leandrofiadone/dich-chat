import passport from "passport"
import {Strategy as GoogleStrategy} from "passport-google-oauth20"
import {prisma} from "../db.js"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Configurar callback URL según el entorno
const getCallbackURL = () => {
  // Si hay una URL de backend específica (Render)
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL}/auth/google/callback`
  }

  // En producción, usar la URL de Render
  if (
    process.env.NODE_ENV === "production" &&
    process.env.RENDER_EXTERNAL_URL
  ) {
    return `${process.env.RENDER_EXTERNAL_URL}/auth/google/callback`
  }

  // Fallback para desarrollo
  return (
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:8080/auth/google/callback"
  )
}

const GOOGLE_CALLBACK_URL = getCallbackURL()

// Solo configurar Google Auth si las credenciales están presentes
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  console.log("✅ Configurando Google OAuth...")
  console.log("🔗 Callback URL:", GOOGLE_CALLBACK_URL)

  passport.serializeUser((user: any, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({where: {id}})
      done(null, user)
    } catch (e) {
      done(e, null)
    }
  })

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id
          const email = profile.emails?.[0]?.value || `${googleId}@google.local`
          const name = profile.displayName || "User"
          const avatarUrl = profile.photos?.[0]?.value

          let user = await prisma.user.findUnique({where: {googleId}})
          if (!user) {
            user = await prisma.user.create({
              data: {googleId, email, name, avatarUrl}
            })
            console.log("👤 Nuevo usuario creado:", user.email)
          } else {
            console.log("👤 Usuario existente:", user.email)
          }

          return done(null, user)
        } catch (err) {
          console.error("❌ Error en Google Auth:", err)
          return done(err as any, undefined)
        }
      }
    )
  )
} else {
  console.log("⚠️  Google OAuth no configurado - faltan credenciales")
  console.log("💡 Variables necesarias: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET")
}

export default passport
