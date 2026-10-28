// Formatting and comparison only. Financial calculation authority stays on the server.
export function validDecimal(value: string, precision = 38, scale = 18, positive = false) {
    if (typeof value !== 'string' || value.length > 128 || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))
        return false;
    const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
    if (whole.replace(/^0+/, '').length > precision - scale || fraction.length > scale)
        return false;
    return !positive || (!value.startsWith('-') && /[1-9]/.test(value));
}
export function compareDecimal(a: string, b: string) {
    const scale = Math.max(a.split('.')[1]?.length ?? 0, b.split('.')[1]?.length ?? 0);
    const integer = (s: string) => { const [w, f = ''] = s.split('.'); return BigInt(w + f.padEnd(scale, '0')); };
    const x = integer(a), y = integer(b);
    return x < y ? -1 : x > y ? 1 : 0;
}
export function formatDecimal(value: string | null | undefined, maxFraction = 12): string {
    if (value == null || typeof value !== 'string')
        return 'Unknown';
    if (!validDecimal(value, 128, 64))
        return value;
    const negative = value.startsWith('-'), [w, f = ''] = value.replace(/^-/, '').split('.');
    const fraction = f.slice(0, maxFraction).replace(/0+$/, '');
    const truncated = f.slice(maxFraction).replace(/0/g, '').length > 0;
    return `${negative ? '-' : ''}${w.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? '.' + fraction : ''}${truncated ? '…' : ''}`;
}
// Presentation only: never coerce exact financial strings to floating point.
export const moneyTone = (v: string | null | undefined) => v == null || !validDecimal(v, 128, 64) ? 'performance-unknown' : compareDecimal(v, '0') > 0 ? 'performance-positive' : compareDecimal(v, '0') < 0 ? 'performance-negative' : 'performance-neutral';
// Legacy API statistics are numbers already; no financial amounts are calculated here.
export const scoreTone = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? 'performance-unknown' : v > 0 ? 'performance-positive' : v < 0 ? 'performance-negative' : 'performance-neutral';
export const winRateGuidance = 'Win-rate display guide: below 40% low, 40–60% middle, above 60% high. Zero is neutral; unknown is muted. Win rate alone does not establish profitability.';
export function winRateTone(v: string | number | null | undefined) {
    const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : v;
    if (typeof s !== 'string' || !validDecimal(s, 128, 64) || compareDecimal(s, '0') < 0 || compareDecimal(s, '100') > 0) return 'performance-unknown';
    if (compareDecimal(s, '0') === 0) return 'performance-neutral';
    return compareDecimal(s, '60') > 0 ? 'performance-positive' : compareDecimal(s, '40') < 0 ? 'performance-negative' : 'performance-middle';
}
export const unitLabel = (u: string | null | undefined) => !u ? 'Unconfirmed' : u.startsWith('ISO:') ? u.slice(4) : u.startsWith('TOKEN:Tether:USDT:') ? `USDT · ${u.split(':').at(-1)}` : u;
export function localDateTime(value: string | null) { if (!value)
    return ''; const d = new Date(value); const offset = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - offset).toISOString().slice(0, 23); }
export const utcInstant = (value: string) => value ? new Date(value).toISOString() : null;
export function plannedRatio(direction: 'BUY' | 'SELL', entry: string, sl: string, tp: string): string | null {
    if (![entry, sl, tp].every(v => validDecimal(v, 38, 18, true)))
        return null;
    if (direction === 'BUY' ? (compareDecimal(sl, entry) >= 0 || compareDecimal(tp, entry) <= 0) : (compareDecimal(sl, entry) <= 0 || compareDecimal(tp, entry) >= 0))
        return null;
    const integer = (s: string) => { const [w, f = ''] = s.split('.'); return BigInt(w + f.padEnd(18, '0')); };
    const e = integer(entry), s = integer(sl), t = integer(tp);
    const risk = e > s ? e - s : s - e, reward = t > e ? t - e : e - t;
    const hundredths = (reward * 200n + risk) / (risk * 2n);
    if (hundredths <= 0n || hundredths >= 100000n)
        return null;
    return `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}`;
}
