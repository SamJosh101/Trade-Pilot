import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Landing() {
  const { token, isLoading } = useAuth()

  if (!isLoading && token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          TradePilot
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">
          Trade journal authentication
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Sign in or create an account to continue to your dashboard.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            to="/login"
          >
            Login
          </Link>
          <Link
            className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
            to="/register"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  )
}
