import apiClient from '../api/apiClient'
import type { Trade, TradeInput } from '../types/trade'

export async function getAll(accountId?: string): Promise<Trade[]> {
  const params = accountId ? { accountId } : {}
  const response = await apiClient.get<Trade[]>('/trades', { params })
  return response.data
}

export async function getOne(id: string): Promise<Trade> {
  const response = await apiClient.get<Trade>(`/trades/${id}`)
  return response.data
}

export async function create(input: TradeInput): Promise<Trade> {
  const response = await apiClient.post<Trade>('/trades', input)
  return response.data
}

export async function update(id: string, input: Partial<TradeInput>, revision?: number): Promise<Trade> {
  const response = await apiClient.put<Trade>(`/trades/${id}`, input, {headers:revision===undefined?{}:{'If-Match':`"trade:${id}:${revision}"`}})
  return response.data
}

export async function remove(id:string,revision:number,confirmationToken:string):Promise<void>{
  await apiClient.delete(`/trades/${id}`,{headers:{'If-Match':`"trade:${id}:${revision}"`},data:{confirmed:true,confirmationToken}})
}
