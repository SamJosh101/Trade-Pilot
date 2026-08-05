import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authService from '../services/authService'
import type { User } from '../types/auth'

type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')

    if (!savedToken) {
      setIsLoading(false)
      return
    }

    setToken(savedToken)

    authService
      .getMe()
      .then((currentUser) => {
        setUser(currentUser)
      })
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password)

    localStorage.setItem('token', response.token)
    setToken(response.token)
    setUser(response.user)
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await authService.register(name, email, password)
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
