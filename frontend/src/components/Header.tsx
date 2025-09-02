import {Link, useNavigate} from "react-router-dom"
import {useMe} from "../hooks/useMe"
import {useState, useEffect} from "react"

export default function Header() {
  const {user} = useMe()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Función para manejar navegación y cerrar menú
  const handleNavigation = (path: string) => {
    setIsMenuOpen(false)
    if (path.startsWith("http")) {
      // Para enlaces externos como logout y login
      window.location.href = path
    } else {
      // Para rutas internas
      navigate(path)
    }
  }

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
      const header = document.querySelector("header")
      if (isMenuOpen && header && !header.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden" // Prevenir scroll cuando menú está abierto
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = ""
    }
  }, [isMenuOpen])

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 flex-shrink-0 relative z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Mejorado para móvil */}
            <Link
              to="/"
              className="font-bold text-lg sm:text-xl hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => setIsMenuOpen(false)}>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                dich
              </span>
              <span className="text-gray-400 mx-1">-</span>
              <span className="text-gray-900">chat</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Perfil
              </Link>

              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title={
                  soundEnabled
                    ? "Silenciar notificaciones"
                    : "Activar notificaciones"
                }>
                {soundEnabled ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm0 0l4.414-4.414M19 12l-4-4m4 4l-4 4"
                    />
                  </svg>
                )}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <img
                      src={user.avatarUrl || "https://placehold.co/32"}
                      className="w-8 h-8 rounded-full ring-2 ring-green-500 ring-offset-2 transition-all hover:ring-offset-1 cursor-pointer"
                      title={`${user.name} - En línea`}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="text-sm text-gray-700 font-medium hidden lg:inline max-w-32 truncate">
                    {user.name}
                  </span>
                  <button
                    onClick={() =>
                      handleNavigation(
                        `${import.meta.env.VITE_API_URL}/auth/logout`
                      )
                    }
                    className="text-gray-600 hover:text-red-600 transition-colors text-sm font-medium">
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    handleNavigation(
                      `${import.meta.env.VITE_API_URL}/auth/google`
                    )
                  }
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  Entrar
                </button>
              )}
            </nav>

            {/* Mobile menu button - Mejorado */}
            <div className="md:hidden flex items-center gap-3">
              {/* Usuario en móvil (compacto) */}
              {user && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img
                      src={user.avatarUrl || "https://placehold.co/24"}
                      className="w-6 h-6 rounded-full ring-1 ring-green-500"
                      title={user.name}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative z-50"
                aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}>
                <svg
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isMenuOpen ? "rotate-90" : "rotate-0"
                  }`}
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
        </div>
      </header>

      {/* Mobile Navigation - Overlay mejorado */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg transform transition-transform duration-200 ease-out ${
            isMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}>
          <div className="px-4 py-6 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* User Info Section */}
            {user && (
              <div className="pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <img
                      src={user.avatarUrl || "https://placehold.co/40"}
                      className="w-10 h-10 rounded-full ring-2 ring-green-500"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    En línea
                  </span>
                  {/* Sound toggle móvil */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={soundEnabled ? "Silenciar" : "Activar sonido"}>
                    {soundEnabled ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm0 0l4.414-4.414M19 12l-4-4m4 4l-4 4"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="space-y-1">
              <button
                onClick={() => handleNavigation("/dashboard")}
                className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium w-full text-left">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Dashboard
              </button>

              <button
                onClick={() => handleNavigation("/profile")}
                className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium w-full text-left">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Perfil
              </button>

              <button
                onClick={() => handleNavigation("/")}
                className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium w-full text-left">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Chat
              </button>
            </nav>

            {/* Auth Section */}
            <div className="pt-6 border-t border-gray-100">
              {user ? (
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/logout`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Cerrar sesión
                </a>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-gray-600 text-sm">
                    Inicia sesión para acceder a todas las funciones
                  </p>
                  <a
                    href={`${import.meta.env.VITE_API_URL}/auth/google`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Iniciar sesión con Google
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
