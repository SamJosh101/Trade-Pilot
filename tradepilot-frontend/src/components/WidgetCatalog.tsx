import { Plus, Check, BarChart3, Hash, Percent, CircleDollarSign, CalendarDays, List, CircleDashed, Activity } from 'lucide-react';
import { Dialog } from './WorkspaceUI';
import { defaultLayout, widgetDefinitions, type Widget } from '../utils/dashboardLayout';
const icons = {count: Hash, rate: Percent, number: CircleDollarSign, chart: BarChart3, calendar: CalendarDays, list: List, ring: CircleDashed};
export default function WidgetCatalog({layout, onChange, onClose}: {layout: Widget[]; onChange: (next:Widget[])=>void; onClose:()=>void}) {
  return <Dialog title="Widget catalog" className="widget-catalog" onClose={onClose}>
    <p className="muted">Choose individual cards. Your layout is saved when you select Save layout.</p>
    <div className="widget-catalog-grid">{defaultLayout.map(id=>{const def=widgetDefinitions[id], Icon=['score','average','realizedR'].includes(id)?Activity:icons[def.preview], included=layout.includes(id);return <button key={id} className={`catalog-item ${included?'included':''}`} aria-pressed={included} onClick={()=>onChange(included?layout.filter(w=>w!==id):[...layout,id])}>
      <div className={`catalog-preview preview-${def.preview}`} aria-hidden="true"><Icon size={24} strokeWidth={1.5}/>{def.preview==='chart'?<svg viewBox="0 0 160 50"><path d="M0 40 25 30 50 38 80 12 105 20 130 8 160 4" fill="none" stroke="currentColor" strokeWidth="2"/></svg>:def.preview==='calendar'?<div className="preview-cells">{Array.from({length:21},(_,i)=><i key={i}/>)}</div>:<span>—</span>}</div>
      <div className="catalog-label"><strong>{def.label}</strong>{included?<Check size={16}/>:<Plus size={16}/>}</div><p>{def.description}</p><small>{included?'Added · click to remove':'Add widget'}</small>
    </button>})}</div>
  </Dialog>;
}
