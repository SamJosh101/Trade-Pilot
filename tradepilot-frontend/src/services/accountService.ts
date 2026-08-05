import apiClient from '../api/apiClient'
import type { TradingAccount, AccountInput } from '../types/account'

export async function getAll(): Promise<TradingAccount[]> {
  const response = await apiClient.get<TradingAccount[]>('/accounts')
  return response.data
}

export async function getOne(id: string): Promise<TradingAccount> {
  const response = await apiClient.get<TradingAccount>(`/accounts/${id}`)
  return response.data
}

export async function create(input: AccountInput): Promise<TradingAccount> {
  const response = await apiClient.post<TradingAccount>('/accounts', input)
  return response.data
}

export async function update(id: string, input: Partial<AccountInput>): Promise<TradingAccount> {
  const response = await apiClient.put<TradingAccount>(`/accounts/${id}`, input)
  return response.data
}

export async function remove(id: string): Promise<void> {
  await apiClient.delete(`/accounts/${id}`)
}
