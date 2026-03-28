import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8008'

let _currentToken = null

export function setAuthToken(token) {
  _currentToken = token
}

const apiClient = axios.create({
  baseURL: BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  if (_currentToken) {
    config.headers.Authorization = `Bearer ${_currentToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[Aether API] 401 — token missing, expired, or invalid')
    }
    return Promise.reject(error)
  },
)

export default apiClient
