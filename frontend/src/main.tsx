import React from "react"
import ReactDOM from "react-dom/client"
import {createBrowserRouter, RouterProvider} from "react-router-dom"
import App from "./pages/App"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import Conversations from "./pages/Conversations"
import ChatView from "./pages/ChatView"
import "./app.css"

// Componente de error para rutas no encontradas
function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">
          404 - Página no encontrada
        </h1>
        <p className="text-gray-600 mb-8">La página que buscas no existe.</p>
        <a
          href="/"
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
          Volver al inicio
        </a>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    errorElement: <NotFound />
  },
  {
    path: "/profile",
    element: <Profile />,
    errorElement: <NotFound />
  },
  {
    path: "/conversations",
    element: <Conversations />,
    errorElement: <NotFound />
  },
  {
    path: "/chat/:conversationId",
    element: <ChatView />,
    errorElement: <NotFound />
  },
  {
    path: "*",
    element: <NotFound />
  }
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
