import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useAccounts } from '../context/AccountContext';
import { useCapability } from '../hooks/useFinancial';
import TradeForm from '../components/TradeForm';
import PerformanceEditor from '../components/PerformanceEditor';
import { PageHeading, Panel, EmptyState, Dialog } from '../components/WorkspaceUI';
import * as financial from '../services/financialService';
import * as legacy from '../services/tradeService';
import type { Trade, TradeInput } from '../types/trade';
import type { Performance } from '../types/financial';
export default function AddTrade() {
    const navigate = useNavigate();
    const { refreshAfterWrite } = useTrades();
    const { activeAccount, isLoading } = useAccounts();
    const capability = useCapability();
    const [saving, setSaving] = useState(false), [error, setError] = useState(''), [actual, setActual] = useState(false), [created, setCreated] = useState<Trade | null>(null), [record, setRecord] = useState<Performance | null>(null), [uncertain, setUncertain] = useState(false), [inspection, setInspection] = useState<Trade[] | null>(null);
    async function save(input: TradeInput) { setSaving(true); setError(''); try {
        const t = capability.data?.writesEnabled ? await financial.createPlan(input) : await legacy.create(input);
        setCreated(t);
        await refreshAfterWrite(input.accountId);
        if (actual && capability.data?.writesEnabled) {
            setRecord(await financial.performance(t.id));
        }
        else
            navigate('/trades');
    }
    catch (e) {
        setError(financial.apiError(e));
        if (financial.responseStatus(e) === undefined)
            setUncertain(true);
    }
    finally {
        setSaving(false);
    } }
    return <>
    <PageHeading title="New trade" description="Record your plan. Review what actually happened separately.">
    <Link className="button ghost" to="/trades">Back to journal</Link>
    </PageHeading>{isLoading && !created ? <p>Loading accounts…</p> : !activeAccount ? <EmptyState title="Create a trading account first" description="A journal entry always belongs to one of your accounts." action={<Link className="button primary" to="/accounts">Create account</Link>}/> : created ? <>
        <Panel title="Journal entry saved">
        <p className="notice success">Your basic trade is saved. Any actual result below is a separate transaction. Do not create the plan again if the financial save fails.</p>
        <Link className="button" to={`/trades/${created.id}/edit`}>Open saved trade</Link>
        <Link className="button ghost" to="/trades">Finish</Link>
        </Panel>{record && <PerformanceEditor key={created.id} trade={created} initial={record} enabled={!!capability.data?.writesEnabled} onSaved={setRecord}/>}</> : <div className="max-w-4xl">
        <Panel title={`Trade plan · ${activeAccount.name}`}>
        <p className="muted mb-6">Prices are kept as exact strings. Legacy outcome is a journal label, never proof of actual P&L.</p>{error && <div role="alert" className="notice error">{error}</div>}{uncertain ? <div className="notice">Creation may have committed. Your draft remains below. <button type="button" className="button" onClick={async () => { try {
            setInspection(await legacy.getAll(activeAccount.id));
        }
        catch (e) {
            setError(financial.apiError(e));
        } }}>Inspect saved account trades</button> before starting another creation. Your form stays here while you inspect.</div> : null}<fieldset disabled={saving || uncertain || capability.loading}>
        <TradeForm key={activeAccount.id} initialValues={{ accountId: activeAccount.id }} accountId={activeAccount.id} isSubmitting={saving} onSubmit={save} submitLabel="Add Trade"/>
        </fieldset>
        <label className="check-field">
        <input type="checkbox" checked={actual} disabled={!capability.data?.writesEnabled} onChange={e => setActual(e.target.checked)}/>Continue to optional actual result after saving the journal entry</label>{!capability.data?.writesEnabled && <p className="muted">Actual-result editing is unavailable. Basic journal entry remains available with legacy price limits (5 integer / 5 fractional digits).</p>}</Panel>
        </div>}{inspection && <Dialog title="Inspect possible committed creation" onClose={() => setInspection(null)}>
        <p className="notice">Compare these saved account records with your preserved form. No creation is retried automatically. Opening a saved record deliberately leaves the creation form.</p>
        <div className="table-scroll">
        <table className="financial-table">
        <thead>
        <tr>
        <th>Logged</th>
        <th>Symbol</th>
        <th>Entry / SL / TP</th>
        <th>Open saved record</th>
        </tr>
        </thead>
        <tbody>{inspection.map(t => <tr key={t.id}>
            <td>{new Date(t.createdAt).toLocaleString()}</td>
            <td>{t.pair}</td>
            <td>{t.entry} / {t.sl} / {t.tp}</td>
            <td>
            <Link className="button" to={`/trades/${t.id}/edit`}>Inspect this saved trade</Link>
            </td>
            </tr>)}</tbody>
        </table>
        </div>
        </Dialog>}</>;
}
