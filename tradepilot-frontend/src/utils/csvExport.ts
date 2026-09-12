import type { Trade } from '../types/trade'

export function exportTradesToCSV(trades: Trade[]): void {
  if (trades.length === 0) {
    return
  }

  const headers = [
    'Pair',
    'Direction',
    'Entry',
    'Stop Loss',
    'Take Profit',
    'Timeframe',
    'RR',
    'Result',
    'Date',
    'Notes',
    'Screenshot URL'
  ]

  const rows = trades.map(trade => [
    trade.pair,
    trade.direction,
    trade.entry,
    trade.sl,
    trade.tp,
    trade.timeframe || '',
    trade.rr || '',
    trade.result || '',
    trade.createdAt,
    trade.notes || '',
    trade.imageUrl || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  link.setAttribute('href', url)
  link.setAttribute('download', `tradepilot-trades-${dateStr}.csv`)
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}
