import { useEffect, useState } from 'react'
import { getBrokerInitials } from '../constants/brokers'

interface BrokerLogoProps {
  name: string
  logoUrl: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function BrokerLogo({ name, logoUrl, size = 'md', className = '' }: BrokerLogoProps) {
  const [imgError, setImgError] = useState(false)
  useEffect(() => { setImgError(false) }, [logoUrl])
  const initials = getBrokerInitials(name)

  if (!logoUrl || imgError) {
    // Fallback to initials
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-bg-surface border border-border text-text-muted font-medium ${sizeClasses[size]} ${className}`}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      className={`rounded-full object-contain bg-bg-surface border border-border ${sizeClasses[size]} ${className}`}
      onError={() => setImgError(true)}
    />
  )
}
