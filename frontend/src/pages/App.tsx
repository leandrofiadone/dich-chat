import Header from "../components/Header"
import Chat from "../components/Chat"

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 mx-auto w-full max-w-4xl bg-white overflow-hidden">
          <Chat />
        </div>
      </main>
    </div>
  )
}
