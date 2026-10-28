export interface Broker {
  id: string
  name: string
  logoUrl: string
}

export const BROKERS: Broker[] = [
  {
    id: 'exness',
    name: 'Exness',
    logoUrl: 'https://www.google.com/s2/favicons?domain=exness.com&sz=64',
  },
  {
    id: 'xm',
    name: 'XM',
    logoUrl: 'https://www.google.com/s2/favicons?domain=xmtrading.com&sz=64',
  },
  {
    id: 'hfm',
    name: 'HFM',
    logoUrl: 'https://www.google.com/s2/favicons?domain=hfm.com&sz=64',
  },
  {
    id: 'icmarkets',
    name: 'IC Markets',
    logoUrl: 'https://www.google.com/s2/favicons?domain=icmarkets.com&sz=64',
  },
  {
    id: 'deriv',
    name: 'Deriv',
    logoUrl: 'https://www.google.com/s2/favicons?domain=deriv.com&sz=64',
  },
  {
    id: 'oanda',
    name: 'OANDA',
    logoUrl: 'https://www.google.com/s2/favicons?domain=oanda.com&sz=64',
  },
  {
    id: 'fxtm',
    name: 'FXTM',
    logoUrl: 'https://www.google.com/s2/favicons?domain=fxtm.com&sz=64',
  },
  {
    id: 'pepperstone',
    name: 'Pepperstone',
    logoUrl: 'https://www.google.com/s2/favicons?domain=pepperstone.com&sz=64',
  },
]

export function getBrokerById(id: string): Broker | undefined {
  return BROKERS.find(broker => broker.id === id)
}

export function getBrokerInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
