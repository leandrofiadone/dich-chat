import {Button} from "@/components/ui/button"
import {Avatar, AvatarImage, AvatarFallback} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {Badge} from "@/components/ui/badge" // Asegurate de importar Badge
import {getInitials} from "../utils/format"

import {Link} from "react-router-dom"
import {useMe} from "../hooks/useMe"
import {useState, useEffect} from "react"
import api from "../lib/api"

export default function Header() {
  const {user} = useMe()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Cerrar menú móvil al cambiar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Contador de mensajes no leídos
  useEffect(() => {
    if (!user) return
    const loadUnreadCount = async () => {
      try {
        const response = await api.get("/api/conversations/unread-count")
        setUnreadCount(response.data.count)
      } catch (error) {
        console.error("Error cargando contador:", error)
      }
    }
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [user])

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
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside)
    else document.removeEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoggingOut(true)
    try {
      await api.post("/auth/logout")
      localStorage.removeItem("auth_token")
      setIsMenuOpen(false)
      window.location.href = "/"
    } catch (error) {
      console.error("❌ Error en logout:", error)
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
            <Link
              to="/"
              className="font-bold text-lg hover:text-gray-700 transition-colors">
              dich-chat
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {user && (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>

                  <Button variant="ghost" asChild className="relative">
                    <Link to="/conversations">
                      Mensajes
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-10 w-10 rounded-full">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile">Perfil</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="text-red-600">
                        {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {!user && (
                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/google`}
                  className="px-3 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors">
                  Entrar
                </a>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              id="mobile-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              aria-label="Menú">
              {user && unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-blue-600 w-2 h-2 rounded-full"></span>
              )}
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
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  Chat
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  Dashboard
                </Link>

                <Link
                  to="/conversations"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  <span>Mensajes</span>
                  {unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  Perfil
                </Link>
              </div>
            )}

            {/* Auth */}
            <div className="pt-3 border-t">
              {user ? (
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded text-center disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
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
                  className="block px-3 py-2 bg-black text-white rounded text-center hover:bg-gray-800 transition-colors">
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
