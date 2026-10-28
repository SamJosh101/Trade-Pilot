import { useState } from 'react';
import { useAccounts } from '../context/AccountContext';
import { useCapability } from '../hooks/useFinancial';
import type { TradingAccount } from '../types/account';
import type { UnitKey } from '../types/financial';
import { denomination, apiError } from '../services/financialService';
import { Field, UnitSelect, Select } from './FinancialFields';
import { unitLabel } from '../utils/decimal';
export default function DenominationForm({ account }: {
    account: TradingAccount;
}) {
    const { fetchAccounts } = useAccounts();
    const capability = useCapability();
    const [unit, setUnit] = useState<UnitKey | null>((account.settlementUnitKey as UnitKey | null) ?? null), [scale, setScale] = useState(account.unitsPerMajor ?? ''), [label, setLabel] = useState(account.denominationLabel ?? ''), [source, setSource] = useState(''), [ack, setAck] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
    async function save() { if (!unit || !ack)
        return; setError(''); setSaving(true); try {
        await denomination(account.id, { settlementUnitKey: unit, unitsPerMajor: scale, denominationLabel: label, source, acknowledged: true });
        await fetchAccounts();
        setSuccess('Denomination confirmation saved. Raw starting balance was not changed.');
    }
    catch (e) {
        setError(apiError(e));
    }
    finally {
        setSaving(false);
    } }
    return <details className="denomination-form">
    <summary>Settlement &amp; denomination · {unitLabel(account.settlementUnitKey)}</summary>
    <p className="muted section-gap">Explicitly confirm units before recording actual results. Account names/types do not establish scale. Once actual financial records exist, these fields are frozen by the backend.</p>{!capability.data?.writesEnabled ? <p className="notice">Denomination editing is read-only: financial writes are disabled.</p> : <>
        <fieldset disabled={saving}>
        <div className="form-grid section-gap">
        <UnitSelect label="Settlement identity" value={unit} onChange={v => { setUnit(v); setAck(false); }}/>
        <Select label="Denomination preset" value={scale === '1' ? 'standard' : scale === '100' ? 'cent' : 'custom'} onChange={v => { setScale(v === 'standard' ? '1' : v === 'cent' ? '100' : ''); setLabel(v === 'standard' ? 'whole units' : v === 'cent' ? 'cent units' : ''); setAck(false); }}>
        <option value="custom">Choose / explicit custom scale</option>
        <option value="standard">Standard: 1 account unit per whole unit</option>
        <option value="cent">Cent: 100 account units per whole unit</option>
        </Select>
        <Field label="Raw account units per whole settlement unit" value={scale} onChange={v => { setScale(v); setAck(false); }}/>
        <Field label="Denomination label" value={label} onChange={setLabel}/>
        <Field label="Confirmation source reference" value={source} onChange={setSource} hint="For example, a statement or the broker account's denomination specification."/>
        </div>
        <label className="check-field">
        <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>I confirm this settlement identity and scale. No historical balance or actual result should be inferred.</label>
        </fieldset>
        <button className="button primary" disabled={saving || !unit || !scale || !label || !source || !ack} onClick={save}>{saving ? 'Saving…' : 'Confirm denomination'}</button>
        </>}{error && <p role="alert" className="notice error">{error}</p>}{success && <p role="status" className="notice success">{success}</p>}</details>;
}
