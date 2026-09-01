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
    <header className="border-b border-border-subtle bg-bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-muted">
          Welcome, <span className="font-medium text-text-primary">{user?.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
        >
          Logout
        </button>
      </div>
    </header>
  )
}