import passport from "passport"
import {Strategy as GoogleStrategy} from "passport-google-oauth20"
import {prisma} from "../db.js"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:8080/auth/google/callback"

// Solo configurar Google Auth si las credenciales están presentes
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  console.log("✅ Configurando Google OAuth...")

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
          }
          return done(null, user)
        } catch (err) {
          return done(err as any, undefined)
        }
      }
    )
  )
} else {
  console.log(
    "⚠️  Google OAuth no configurado - faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET"
  )
  console.log(
    "💡 Agrega las credenciales de Google para habilitar autenticación"
  )
}

export default passport
