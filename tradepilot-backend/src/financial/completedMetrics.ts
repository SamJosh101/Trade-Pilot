import {dec,canonical} from './decimal';
export type ClosedResult={id:string;closedAt:string;net:string|null;r:string|null};
// A realized-results curve, never broker equity. Same-time closures are grouped
// before computing drawdown so an arbitrary UUID order cannot manufacture a peak.
export function completedMetrics(rows:ClosedResult[]){
 const known=rows.filter((r):r is ClosedResult&{net:string}=>r.net!==null);
 let wins=dec(0),losses=dec(0),winCount=0,lossCount=0;
 const byTime=new Map<string,ReturnType<typeof dec>>();
 for(const r of known){const n=dec(r.net);if(n.gt(0)){wins=wins.plus(n);winCount++;}else if(n.lt(0)){losses=losses.plus(n.abs());lossCount++;}const time=new Date(r.closedAt).toISOString();byTime.set(time,(byTime.get(time)??dec(0)).plus(n));}
 let cumulative=dec(0),peak=dec(0),worst=dec(0);
 const points=[...byTime].sort(([a],[b])=>a.localeCompare(b)).map(([closedAt,n])=>{cumulative=cumulative.plus(n);if(cumulative.gt(peak))peak=cumulative;const dd=cumulative.minus(peak);if(dd.lt(worst))worst=dd;return{closedAt,cumulativeNet:canonical(cumulative),drawdown:canonical(dd)};});
 const stride=Math.max(1,Math.ceil(points.length/2000));
 const curve=points.filter((_,i)=>i%stride===0||i===points.length-1);
 return {averageWinningNet:winCount?canonical(wins.div(winCount)):null,averageLosingNet:lossCount?canonical(losses.negated().div(lossCount)):null,expectancy:known.length?canonical(wins.minus(losses).div(known.length)):null,profitFactor:lossCount?canonical(wins.div(losses)):null,profitFactorReason:!known.length?'NO_KNOWN_NET':!lossCount?'NO_LOSING_TRADES':null,maxDrawdown:known.length?canonical(worst):null,drawdownPercent:null,curve,curveSampled:stride>1,curveBasis:'Known dated completed net results only; zero initial cumulative P&L; same-time closures grouped; not account equity',excludedUnknownNet:rows.length-known.length};
}
