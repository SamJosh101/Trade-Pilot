import { useAccounts as useAccountsContext } from '../context/AccountContext'

export function useAccounts() {
  return useAccountsContext()
}
