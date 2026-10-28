import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token, isLoading, sessionError, retrySession, logout } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-base px-4 text-text-muted">
        Loading...
      </main>
    )
  }

  if(sessionError){return <main className="empty-state"><p role="alert">{sessionError}</p><button className="button" onClick={retrySession}>Retry session</button><button className="button" onClick={logout}>Sign out</button></main>}
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}
