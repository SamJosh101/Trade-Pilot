import { useState } from 'react';
import type { ReactNode } from 'react';
import type { FxEvidence, UnitKey } from '../types/financial';
import { SETTLEMENT_UNITS } from '../types/financial';
import { unitLabel, validDecimal } from '../utils/decimal';
export function Field({ label, value, onChange, type = 'text', hint, required = false, disabled = false }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
}) { const numeric = type === 'text' && !/source|reason|reference|sequence/i.test(label) && /risk|profit|P&L|amount|price|quantity|step|tick|multiplier|units per/i.test(label); const isMoney = /risk|profit|P&L|amount/i.test(label); const scale = /raw account units per/i.test(label) ? 8 : isMoney ? 12 : 18; const precision = /raw account units per/i.test(label) ? 20 : 38; const positive = /risk|quantity|price|step|tick|multiplier|units per/i.test(label); const invalid = numeric && value !== '' && !validDecimal(value, precision, scale, positive); return <label className="field">{label}<input aria-invalid={invalid || undefined} aria-label={label} type={type} value={value} onChange={e => onChange(e.target.value)} required={required} disabled={disabled} inputMode={numeric ? 'decimal' : undefined} step={type === 'datetime-local' ? '0.001' : undefined}/>{hint && <small>{hint}</small>}{invalid && <span className="field-error">Use an exact {positive ? 'positive ' : ''}decimal string with at most {precision - scale} integer and {scale} fractional digits.</span>}</label>; }
export function Select({ label, value, onChange, children, disabled = false }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    children: ReactNode;
    disabled?: boolean;
}) {
    return <label className="field">{label}<select aria-label={label} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>{children}</select>
    </label>;
}
export function UnitSelect({ label, value, onChange, unknown = true }: {
    label: string;
    value: string | null;
    onChange: (v: UnitKey | null) => void;
    unknown?: boolean;
}) {
    return <Select label={label} value={value ?? ''} onChange={v => onChange((v || null) as UnitKey | null)}>{unknown && <option value="">Unknown</option>}{SETTLEMENT_UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}</Select>;
}
export function FxEditor({ rate, evidence, native, target, at, onChange }: {
    rate: string | null;
    evidence: FxEvidence | null;
    native: UnitKey | null;
    target: UnitKey | null;
    at: string | null;
    onChange: (rate: string | null, evidence: FxEvidence | null) => void;
}) {
    const [pending, setPending] = useState<FxEvidence | null>(null);
    const current = evidence ?? pending;
    function evidenceFor(basis: 'IDENTITY' | 'USER_REPORTED', sourceRef = ''): FxEvidence | null { if (!native || !target || !at)
        return null; return { version: 1, basis, fromUnitKey: native, toUnitKey: target, effectiveAt: at, policyVersion: basis === 'IDENTITY' ? 'v11-identity-1' : 'v11-user-event-1', sourceRef, acknowledged: true }; }
    return <details className="section-gap">
    <summary>Conversion evidence {evidence ? '· confirmed' : '· unknown / unconfirmed'}</summary>
    <p className="muted section-gap">{unitLabel(native)} → {unitLabel(target)}. Evidence must match this event's exact time. Unknown conversion is never assumed.</p>
    <div className="form-grid section-gap">
    <Select label="Evidence basis" value={current?.basis ?? ''} onChange={v => { setPending(v ? evidenceFor(v as 'IDENTITY' | 'USER_REPORTED', current?.sourceRef) : null); onChange(v === 'IDENTITY' ? '1' : rate, null); }}>
    <option value="">Unknown / not supplied</option>{native && target && native === target && <option value="IDENTITY">Exact same-unit identity</option>}{native && target && native !== target && <option value="USER_REPORTED">User-reported event rate</option>}</Select>
    <Field label="Whole settlement units per native unit" value={rate ?? ''} onChange={v => { setPending(current); onChange(v || null, null); }} disabled={current?.basis === 'IDENTITY'}/>
    <Field label="Evidence source reference" value={current?.sourceRef ?? ''} onChange={v => { if (current) {
        setPending({ ...current, sourceRef: v });
        onChange(rate, null);
    } }} disabled={!current}/>
    </div>{current && <label className="check-field">
        <input type="checkbox" checked={!!evidence} disabled={!current.sourceRef || !rate} onChange={e => { setPending(current); onChange(rate, e.target.checked ? current : null); }}/>I confirm this exact event conversion and source. This is user-reported evidence.</label>}</details>;
}
