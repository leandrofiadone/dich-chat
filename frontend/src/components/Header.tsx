import { Link } from 'react-router-dom'
import { useMe } from '../hooks/useMe'

export default function Header() {
  const { user } = useMe()
  return (
    <header className="flex items-center justify-between p-4 shadow bg-white">
      <Link to="/" className="font-semibold">Chat Realtime</Link>
      <nav className="flex items-center gap-4">
        <Link to="/dashboard" className="text-sm">Dashboard</Link>
        <Link to="/profile" className="text-sm">Perfil</Link>
        {user ? (
          <a href={`${import.meta.env.VITE_API_URL}/auth/logout`} className="text-sm">Salir</a>
        ) : (
          <a href={`${import.meta.env.VITE_API_URL}/auth/google`} className="px-3 py-1 rounded bg-black text-white text-sm">Entrar con Google</a>
        )}
      </nav>
    </header>
  )
}
