import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import type {Summary} from '../types/financial';
import {formatDecimal,moneyTone} from '../utils/decimal';
export default function RealizedCurve({total}:{total:Summary['totals'][number]}){
 if(!total.curve?.length)return null;
 const data=total.curve.map(p=>({...p,plot:p.cumulativeNet===null?null:Number(p.cumulativeNet)}));
 return <details className="section-gap"><summary>Closed-trade realized curve and exact results</summary>
 <p className="muted section-gap">{total.curveBasis}. {total.excludedUnknownNet??0} unknown net results excluded.{total.curveSampled?' Plot sampled; maximum drawdown uses every recorded result.':''} This is not broker equity or a percentage drawdown.</p>
 <div style={{height:240}} className="section-gap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="closedAt" tickFormatter={v=>String(v).slice(0,10)}/><YAxis/><Tooltip formatter={(_value,_name,item)=>[formatDecimal(item.payload.cumulativeNet),'Cumulative recorded net']}/><Line dataKey="plot" name="Recorded net" stroke="currentColor" dot={data.length===1} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
 <p className="muted">Chart positions are approximate; the table retains exact decimal values.{total.curveSampled?" Table shows the same sampled time points.":""}</p><div className="table-scroll"><table className="financial-table"><thead><tr><th>Actual close (UTC)</th><th>Cumulative net</th><th>Drawdown from recorded peak</th></tr></thead><tbody>{total.curve.map(p=><tr key={p.closedAt}><td>{p.closedAt}</td><td className={moneyTone(p.cumulativeNet)} title={p.cumulativeNet??'Unknown'}>{p.cumulativeNet??'Unknown'}</td><td className={moneyTone(p.drawdown)}>{p.drawdown??'Unknown'}</td></tr>)}</tbody></table></div></details>;
}
