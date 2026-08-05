import apiClient from '../api/apiClient'
import type { Metrics } from '../types/dashboard'

export async function getMetrics(): Promise<Metrics> {
  const response = await apiClient.get<Metrics>('/dashboard/metrics')
  return response.data
}
