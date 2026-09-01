import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountInput } from '../types/account'
import FormField, { inputClasses } from './FormField'

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
  const [startingBalance, setStartingBalance] = useState(
    initialValues?.startingBalance !== undefined ? String(initialValues.startingBalance) : '',
  )
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
      <FormField label="Name" error={errors.name}>
        <input
          className={inputClasses}
          name="name"
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
      </FormField>

      <FormField label="Broker (optional)">
        <input
          className={inputClasses}
          name="broker"
          onChange={(event) => setBroker(event.target.value)}
          type="text"
          value={broker}
        />
      </FormField>

      <FormField label="Account Type (optional)">
        <input
          className={inputClasses}
          name="accountType"
          onChange={(event) => setAccountType(event.target.value)}
          type="text"
          value={accountType}
        />
      </FormField>

      <FormField label="Starting Balance" error={errors.startingBalance}>
        <input
          className={inputClasses}
          name="startingBalance"
          onChange={(event) => setStartingBalance(event.target.value)}
          required
          step="0.01"
          type="number"
          value={startingBalance}
        />
      </FormField>

      <FormField label="Currency (optional)">
        <input
          className={inputClasses}
          name="currency"
          onChange={(event) => setCurrency(event.target.value)}
          type="text"
          value={currency}
        />
      </FormField>

      <button
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  )
}