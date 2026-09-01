import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border-subtle bg-bg-surface">
      <div className="border-b border-border-subtle p-6">
        <h1 className="text-xl font-semibold text-text-primary">TradePilot</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent text-text-primary'
                    : 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary'
                }`
              }
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/trades"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent text-text-primary'
                    : 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary'
                }`
              }
            >
              Trades
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent text-text-primary'
                    : 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary'
                }`
              }
            >
              Analytics
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/accounts"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent text-text-primary'
                    : 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary'
                }`
              }
            >
              Accounts
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
