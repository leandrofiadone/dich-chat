import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: true
})

// Interceptor para agregar JWT si está disponible
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
    console.log("🔑 JWT agregado a request:", token.substring(0, 20) + "...")
  }

  return config
})

// Interceptor para limpiar tokens inválidos
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("auth_token")) {
      console.log("🔑 JWT inválido, eliminando de localStorage")
      localStorage.removeItem("auth_token")
    }
    return Promise.reject(error)
  }
)

export default api
