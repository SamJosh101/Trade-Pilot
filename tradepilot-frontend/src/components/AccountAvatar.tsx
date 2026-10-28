import { useEffect, useState } from 'react'

interface AccountAvatarProps {
  name: string
  avatarUrl: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-xl',
}

// Fixed palette of muted, on-brand tones (gold, blue, grays)
const AVATAR_COLORS = [
  '#D4A574', // Muted gold
  '#8B7355', // Warm brown
  '#6B8E9E', // Muted blue
  '#7A8B99', // Cool gray-blue
  '#8C7B70', // Neutral brown-gray
  '#9A8B7A', // Warm gray
]

// Generate deterministic color from string hash
function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// Get initials from account name
function getInitials(name: string): string {
  if (!name.trim()) return '?'
  const words = name.trim().split(/\s+/)
  
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  
  // Take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function AccountAvatar({ name, avatarUrl, size = 'md', className = '' }: AccountAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)
  const bgColor = stringToColor(name)

  useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

  if (!avatarUrl || imgError) {
    // Fallback to initials avatar
    return (
      <div
        className={`flex items-center justify-center rounded-full font-medium text-white ${sizeClasses[size]} ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      onError={() => setImgError(true)}
    />
  )
}
