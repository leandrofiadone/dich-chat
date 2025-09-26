import {Link, useNavigate} from "react-router-dom"
import {useMe} from "../hooks/useMe"
import {useState, useEffect} from "react"
import api from "../lib/api"

export default function Header() {
  const {user} = useMe()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()

  // Cerrar menú móvil al cambiar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById("mobile-menu")
      const button = document.getElementById("mobile-menu-button")

      if (
        isMenuOpen &&
        menu &&
        !menu.contains(event.target as Node) &&
        button &&
        !button.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  // 🔧 FUNCIÓN MEJORADA DE LOGOUT
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoggingOut(true)

    try {
      console.log("🚪 Iniciando logout...")

      // 1. Llamar al endpoint de logout
      await api.post("/auth/logout")

      // 2. Limpiar localStorage
      localStorage.removeItem("auth_token")

      // 3. Cerrar menú móvil si está abierto
      setIsMenuOpen(false)

      console.log("✅ Logout exitoso")

      // 4. Recargar la página para limpiar todo el estado
      window.location.href = "/"
    } catch (error) {
      console.error("❌ Error en logout:", error)
      // Si falla, al menos limpiar localStorage y recargar
      localStorage.removeItem("auth_token")
      window.location.href = "/"
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <header className="bg-white border-b h-14 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="font-bold text-lg">
              dich-chat
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-black text-sm">
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-600 hover:text-black text-sm">
                    Perfil
                  </Link>
                </>
              )}

              {user ? (
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl || "https://placehold.co/28"}
                    className="w-7 h-7 rounded-full"
                    alt={user.name}
                  />
                  <span className="text-sm text-gray-700 max-w-24 truncate">
                    {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-gray-600 hover:text-red-600 text-sm disabled:opacity-50 flex items-center gap-1">
                    {isLoggingOut ? (
                      <>
                        <div className="w-3 h-3 border border-gray-400 border-t-red-600 rounded-full animate-spin"></div>
                        Saliendo...
                      </>
                    ) : (
                      "Salir"
                    )}
                  </button>
                </div>
              ) : (
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/google`}
                  className="px-3 py-1.5 bg-black text-white text-sm rounded">
                  Entrar
                </a>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              id="mobile-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
              aria-label="Menú">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-white border-b shadow-lg relative z-50">
          <div className="px-4 py-4 space-y-3">
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 pb-3 border-b">
                <img
                  src={user.avatarUrl || "https://placehold.co/32"}
                  className="w-8 h-8 rounded-full"
                  alt={user.name}
                />
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            {user && (
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded">
                  Dashboard
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded">
                  Perfil
                </Link>

                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded">
                  Chat
                </Link>
              </div>
            )}

            {/* Auth */}
            <div className="pt-3 border-t">
              {user ? (
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded text-center disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoggingOut ? (
                    <>
                      <div className="w-3 h-3 border border-red-400 border-t-red-600 rounded-full animate-spin"></div>
                      Cerrando sesión...
                    </>
                  ) : (
                    "Cerrar sesión"
                  )}
                </button>
              ) : (
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/google`}
                  className="block px-3 py-2 bg-black text-white rounded text-center">
                  Iniciar sesión
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
