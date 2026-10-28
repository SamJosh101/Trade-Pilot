type MetricCardProps = {
  label: string
  value: string | number
  tone?: 'positive' | 'negative' | 'neutral' | 'info'
  size?: 'regular' | 'hero'
  subtitle?: string
}

const toneClassName = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-text-primary',
  info: 'text-info',
}

const sizeClassName = {
  regular: 'text-2xl',
  hero: 'text-[42px]',
}

export default function MetricCard({ label, value, tone = 'neutral', size = 'regular', subtitle }: MetricCardProps) {
  const labelClass = size === 'hero' 
    ? 'text-xs font-medium uppercase tracking-wider text-text-muted'
    : 'text-xs font-medium text-text-muted'

  return (
    <div className="rounded-card border border-border bg-bg-surface p-4">
      <p className={labelClass}>{label}</p>
      <p className={`mt-3 font-mono-data tabular-nums font-bold ${sizeClassName[size]} ${toneClassName[tone]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
      )}
    </div>
  )
}