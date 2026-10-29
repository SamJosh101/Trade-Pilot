import OwnedMedia from '../components/OwnedMedia';
import TradeStrategy from '../components/TradeStrategy';
import TradeChecklist from '../components/TradeChecklist';
import { compareDecimal, validDecimal } from '../utils/decimal';
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import TradeForm from '../components/TradeForm';
import PerformanceEditor from '../components/PerformanceEditor';
import { PageHeading, Panel, Dialog, Skeleton } from '../components/WorkspaceUI';
import { useCapability } from '../hooks/useFinancial';
import { useTrades } from '../context/TradeContext';
import { useAccounts } from '../context/AccountContext';
import * as api from '../services/financialService';
import * as legacy from '../services/tradeService';
import type { Trade, TradeInput } from '../types/trade';
import type { Performance } from '../types/financial';
export default function EditTrade() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { refreshAfterWrite } = useTrades();
    const { activeAccountId } = useAccounts();
    const capability = useCapability();
    const [trade, setTrade] = useState<Trade | null>(null), [record, setRecord] = useState<Performance | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [checklistOpen,setChecklistOpen]=useState(false), [strategyOpen,setStrategyOpen]=useState(false), [conflict, setConflict] = useState(false), [latest, setLatest] = useState<Trade | null>(null), [draft, setDraft] = useState<TradeInput | null>(null);
    useEffect(() => { let current = true; if (!id)
        return; setLoading(true); setTrade(null); setRecord(null); api.tradeSnapshot(id).then(({ trade: t, record: p }) => { if (current) {
        setTrade(t);
        setRecord(p);
    } }).catch(async (e) => { if (current && api.responseStatus(e) === 404) {
        try {
            const t = await legacy.getOne(id);
            if (current)
                setTrade(t);
        }
        catch {
            if (current)
                setError('Trade not found');
        }
    }
    else if (current)
        setError(api.apiError(e)); }).finally(() => { if (current)
        setLoading(false); }); return () => { current = false; }; }, [id]);
    async function save(input: TradeInput) { if (!id || !trade)
        return; setDraft(input); setSaving(true); setError(''); try {
        if (capability.data?.writesEnabled)
            await api.updatePlan(id, record?.revision ?? trade.revision ?? 0, input);
        else {
            const changes = Object.fromEntries(Object.entries(input).filter(([key, value]) => { if (['entry', 'sl', 'tp'].includes(key))
                return compareDecimal(String(value), trade[key as 'entry' | 'sl' | 'tp']) !== 0; return (value ?? null) !== (trade[key as keyof Trade] ?? null); })) as Partial<TradeInput>;
            await legacy.update(id, changes, trade.revision);
        }
        await refreshAfterWrite(trade.accountId);
        navigate('/trades');
    }
    catch (e) {
        setError(api.apiError(e));
        if (api.responseStatus(e) === 409 || api.responseStatus(e) === undefined)
            setConflict(true);
    }
    finally {
        setSaving(false);
    } }
    async function inspect() { if (!id)
        return; setSaving(true); try {
        const { trade: t } = await api.tradeSnapshot(id);
        setLatest(t);
    }
    catch (e) {
        setError(api.apiError(e));
    }
    finally {
        setSaving(false);
    } }
    const precisePlan=!!trade&&![trade.entry,trade.sl,trade.tp].every(v=>validDecimal(v,10,5,true));
    const locked = !capability.data?.writesEnabled && (!!record?.performance||precisePlan);
    const wrongScope = !!trade && activeAccountId !== trade.accountId;
    return <>
    <PageHeading title="Edit trade" description="Your plan and actual financial evidence remain separate.">
    <Link className="button ghost" to="/trades">Back to journal</Link>
    </PageHeading>{loading ? <Skeleton /> : trade ? <>
        <div className="max-w-4xl">
        <Panel title={`${trade.pair} · trade plan`}>
        <p className="muted mb-5">Stored planned RR: {trade.rr ?? 'Unknown'}. Planned SL/TP edits never rebase recorded original risk or actual realized R.</p>{error && <div role="alert" className="notice error">{error}</div>}{locked && <div className="notice">Financial writes are disabled. This financially enriched or wide-precision trade is read-only.</div>}{wrongScope && <div className="notice error">Switch back to this trade's account to save. Your draft remains here.</div>}<fieldset disabled={saving || conflict || locked || wrongScope || capability.loading}>
<TradeForm key={id} initialValues={trade} accountId={trade.accountId} onSubmit={save} submitLabel="Save Changes" isSubmitting={saving}/>
        </fieldset>
        <OwnedMedia key={`media:${trade.id}`} target={`trade:${trade.id}`} readOnly={wrongScope||saving||conflict} revision={record?.revision??trade.revision} onSaved={revision=>{if(revision!==undefined){setTrade(t=>t?{...t,revision}:t);setRecord(p=>p?{...p,revision}:p);}void refreshAfterWrite(trade.accountId);}}/>
        <button className="button ghost section-gap" onClick={() => { setConflict(true); void inspect(); }}>Inspect latest saved plan</button>
        </Panel><details className="panel section-gap" onToggle={e=>{if(e.currentTarget.open)setChecklistOpen(true);}}><summary>Trading checklist (optional)</summary>{checklistOpen&&<TradeChecklist key={id} tradeId={trade.id} accountId={trade.accountId} onSaved={revision=>{setTrade(t=>t?{...t,revision}:t);setRecord(p=>p?{...p,revision}:p);}}/>}</details><details className="panel section-gap" onToggle={e=>{if(e.currentTarget.open)setStrategyOpen(true);}}><summary>Strategy assignment (optional)</summary>{strategyOpen&&<TradeStrategy key={id} tradeId={trade.id} accountId={trade.accountId} onSaved={revision=>{setTrade(t=>t?{...t,revision}:t);setRecord(p=>p?{...p,revision}:p);void refreshAfterWrite(trade.accountId);}}/>}</details>{record && <PerformanceEditor key={id} trade={trade} initial={record} enabled={!!capability.data?.writesEnabled} onSaved={r => { setRecord(r); setTrade(t => t ? { ...t, revision: r.revision } : t);void refreshAfterWrite(trade.accountId); }}/>}</div>{conflict && <Dialog title="Reconcile trade changes" onClose={() => setConflict(false)}>
            <p className="notice">Your draft has been preserved. Loading a newer revision does not automatically retry your save.</p>
            <button className="button" disabled={saving} onClick={inspect}>Inspect latest saved version</button>{latest && <>
                <div className="conflict-grid section-gap">
                <div>
                <h3>Your unsaved plan</h3>
                <pre>{JSON.stringify(draft, null, 2)}</pre>
                </div>
                <div>
                <h3>Latest saved · revision {latest.revision}</h3>
                <pre>{JSON.stringify(latest, null, 2)}</pre>
                </div>
                </div>
                <button className="button primary" onClick={async () => { setTrade(t => t ? { ...t, revision: latest.revision } : t); setRecord(p => p ? { ...p, revision: latest.revision! } : p); setConflict(false); setLatest(null); setError('Draft preserved. Review it and deliberately save against the inspected revision.'); }}>Keep draft and use inspected revision</button>
                </>}</Dialog>}</> : <div className="notice error">{error || 'Trade not found'}</div>}</>;
}
