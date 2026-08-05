import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountInput } from '../types/account'

type AccountFormProps = {
  initialValues?: Partial<AccountInput>
  onSubmit: (input: AccountInput) => Promise<void>
  submitLabel: string
  isSubmitting: boolean
}

export default function AccountForm({
  initialValues,
  onSubmit,
  submitLabel,
  isSubmitting,
}: AccountFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [broker, setBroker] = useState(initialValues?.broker ?? '')
  const [accountType, setAccountType] = useState(initialValues?.accountType ?? '')
  const [startingBalance, setStartingBalance] = useState(initialValues?.startingBalance ?? '')
  const [currency, setCurrency] = useState(initialValues?.currency ?? 'USD')

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    const balanceNum = parseFloat(startingBalance)
    if (!startingBalance || isNaN(balanceNum) || balanceNum <= 0) {
      newErrors.startingBalance = 'Starting balance must be a positive number'
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
      name: name.trim(),
      broker: broker.trim() || undefined,
      accountType: accountType.trim() || undefined,
      startingBalance: parseFloat(startingBalance),
      currency: currency.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-left text-sm font-medium text-slate-700">
        Name
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="name"
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Broker (optional)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="broker"
          onChange={(event) => setBroker(event.target.value)}
          type="text"
          value={broker}
        />
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Account Type (optional)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="accountType"
          onChange={(event) => setAccountType(event.target.value)}
          type="text"
          value={accountType}
        />
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Starting Balance
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="startingBalance"
          onChange={(event) => setStartingBalance(event.target.value)}
          required
          step="0.01"
          type="number"
          value={startingBalance}
        />
        {errors.startingBalance && <p className="mt-1 text-sm text-red-600">{errors.startingBalance}</p>}
      </label>

      <label className="block text-left text-sm font-medium text-slate-700">
        Currency (optional)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          name="currency"
          onChange={(event) => setCurrency(event.target.value)}
          type="text"
          value={currency}
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
