import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Direction, TradeInput, TradeResult } from '../types/trade'

type TradeFormProps = {
  initialValues?: Partial<TradeInput>
  onSubmit: (input: TradeInput) => Promise<void>
  submitLabel: string
  isSubmitting: boolean
  availableAccounts: Array<{ id: string; name: string }>
}

export default function TradeForm({
  initialValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  availableAccounts,
}: TradeFormProps) {
  const [accountId, setAccountId] = useState(initialValues?.accountId ?? '')
  const [pair, setPair] = useState(initialValues?.pair ?? '')
  const [direction, setDirection] = useState<Direction>(initialValues?.direction ?? 'BUY')
  const [entry, setEntry] = useState(initialValues?.entry ?? '')
  const [sl, setSl] = useState(initialValues?.sl ?? '')
  const [tp, setTp] = useState(initialValues?.tp ?? '')
  const [timeframe, setTimeframe] = useState(initialValues?.timeframe ?? '')
  const [result, setResult] = useState<TradeResult | ''>(initialValues?.result ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!accountId) {
      newErrors.accountId = 'Account is required'
    }

    if (!pair.trim()) {
      newErrors.pair = 'Pair is required'
    }

    const entryNum = parseFloat(entry)
    if (!entry || isNaN(entryNum) || entryNum <= 0) {
      newErrors.entry = 'Entry must be a positive number'
    }

    const slNum = parseFloat(sl)
    if (!sl || isNaN(slNum) || slNum <= 0) {
      newErrors.sl = 'SL must be a positive number'
    }

    const tpNum = parseFloat(tp)
    if (!tp || isNaN(tpNum) || tpNum <= 0) {
      newErrors.tp = 'TP must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) {
      return
    }

    await onSubmit({
      accountId,
      pair: pair.trim(),
      direction,
      entry: parseFloat(entry),
      sl: parseFloat(sl),
      tp: parseFloat(tp),
      timeframe: timeframe.trim() || undefined,
      result: result || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-left text-sm font-medium text-slate-700">
        Account
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="accountId"
          onChange={(event) => setAccountId(event.target.value)}
          required
          value={accountId}
        >
          <option value="">Select an account</option>
          {availableAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        {errors.accountId && <p className="mt-1 text-sm text-red-600">{errors.accountId}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Pair
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="pair"
          onChange={(event) => setPair(event.target.value)}
          type="text"
          value={pair}
        />
        {errors.pair && <p className="mt-1 text-sm text-red-600">{errors.pair}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Direction
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="direction"
          onChange={(event) => setDirection(event.target.value as Direction)}
          required
          value={direction}
        >
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Entry
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="entry"
          onChange={(event) => setEntry(event.target.value)}
          required
          step="0.0001"
          type="number"
          value={entry}
        />
        {errors.entry && <p className="mt-1 text-sm text-red-600">{errors.entry}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Stop Loss (SL)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="sl"
          onChange={(event) => setSl(event.target.value)}
          required
          step="0.0001"
          type="number"
          value={sl}
        />
        {errors.sl && <p className="mt-1 text-sm text-red-600">{errors.sl}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Take Profit (TP)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="tp"
          onChange={(event) => setTp(event.target.value)}
          required
          step="0.0001"
          type="number"
          value={tp}
        />
        {errors.tp && <p className="mt-1 text-sm text-red-600">{errors.tp}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Timeframe (optional)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="timeframe"
          onChange={(event) => setTimeframe(event.target.value)}
          type="text"
          value={timeframe}
        />
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Result (optional)
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="result"
          onChange={(event) => setResult(event.target.value as TradeResult | '')}
          value={result}
        >
          <option value="">—</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="BE">BE</option>
        </select>
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Notes (optional)
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="notes"
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          value={notes}
        />
      </label>

      <button
        className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  )
}
