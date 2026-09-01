import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  error?: string
  children: ReactNode
}

export default function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="block text-left text-sm text-text-muted">
      {label}
      {children}
      {error && <p className="mt-1 text-sm text-negative">{error}</p>}
    </label>
  )
}

export const inputClasses = "mt-1 w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
