// App.jsx
import Header from "../components/Header"
import Chat from "../components/Chat"
import TestTailwind from "./TestTailwind"

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* <TestTailwind /> */}
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
            Bienvenido 👋
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            Chat en tiempo real con Google OAuth2
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
          <Chat />
        </div>
      </main>
    </div>
  )
}
