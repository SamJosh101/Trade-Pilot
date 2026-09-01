type MetricCardProps = {
  label: string
  value: string | number
  tone?: 'positive' | 'negative' | 'neutral'
}

const toneClassName = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-text-primary',
}

export default function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className={`mt-3 font-mono-data text-2xl tabular-nums ${toneClassName[tone]}`}>
        {value}
      </p>
    </div>
  )
}