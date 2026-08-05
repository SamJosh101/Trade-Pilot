import apiClient from '../api/apiClient'
import type { Analytics } from '../types/analytics'

export async function getAnalytics(): Promise<Analytics> {
  const response = await apiClient.get<Analytics>('/analytics')
  return response.data
}
