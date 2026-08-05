import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TradeProvider } from './context/TradeContext'
import { AccountProvider } from './context/AccountContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <TradeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TradeProvider>
      </AccountProvider>
    </AuthProvider>
  )
}

export default App
