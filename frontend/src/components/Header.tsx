import {Link} from "react-router-dom"
import {useMe} from "../hooks/useMe"
import {useState, useEffect} from "react"

export default function Header() {
  const {user} = useMe()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  return (
    <header className="bg-white border-b border-gray-100 h-16 flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo - Always goes to home/chat */}
          <Link
            to="/"
            className="font-bold text-lg hover:opacity-80 transition-opacity">
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
              className="text-gray-600 hover:text-gray-900 transition-colors">
              Dashboard
            </Link>
            <Link
              to="/profile"
              className="text-gray-600 hover:text-gray-900 transition-colors">
              Perfil
            </Link>

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-1"
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
                <div className="relative">
                  <img
                    src={user.avatarUrl || "https://placehold.co/32"}
                    className="w-7 h-7 rounded-full ring-2 ring-green-500 ring-offset-2 transition-all hover:ring-offset-1"
                    title="En línea"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/logout`}
                  className="text-gray-600 hover:text-red-600 transition-colors">
                  Salir
                </a>
              </div>
            ) : (
              <a
                href={`${import.meta.env.VITE_API_URL}/auth/google`}
                className="px-3 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors">
                Entrar
              </a>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg
              className="w-5 h-5 transition-transform duration-200"
              style={{transform: isMenuOpen ? "rotate(90deg)" : "rotate(0deg)"}}
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

        {/* Mobile Navigation */}
        <div
          className={`md:hidden transition-all duration-200 ease-in-out overflow-hidden ${
            isMenuOpen ? "max-h-40 py-3 border-t border-gray-100" : "max-h-0"
          }`}>
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="block text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setIsMenuOpen(false)}>
              Dashboard
            </Link>
            <Link
              to="/profile"
              className="block text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setIsMenuOpen(false)}>
              Perfil
            </Link>
            {user ? (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img
                      src={user.avatarUrl || "https://placehold.co/24"}
                      className="w-6 h-6 rounded-full"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                  </div>
                  <span className="text-sm text-gray-900">{user.name}</span>
                </div>
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/logout`}
                  className="text-gray-600 text-sm hover:text-red-600 transition-colors">
                  Salir
                </a>
              </div>
            ) : (
              <a
                href={`${import.meta.env.VITE_API_URL}/auth/google`}
                className="block px-3 py-2 bg-black text-white text-sm rounded text-center hover:bg-gray-800 transition-colors">
                Entrar con Google
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
