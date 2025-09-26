import Header from "../components/Header"
import Chat from "../components/Chat"
import AuthGuard from "../components/AuthGard"

export default function App() {
  return (
    <AuthGuard requireAuth={true}>
      <div
        className="flex flex-col bg-gray-50 overflow-hidden"
        style={{height: "100dvh"}}>
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 mx-auto w-full max-w-4xl bg-white overflow-hidden">
            <Chat />
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
