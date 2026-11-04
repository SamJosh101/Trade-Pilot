import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TradeProvider } from './context/TradeContext'
import { AccountProvider, useAccounts } from './context/AccountContext'
import AppRoutes from './routes/AppRoutes'
import {WorkspaceProvider} from './context/WorkspaceContext'

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
    <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
      <AccountProvider>
        <TradeProviderWithAccountSync>

            <AppRoutes />

        </TradeProviderWithAccountSync>
      </AccountProvider>
      </WorkspaceProvider>
    </AuthProvider>
    </BrowserRouter>
  )
}

export default App
