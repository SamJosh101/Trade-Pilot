import { Route, Routes } from 'react-router-dom'
import Accounts from '../pages/Accounts'
import AddTrade from '../pages/AddTrade'
import Analytics from '../pages/Analytics'
import Dashboard from '../pages/Dashboard'
import DashboardLayout from '../layouts/DashboardLayout'
import EditTrade from '../pages/EditTrade'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Trades from '../pages/Trades'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trades/:id/edit" element={<EditTrade />} />
        <Route path="/trades/new" element={<AddTrade />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/accounts" element={<Accounts />} />
      </Route>
    </Routes>
  )
}
