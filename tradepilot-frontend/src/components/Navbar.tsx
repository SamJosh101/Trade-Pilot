import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Welcome, <span className="font-medium text-slate-950">{user?.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
