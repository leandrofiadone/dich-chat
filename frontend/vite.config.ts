import {defineConfig} from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()], // ← Quita la línea de tailwind
  server: {
    port: 5173
  }
})
