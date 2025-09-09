// 4. frontend/src/components/AuthDebug.tsx - Para ver qué está pasando

import {useMe} from "../hooks/useMe"

export default function AuthDebug() {
  const {user, loading, authSource} = useMe()

  // Solo mostrar en desarrollo
  if (import.meta.env.PROD) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded max-w-48">
      <div>
        Status: {loading ? "Loading..." : user ? "Logged in" : "Not logged"}
      </div>
      {user && <div>Auth: {authSource}</div>}
      {user && <div>User: {user.email}</div>}
      <div>JWT: {localStorage.getItem("auth_token") ? "Yes" : "No"}</div>
      <div>
        Mobile:{" "}
        {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Yes" : "No"}
      </div>
    </div>
  )
}

// Agregar en App.tsx, Dashboard.tsx al final antes del </div> final:
// <AuthDebug />
