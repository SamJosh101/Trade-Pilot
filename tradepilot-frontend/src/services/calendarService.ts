import apiClient from '../api/apiClient'
import type { CalendarResponse } from '../types/trade'

export async function getCalendar(month?: string): Promise<CalendarResponse> {
  const response = await apiClient.get<CalendarResponse>('/analytics/calendar', {
    params: month ? { month } : undefined,
  })

  return response.data
}
