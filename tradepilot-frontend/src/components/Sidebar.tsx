import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-6">
        <h1 className="text-xl font-semibold text-slate-950">TradePilot</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
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
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
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
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
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
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
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
