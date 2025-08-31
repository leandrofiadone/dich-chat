# Chat Realtime — React + Vite + TS / Node + TS / Prisma (MongoDB) / Passport Google / Socket.IO

Monorepo con **frontend** (React + Vite + TypeScript + Tailwind + SASS) y **backend** (Express + TS, Prisma para MongoDB, Passport Google OAuth2, Socket.IO).
Diseñado para desplegar **frontend en Vercel** y **backend en Render**.

## Requisitos
- Node 18+
- PNPM o NPM (usa el que prefieras)
- MongoDB Atlas (URI de conexión)
- Credenciales Google OAuth2 (Client ID/Secret)
- OpenSSL (para generar SESSION_SECRET si lo deseas)

## Estructura
```
chat-realtime-prisma/
  frontend/
  backend/
```

## Variables de entorno
Crea los archivos `.env` en **backend** y `.env` (opcional) en **frontend**:

**backend/.env**
```
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:8080/auth/google/callback"
SESSION_SECRET="super-secret-change-me"
ORIGIN_CORS="http://localhost:5173"
JWT_SECRET="change-me-as-well"
```

**frontend/.env**
```
VITE_API_URL="http://localhost:8080"
```

## Instalación local
```bash
# Backend
cd backend
npm install
npx prisma generate
npm run dev

# Frontend (en otra terminal)
cd ../frontend
npm install
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

## Despliegue
### Render (backend)
- Crear Web Service desde repo `backend/` subcarpeta.
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm run start`
- Setear env: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `SESSION_SECRET`, `ORIGIN_CORS`, `JWT_SECRET`.
- Habilitar websockets (Render los soporta por defecto en Web Services).
- Asegura que `GOOGLE_CALLBACK_URL` apunte a `https://<tu-backend>.onrender.com/auth/google/callback`.

### Vercel (frontend)
- Crear proyecto desde `frontend/`.
- Env: `VITE_API_URL` apuntando al backend de Render.
- Build: Vercel detecta Vite; comando por defecto `npm run build`.

## Notas
- El backend usa `cookie-session` + JWT en cookie `auth_token` httpOnly para simplificar. Si prefieres 100% JWT sin sesiones, ajusta `auth.ts`.
- Prisma con MongoDB no usa migraciones SQL; el esquema define la forma y Prisma Client se genera con `npx prisma generate`.
- Socket.IO emite y persiste mensajes en `Message` con referencia al `User`.
- Dashboard incluye edición de bio y avatar (por URL). Puedes integrar un proveedor (Cloudinary) para subida real.
```

