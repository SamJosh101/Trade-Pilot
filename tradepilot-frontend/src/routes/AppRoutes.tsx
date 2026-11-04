const StrategyPerformance=lazy(()=>import('../pages/StrategyPerformance'))
const Strategies=lazy(()=>import('../pages/StrategyLibrary'))
import Gameplans from '../pages/PlanningWorkspace'
import {lazy,Suspense} from 'react'
import Calendar from '../pages/TradingCalendar'
import Settings from '../pages/AppearanceSettings'
import Notes from '../pages/NotesWorkspace'
import Onboarding from '../pages/Onboarding'
import {Link} from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'
import Accounts from '../pages/AccountWorkspace'
import AddTrade from '../pages/TradeEntry'
const Analytics=lazy(()=>import('../pages/OverviewAnalytics'))
const Dashboard=lazy(()=>import('../pages/OverviewDashboard'))
import DashboardLayout from '../layouts/DashboardLayout'
import EditTrade from '../pages/TradeEntry'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Trades from '../pages/TradeJournal'
import TradeDetails from '../pages/TradeDetails'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Suspense fallback={<div role="status" className="empty-state">Loading workspace…</div>}><Routes>
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
        <Route path="/trades/:id" element={<TradeDetails />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/strategy-performance" element={<Suspense fallback={<p role="status">Loading Strategy performance…</p>}><StrategyPerformance/></Suspense>}/>
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/gameplans" element={<Gameplans />} />
        <Route path="/strategies" element={<Suspense fallback={<p role="status">Loading Strategies...</p>}><Strategies /></Suspense>} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/accounts" element={<Accounts />} />
      </Route>
      <Route path="*" element={<main className="empty-state min-h-screen"><h1>Page not found</h1><p>This destination is not part of your workspace.</p><Link className="button primary" to="/dashboard">Back to dashboard</Link></main>} />
    </Routes></Suspense>
  )
}
