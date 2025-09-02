import Header from "../components/Header"
import Chat from "../components/Chat"

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />

      <main className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 max-w-4xl mx-auto w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative z-0">
          <Chat />
        </div>
      </main>
    </div>
  )
}
