import apiClient from '../api/apiClient'
import type { Analytics } from '../types/analytics'

export async function getAnalytics(accountId?: string): Promise<Analytics> {
  const params = accountId ? { accountId } : {}
  const response = await apiClient.get<Analytics>('/analytics', { params })
  return response.data
}
