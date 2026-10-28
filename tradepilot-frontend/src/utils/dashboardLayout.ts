import type { Trade } from '../types/trade';
import { legacyTradeScore } from './tradePerformance';

export const widgetDefinitions = {
  total: { label: 'Total trades', description: 'Count of logged journal entries.', size: 'small', preview: 'count' },
  winRate: { label: 'Journal win rate', description: 'WIN labels as a share of logged entries.', size: 'small', preview: 'rate' },
  score: { label: 'Legacy journal score', description: 'Outcome-weighted planned R, not realized R.', size: 'small', preview: 'number' },
  average: { label: 'Average legacy score', description: 'Legacy score per logged entry.', size: 'small', preview: 'number' },
  open: { label: 'Open positions', description: 'Recorded OPEN status only; missing status stays unknown.', size: 'small', preview: 'count' },
  net: { label: 'Actual net P&L', description: 'Completed net results, separated by settlement unit.', size: 'small', preview: 'number' },
  realizedR: { label: 'Mean realized R', description: 'Known completed R from the financial API.', size: 'small', preview: 'number' },
  netWin: { label: 'Net win rate', description: 'Known completed net results only.', size: 'small', preview: 'rate' },
  activity: { label: 'Legacy score history', description: 'Cumulative journal score over logged dates.', size: 'wide', preview: 'chart' },
  direction: { label: 'Journal outcomes', description: 'WIN, LOSS, break-even and unrecorded labels.', size: 'medium', preview: 'ring' },
  recent: { label: 'Recent trades', description: 'Latest entries in the selected journal scope.', size: 'medium', preview: 'list' },
  calendar: { label: 'Logged trade calendar', description: 'Daily journal activity with a day-details drawer.', size: 'wide', preview: 'calendar' },
} as const;
export type Widget = keyof typeof widgetDefinitions;
export const defaultLayout = Object.keys(widgetDefinitions) as Widget[];
export function readLayout(key: string): Widget[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!Array.isArray(raw)) return [...defaultLayout];
    const expanded = raw.flatMap(w => w === 'legacy' ? ['total','winRate','score','average'] : w === 'realized' ? ['net','realizedR','netWin'] : [w]);
    return [...new Set(expanded.filter((w): w is Widget => typeof w === 'string' && Object.hasOwn(widgetDefinitions,w)))];
  } catch { return [...defaultLayout]; }
}
export type JournalFilter = { pair: string; result: string; direction: string; from: string; to: string };
export const emptyJournalFilter: JournalFilter = { pair: '', result: '', direction: '', from: '', to: '' };
export function matchesJournalFilter(t: Trade, f: JournalFilter) {
  const date = t.createdAt.slice(0,10);
  return (!f.pair || t.pair.toLowerCase().includes(f.pair.toLowerCase())) && (!f.result || (t.result ?? 'UNRECORDED') === f.result) && (!f.direction || t.direction === f.direction) && (!f.from || date >= f.from) && (!f.to || date <= f.to);
}
export function summarizeJournal(trades: Trade[]) {
  const netRR = trades.reduce((sum,t) => sum + legacyTradeScore(t),0);
  let cumulativeRR = 0;
  const pairs = new Map<string,{count:number;score:number}>();
  for(const trade of trades){const p=pairs.get(trade.pair)??{count:0,score:0};p.count++;p.score+=legacyTradeScore(trade);pairs.set(trade.pair,p);}
  const ranked=[...pairs].map(([pair,p])=>({pair,average:Number((p.score/p.count).toFixed(2))})).sort((a,b)=>b.average-a.average);

  return {
    metrics: { totalTrades: trades.length, winRate: trades.length ? trades.filter(t=>t.result==='WIN').length/trades.length*100 : 0, netRR: Number(netRR.toFixed(2)), avgRR: trades.length ? Number((netRR/trades.length).toFixed(2)) : 0, bestPair: ranked[0]?.pair??null, worstPair: ranked.at(-1)?.pair??null },
    analytics: { equityCurve: [...trades].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).map(t=>({date:t.createdAt,cumulativeRR: Number((cumulativeRR += legacyTradeScore(t)).toFixed(2))})), pairBreakdown: [], winLossBreakdown: {win: trades.filter(t=>t.result==='WIN').length,loss:trades.filter(t=>t.result==='LOSS').length,breakEven:trades.filter(t=>t.result==='BE').length,open:trades.filter(t=>!t.result).length}, directionBreakdown: {buy:trades.filter(t=>t.direction==='BUY').length,sell:trades.filter(t=>t.direction==='SELL').length} }
  };
}
