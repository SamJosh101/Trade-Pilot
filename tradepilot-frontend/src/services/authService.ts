import apiClient from '../api/apiClient'
import type { AuthResponse, RegisterResponse, User } from '../types/auth'

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', {
    name,
    email,
    password,
  })

  return response.data
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  })

  return response.data
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>('/users/me')

  return response.data
}
