import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TradeProvider } from './context/TradeContext'
import { AccountProvider, useAccounts } from './context/AccountContext'
import AppRoutes from './routes/AppRoutes'

function TradeProviderWithAccountSync({ children }: { children: React.ReactNode }) {
  const { fetchAccounts } = useAccounts()

  return (
    <TradeProvider onTradeChange={fetchAccounts}>
      {children}
    </TradeProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <TradeProviderWithAccountSync>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TradeProviderWithAccountSync>
      </AccountProvider>
    </AuthProvider>
  )
}

export default App
