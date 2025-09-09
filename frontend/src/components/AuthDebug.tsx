// OPCIONAL: Componente para debugging - Solo usar en desarrollo

import {useMe} from "../hooks/useMe"

export default function AuthDebug() {
  const {user, loading, authSource} = useMe()

  // Solo mostrar en desarrollo
  if (import.meta.env.PROD) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-3 rounded shadow-lg max-w-64 z-50">
      <div className="font-bold mb-2">🔍 Auth Debug</div>
      <div>
        Status:{" "}
        {loading ? "⏳ Loading..." : user ? "✅ Logged in" : "❌ Not logged"}
      </div>
      {user && <div>Method: {authSource}</div>}
      {user && <div>User: {user.email}</div>}
      <div>JWT: {localStorage.getItem("auth_token") ? "✅ Yes" : "❌ No"}</div>
      <div>
        Mobile:{" "}
        {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          ? "📱 Yes"
          : "💻 No"}
      </div>
      <div>
        iOS:{" "}
        {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? "🍎 Yes" : "❌ No"}
      </div>
    </div>
  )
}

// Para usarlo, agregá al final de App.tsx, Dashboard.tsx, Profile.tsx:
// import AuthDebug from "../components/AuthDebug"
//
// Y antes del </div> final:
// <AuthDebug />
