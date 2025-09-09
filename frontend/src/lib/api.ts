import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: true // 🔧 MANTENER cookies como método principal
})

// 🔧 Interceptor que solo agrega JWT si está disponible y no hay cookies funcionando
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")

  // Solo agregar header si hay token Y no estamos ya enviando uno
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// 🔧 Interceptor para limpiar tokens inválidos
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el backend dice que el JWT es inválido, limpiarlo
    if (error.response?.status === 401 && localStorage.getItem("auth_token")) {
      console.log("🔑 JWT inválido, eliminando de localStorage")
      localStorage.removeItem("auth_token")
    }
    return Promise.reject(error)
  }
)

export default api
