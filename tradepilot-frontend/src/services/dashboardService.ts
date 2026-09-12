import apiClient from '../api/apiClient'
import type { Metrics } from '../types/dashboard'

export async function getMetrics(accountId?: string): Promise<Metrics> {
  const params = accountId ? { accountId } : {}
  const response = await apiClient.get<Metrics>('/dashboard/metrics', { params })
  return response.data
}
