export default function TestTailwind() {
  return (
    <div className="bg-red-500 text-white p-8 m-4 rounded-lg">
      <h1 className="text-2xl font-bold">TEST TAILWIND</h1>
      <p className="mt-2">
        Si ves esto en ROJO con texto blanco, Tailwind funciona
      </p>
      <div className="bg-blue-600 p-4 mt-4 rounded">
        <span className="text-yellow-300">
          Este debe ser azul con texto amarillo
        </span>
      </div>
    </div>
  )
}
