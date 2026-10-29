import { useState } from 'react';
import type { Aggregate, Execution, Charge, Performance, Preview, UnitKey, Status } from '../types/financial';
import type { Trade } from '../types/trade';
import { useAccounts } from '../context/AccountContext';
import { useTrades } from '../context/TradeContext';
import * as api from '../services/financialService';
import { Field, Select, UnitSelect, FxEditor } from './FinancialFields';
import { formatDecimal, localDateTime, utcInstant, unitLabel } from '../utils/decimal';
import { Dialog, Panel } from './WorkspaceUI';
import PerformanceView from './PerformanceView';
const emptyAggregate = (): Aggregate => ({ status: null, source: 'MANUAL', amountUnit: 'SETTLEMENT', initialRiskAmount: null, reportedGrossPnl: null, reportedNetPnl: null, costsComplete: null, openedAt: null, closedAt: null, instrumentSpec: null, confirmation: null, executions: [], charges: [] });
export default function PerformanceEditor({ trade, initial, enabled, onSaved }: {
    trade: Trade;
    initial: Performance;
    enabled: boolean;
    onSaved: (r: Performance) => void;
}) {
    const { activeAccount, activeAccountId } = useAccounts();
    const { refreshAfterWrite } = useTrades();
    const [base, setBase] = useState(initial);
    const [draft, setDraft] = useState<Aggregate>(() => structuredClone(initial.performance ?? emptyAggregate()));
    const [preview, setPreview] = useState<{
        result: Preview;
        payload: Aggregate;
    } | null>(null);
    const [error, setError] = useState(''), [saving, setSaving] = useState(false), [conflict, setConflict] = useState(false), [latest, setLatest] = useState<Performance | null>(null), [success, setSuccess] = useState(''), [suspended, setSuspended] = useState(false);
    const scopeOk = activeAccountId === trade.accountId;
    const target = activeAccount?.settlementUnitKey as UnitKey | null ?? null;
    const change = (next: Partial<Aggregate>) => { setDraft(v => ({ ...v, ...next, correctionToken: null })); setPreview(null); setSuccess(''); };
    function fill(index: number, data: Partial<Execution>) { change({ executions: draft.executions.map((f, i) => i === index ? { ...f, ...data } : f) }); }
    function charge(index: number, data: Partial<Charge>) { change({ charges: draft.charges.map((c, i) => i === index ? { ...c, ...data } : c) }); }
    async function inspect() { setSaving(true); setError(''); try {
        const r = await api.performance(trade.id);
        setLatest(r);
        setConflict(true);
    }
    catch (e) {
        setError(api.apiError(e));
    }
    finally {
        setSaving(false);
    } }
    async function calculate() { setError(''); setSuccess(''); setSaving(true); try {
        const payload = structuredClone(draft);
        delete payload.expectedRevision;
        delete payload.correctionToken;
        const result = await api.preview(trade.id, base.revision, payload);
        setPreview({ result, payload });
    }
    catch (e) {
        setError(api.apiError(e));
        if (api.responseStatus(e) === 503)
            setSuspended(true);
        if (api.responseStatus(e) === 409 || api.responseStatus(e) === undefined)
            setConflict(true);
    }
    finally {
        setSaving(false);
    } }
    async function save() { if (!preview || conflict || !scopeOk)
        return; setSaving(true); setError(''); try {
        const r = await api.savePerformance(trade.id, base.revision, { ...preview.payload, correctionToken: preview.result.correctionToken });
        setBase(r);
        setDraft(structuredClone(r.performance ?? emptyAggregate()));
        setPreview(null);
        onSaved(r);
        await refreshAfterWrite(trade.accountId);
        setSuccess('Actual performance saved.');
    }
    catch (e) {
        setError(api.apiError(e));
        if (api.responseStatus(e) === 503)
            setSuspended(true);
        if (api.responseStatus(e) === 409 || api.responseStatus(e) === undefined)
            setConflict(true);
    }
    finally {
        setSaving(false);
    } }
    if (!enabled)
        return <Panel title="Actual trade result">
        <PerformanceView record={base}/>
        <div className="notice">Actual result recording is currently unavailable. Your existing journal entries remain available.</div>
        </Panel>;
    return <div className="section-gap">
    <details className="form-section" open={!!base.performance}>
    <summary>Actual trade result <span className="muted">— optional · user reported</span>
    </summary>
    <p className="muted">Independent of legacy WIN/LOSS/BE. Amounts stay exact; empty means unknown. Preview validates the whole aggregate before saving.</p>{!scopeOk && <div className="notice error">You switched accounts. Switch back to this trade's account before saving; your draft remains here.</div>}{!target && <div className="notice">Confirm denomination in Accounts before recording actual amounts.</div>}<fieldset disabled={saving || suspended || !scopeOk || !target} className="section-gap">
    <div className="form-grid">
    <Select label="Result source" value={draft.source} onChange={v => change({ source: v as Aggregate['source'], reportedGrossPnl: null, reportedNetPnl: null, confirmation: null })}>
    <option value="MANUAL">Simple manual result</option>
    <option value="EXECUTIONS">Advanced executions</option>
    </Select>
    <Select label="Actual position status" value={draft.status ?? ''} onChange={v => change({ status: (v || null) as Status | null, confirmation: null, ...(v !== 'CLOSED' ? { closedAt: null } : {}) })}>
    <option value="">Unknown / incomplete draft</option>
    <option>OPEN</option>
    <option>PARTIAL</option>
    <option>CLOSED</option>
    </Select>
    <Field label="Initial monetary risk" value={draft.initialRiskAmount ?? ''} onChange={v => change({ initialRiskAmount: v || null })} hint="Fixed original whole-position risk. A correction requires reason and preview."/>
    <Select label="Amount denomination" value={draft.amountUnit} onChange={v => change({ amountUnit: v as Aggregate['amountUnit'] })}>
    <option value="SETTLEMENT">Whole settlement units · {unitLabel(target)}</option>
    <option value="ACCOUNT">Raw account units · scale {activeAccount?.unitsPerMajor ?? 'unknown'}</option>
    </Select>{draft.source === 'MANUAL' && <>
        <Field label="Actual net profit / loss" value={draft.reportedNetPnl ?? ''} onChange={v => change({ reportedNetPnl: v || null })} hint="Signed exact decimal. 0 is a known break-even; blank is unknown."/>
        <Field label="Reported gross P&L (optional)" value={draft.reportedGrossPnl ?? ''} onChange={v => change({ reportedGrossPnl: v || null })}/>
        </>}<Field label="Actual opening time (optional)" type="datetime-local" value={localDateTime(draft.openedAt)} onChange={v => change({ openedAt: utcInstant(v) })} hint="Local time; sent as an explicit UTC instant."/>
    <Field label="Actual closing time (optional)" type="datetime-local" value={localDateTime(draft.closedAt)} onChange={v => change({ closedAt: utcInstant(v) })} disabled={draft.status !== 'CLOSED'}/>
    </div>{draft.source === 'MANUAL' && draft.status && <label className="check-field">
        <input type="checkbox" checked={!!draft.confirmation} onChange={e => change({ confirmation: e.target.checked ? { state: draft.status!, acknowledged: true } : null })}/>I confirm the actual position is {draft.status.toLowerCase()}; this is a user-reported result, independently of the legacy outcome.</label>}
 {draft.source === 'EXECUTIONS' && <details className="form-section" open>
        <summary>Instrument and executions</summary>
        <p className="muted">Only explicitly specified LINEAR instruments. All entries precede exits; no reversals or reentry. Do not infer multipliers from a symbol.</p>
        <div className="form-grid section-gap">
        <Field label="Instrument symbol" value={draft.instrumentSpec?.symbol ?? ''} onChange={v => change({ instrumentSpec: { version: 1, calculationMode: 'LINEAR', quantityUnit: 'BASE_UNITS', quantityStep: '', priceTick: '', contractMultiplier: null, profitUnitKey: target ?? 'ISO:USD', source: '', effectiveAt: '', ...draft.instrumentSpec, symbol: v } })}/>
        <Select label="Quantity unit" value={draft.instrumentSpec?.quantityUnit ?? 'BASE_UNITS'} onChange={v => { if (draft.instrumentSpec)
            change({ instrumentSpec: { ...draft.instrumentSpec, quantityUnit: v as 'BASE_UNITS' | 'LOTS' | 'CONTRACTS' } }); }}>
        <option>BASE_UNITS</option>
        <option>LOTS</option>
        <option>CONTRACTS</option>
        </Select>{(['quantityStep', 'priceTick', 'contractMultiplier', 'source'] as const).map(k => <Field key={k} label={{ quantityStep: 'Quantity step', priceTick: 'Price tick', contractMultiplier: 'Contract multiplier', source: 'Instrument specification source' }[k]} value={draft.instrumentSpec?.[k] ?? ''} onChange={v => { if (draft.instrumentSpec)
                change({ instrumentSpec: { ...draft.instrumentSpec, [k]: v || null } }); }}/>)}<UnitSelect label="Instrument profit unit" value={draft.instrumentSpec?.profitUnitKey ?? null} unknown={false} onChange={v => { if (draft.instrumentSpec && v)
            change({ instrumentSpec: { ...draft.instrumentSpec, profitUnitKey: v } }); }}/>
        <Field label="Specification effective time" type="datetime-local" value={localDateTime(draft.instrumentSpec?.effectiveAt ?? null)} onChange={v => { if (draft.instrumentSpec)
            change({ instrumentSpec: { ...draft.instrumentSpec, effectiveAt: utcInstant(v) ?? '' } }); }}/>
        </div>{draft.executions.map((f, i) => <div className="event-card" key={f.id ?? f.clientRef ?? i}>
            <div className="event-heading">
            <h3>Execution {i + 1}</h3>
            <button className="button ghost" onClick={() => change({ executions: draft.executions.filter((_, n) => n !== i) })}>Remove execution {i + 1}</button>
            </div>
            <div className="form-grid">
            <Select label={`Execution ${i + 1} kind`} value={f.kind} onChange={v => fill(i, { kind: v as Execution['kind'] })}>
            <option>ENTRY</option>
            <option>EXIT</option>
            </Select>
            <Field label={`Execution ${i + 1} price`} value={f.price ?? ''} onChange={v => fill(i, { price: v || null })}/>
            <Field label={`Execution ${i + 1} quantity`} value={f.quantity ?? ''} onChange={v => fill(i, { quantity: v || null })}/>
            <Field label={`Execution ${i + 1} time`} type="datetime-local" value={localDateTime(f.executedAt)} onChange={v => fill(i, { executedAt: utcInstant(v), fxEvidence: null, fxRateToAccount: null })}/>
            <Field label={`Execution ${i + 1} sequence (same-time order)`} value={f.sequence?.toString() ?? ''} onChange={v => fill(i, { sequence: /^\d+$/.test(v) ? Number(v) : null })} hint="Technical integer; required to order tied timestamps."/>
            </div>
            <FxEditor key={`${target}:${f.executedAt}:${draft.instrumentSpec?.profitUnitKey}`} rate={f.fxRateToAccount} evidence={f.fxEvidence} native={draft.instrumentSpec?.profitUnitKey ?? null} target={target} at={f.executedAt} onChange={(fxRateToAccount, fxEvidence) => fill(i, { fxRateToAccount, fxEvidence })}/>
            </div>)}<button className="button" onClick={() => change({ executions: [...draft.executions, { clientRef: crypto.randomUUID(), kind: 'ENTRY', price: null, quantity: null, executedAt: null, sequence: null, fxRateToAccount: null, fxEvidence: null }] })}>Add execution</button>
        </details>}
 {draft.source === 'MANUAL' && draft.executions.length > 0 && <p className="notice">Existing executions are retained as evidence. A manual result cannot contradict known fills.</p>}
 <details className="form-section" open={draft.charges.length > 0}>
    <summary>Trading costs and conversion evidence</summary>
    <Select label="Cost coverage" value={draft.costsComplete === null ? '' : String(draft.costsComplete)} onChange={v => change({ costsComplete: v === '' ? null : v === 'true' })}>
    <option value="">Unknown</option>
    <option value="false">Incomplete costs</option>
    <option value="true">All incurred costs recorded (including explicit none)</option>
    </Select>{draft.charges.map((c, i) => <div className="event-card" key={c.id ?? i}>
        <div className="event-heading">
        <h3>Cost {i + 1}</h3>
        <button className="button ghost" onClick={() => change({ charges: draft.charges.filter((_, n) => n !== i) })}>Remove cost {i + 1}</button>
        </div>
        <div className="form-grid">
        <Select label={`Cost ${i + 1} kind`} value={c.kind} onChange={v => charge(i, { kind: v as Charge['kind'] })}>
        <option>COMMISSION</option>
        <option>SWAP</option>
        <option>OTHER</option>
        </Select>
        <Field label={`Cost ${i + 1} amount`} value={c.amount ?? ''} onChange={v => charge(i, { amount: v || null })} hint="Native whole units. Positive is a cost; negative is a credit."/>
        <UnitSelect label={`Cost ${i + 1} native unit`} value={c.unitKey} onChange={v => charge(i, { unitKey: v, fxEvidence: null, fxRateToAccount: null })}/>
        <Field label={`Cost ${i + 1} time`} type="datetime-local" value={localDateTime(c.occurredAt)} onChange={v => charge(i, { occurredAt: utcInstant(v), fxEvidence: null, fxRateToAccount: null })}/>
        <Select label={`Cost ${i + 1} associated execution`} value={c.executionId ?? c.executionRef ?? ''} onChange={v => { const f = draft.executions.find(e => (e.id ?? e.clientRef) === v); charge(i, { executionId: f?.id ?? null, executionRef: f && !f.id ? f.clientRef ?? null : null }); }}>
        <option value="">Whole trade</option>{draft.executions.map((f, n) => <option key={f.id ?? f.clientRef ?? n} value={f.id ?? f.clientRef}>{n + 1}. {f.kind}</option>)}</Select>
        </div>
        <FxEditor key={`${target}:${c.occurredAt}:${c.unitKey}`} rate={c.fxRateToAccount} evidence={c.fxEvidence} native={c.unitKey} target={target} at={c.occurredAt} onChange={(fxRateToAccount, fxEvidence) => charge(i, { fxRateToAccount, fxEvidence })}/>
        </div>)}<button className="button section-gap" onClick={() => change({ charges: [...draft.charges, { kind: 'COMMISSION', amount: null, unitKey: null, occurredAt: null, fxRateToAccount: null, fxEvidence: null, executionId: null, executionRef: null }] })}>Add trading cost</button>
    </details>
 {base.performance && <Field label="Correction reason (source, instrument or initial risk changes)" value={draft.correctionReason ?? ''} onChange={v => change({ correctionReason: v || null })}/>}
 </fieldset>{error && <div role="alert" className="notice error">{error}</div>}{suspended && <div className="notice">Backend financial writes are now disabled. Your exact draft remains here in read-only form.</div>}{success && <div role="status" className="notice success">{success}</div>}<div className="form-footer">
    <button className="button" disabled={saving} onClick={inspect}>Inspect latest saved result</button>
    <button className="button primary" disabled={saving || suspended || conflict || !scopeOk || !target} onClick={calculate}>{saving ? 'Validating…' : 'Preview actual result'}</button>
    </div>{preview && <Panel title="Backend-validated preview">
        <PerformanceView record={{ tradeId: trade.id, revision: base.revision, performance: preview.payload, derived: preview.result.proposed }}/>{preview.result.correctionRequired && <div className="notice">Correction preview: initial risk {formatDecimal(base.performance?.initialRiskAmount)} → {formatDecimal(preview.payload.initialRiskAmount)}; source {base.performance?.source} → {preview.payload.source}. The exact proposal and revision are bound to the server token.</div>}<button className="button primary section-gap" disabled={saving || suspended || conflict} onClick={save}>{saving ? 'Saving…' : 'Confirm and save actual result'}</button>
        </Panel>}</details>{conflict && <Dialog title="Reconcile actual-result draft" onClose={() => setConflict(false)}>
        <p className="notice">The saved record may have changed. Your entire draft remains untouched. Inspect and compare before deliberately using a new revision. Closing this dialog does not authorize a retry.</p>
        <button className="button" disabled={saving} onClick={inspect}>Load latest saved result</button>{latest && <>
            <div className="conflict-grid section-gap">
            <div>
            <h3>Your unsaved draft</h3>
            <pre>{JSON.stringify(draft, null, 2)}</pre>
            </div>
            <div>
            <h3>Latest saved · revision {latest.revision}</h3>
            <pre>{JSON.stringify(latest.performance, null, 2)}</pre>
            </div>
            </div>
            <button className="button primary" onClick={() => { setBase(latest); setPreview(null); setConflict(false); setLatest(null); setError('Latest revision selected deliberately. Review your draft and preview again.'); }}>Keep my draft and reconcile against this revision</button>
            </>}</Dialog>}</div>;
}
