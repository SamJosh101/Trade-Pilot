import axios from 'axios';
import api from '../api/apiClient';
import type { Aggregate, Capability, Denomination, Performance, Preview, Summary } from '../types/financial';
import type { Trade, TradeInput } from '../types/trade';
import type { TradingAccount } from '../types/account';
const prefix = '/v1.1';
const headers = (id?: string, revision?: number) => ({ 'X-TradePilot-Capability': 'financial-v1.1', ...(id !== undefined && revision !== undefined ? { 'If-Match': `"trade:${id}:${revision}"` } : {}) });
const capabilityRequests = new Map<string, Promise<Capability>>();
export function capabilities(token = '') { const current = capabilityRequests.get(token); if (current)
    return current; const request = api.get<Capability>(`${prefix}/capabilities`, { headers: { 'Cache-Control': 'no-cache' } }).then(r => { if (r.data.protocol !== 'financial-v1.1' || typeof r.data.writesEnabled !== 'boolean' || r.data.calculationVersion !== 'v11-linear-1' || !Array.isArray(r.data.settlementUnits))
    throw new Error('Unsupported financial capability response'); return r.data; }).finally(() => capabilityRequests.delete(token)); capabilityRequests.set(token, request); return request; }
export async function exactTrade(id: string) { const r = await api.get<Trade>(`${prefix}/trades/${id}`); return { ...r.data, etag: r.headers.etag }; }
export async function performance(id: string, signal?: AbortSignal) { const r = await api.get<Performance>(`${prefix}/trades/${id}/performance`, { signal }); return { ...r.data, etag: r.headers.etag }; }
export async function tradeSnapshot(id: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const [trade, record] = await Promise.all([exactTrade(id), performance(id)]);
        if (trade.revision === record.revision)
            return { trade, record };
    }
    throw new Error('The trade is changing while loading. Inspect it again before editing.');
}
export const summary = async (accountId: string, filter?: {
    from?: string;
    to?: string;
}, signal?: AbortSignal) => (await api.get<Summary>(`${prefix}/performance`, { params: { accountId, ...filter }, signal })).data;
export const createPlan = async (body: TradeInput) => (await api.post<Trade>(`${prefix}/trades`, body, { headers: headers() })).data;
export const updatePlan = async (id: string, revision: number, body: Partial<TradeInput>) => (await api.patch<Trade>(`${prefix}/trades/${id}`, body, { headers: headers(id, revision) })).data;
export const savePerformance = async (id: string, revision: number, body: Aggregate) => (await api.put<Performance>(`${prefix}/trades/${id}/performance`, body, { headers: headers(id, revision) })).data;
export const preview = async (id: string, revision: number, body: Aggregate) => (await api.post<Preview>(`${prefix}/trades/${id}/performance/preview`, body, { headers: headers(id, revision) })).data;
export const remove = async (id:string,revision:number,confirmationToken:string) => { await api.delete(`${prefix}/trades/${id}`, {headers:headers(id,revision),data:{confirmed:true,confirmationToken}}); };
export const denomination = async (id: string, body: Denomination) => (await api.put<TradingAccount>(`${prefix}/accounts/${id}/denomination`, body, { headers: headers() })).data;
const descriptions: Record<number, string> = { 400: 'The revision precondition is invalid. Reload the saved version before reconciling.', 404: 'This record is unavailable or you no longer have access.', 409: 'This trade changed elsewhere. Your draft has been preserved.', 413: 'This request is too large. Reduce the events or narrow the reporting period.', 422: 'Check the highlighted information against the financial record rules.', 428: 'A current trade revision is required. Inspect the saved version.', 429: 'Too many requests. Wait a minute before trying again.', 503: 'Financial writes are disabled on this backend. Your draft is preserved.' };
export function apiError(error: unknown) { if (!axios.isAxiosError(error))
    return 'Unable to complete the request. Your draft is preserved.'; if (!error.response)
    return 'Connection interrupted. The operation may have committed. Inspect the saved version before retrying.'; const e = error.response.data?.error; if(e?.code==='FINANCIAL_SCHEMA_UNAVAILABLE')return 'Actual financial results are unavailable until this database receives a separately approved Version 1.1 upgrade. Existing journal records remain available.'; if(error.response.status===400&&typeof e==='string')return e; return `${descriptions[error.response.status] ?? 'Request failed.'} ${typeof e === 'string' ? e : e?.code ?? ''}${typeof e === 'object' && e?.details?.field ? ' · ' + e.details.field : ''}`.trim(); }
export const responseStatus = (e: unknown) => axios.isAxiosError(e) ? e.response?.status : undefined;
