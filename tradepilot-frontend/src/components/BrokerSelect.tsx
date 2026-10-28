import { useState } from 'react'
import BrokerLogo from './BrokerLogo'
import { BROKERS, getBrokerById } from '../constants/brokers'

interface BrokerSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function BrokerSelect({ value, onChange, className = '' }: BrokerSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedBroker = value ? getBrokerById(value) : null

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-card border border-border bg-bg-surface px-3 py-2 text-left text-sm text-text-primary transition hover:bg-bg-surface-hover focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {selectedBroker ? (
          <>
            <BrokerLogo name={selectedBroker.name} logoUrl={selectedBroker.logoUrl} size="sm" />
            <span>{selectedBroker.name}</span>
          </>
        ) : (
          <span className="text-text-muted">Select a broker...</span>
        )}
        <svg
          className={`ml-auto h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-card border border-border bg-bg-surface shadow-lg">
            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-chip px-3 py-2 text-left text-sm text-text-muted transition hover:bg-bg-surface-hover"
              >
                <span className="text-xs">None</span>
              </button>
              {BROKERS.map((broker) => (
                <button
                  key={broker.id}
                  type="button"
                  onClick={() => {
                    onChange(broker.id)
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-chip px-3 py-2 text-left text-sm text-text-primary transition hover:bg-bg-surface-hover"
                >
                  <BrokerLogo name={broker.name} logoUrl={broker.logoUrl} size="sm" />
                  <span>{broker.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
