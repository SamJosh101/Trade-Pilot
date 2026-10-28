import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 20000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  // Explicit headers bind operations such as logout to the token that initiated them.
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken=error.config?.headers?.Authorization;
    if (error.response?.status === 401 && sentToken && sentToken === `Bearer ${localStorage.getItem('token')}` && !/\/auth\/(login|register)/.test(error.config?.url??'')) {
      localStorage.removeItem('token')
      window.dispatchEvent(new Event('tradepilot:session-expired'))

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
