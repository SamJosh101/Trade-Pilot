import apiClient from '../api/apiClient'
import type { CalendarResponse } from '../types/trade'

export async function getCalendar(month?: string, accountId?: string, signal?: AbortSignal): Promise<CalendarResponse> {
  const params: Record<string, string> = {}
  if (month) params.month = month
  if (accountId) params.accountId = accountId
  const response = await apiClient.get<CalendarResponse>('/analytics/calendar', {
    signal,
    params: Object.keys(params).length > 0 ? params : undefined,
  })

  return response.data
}
