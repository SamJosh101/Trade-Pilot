import AuthShell from '../components/AuthShell'
import axios from 'axios'
import { apiErrorMessage } from '../utils/apiError.mjs'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FormField, { inputClasses } from '../components/FormField'

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return apiErrorMessage(error.response?.data, 'Unable to login. Please try again.')
  }

  return 'Unable to login'
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const securityNotice=new URLSearchParams(window.location.search).get('security');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell>
        <h1 className="text-2xl font-semibold text-text-primary">Login</h1>
        {['password-changed','all-revoked','session-revoked'].includes(securityNotice??'')&&<p role="status" className="notice">{securityNotice==='password-changed'?'Password changed. All devices were signed out.':'Session access revoked.'} Sign in again to continue.</p>}
        <p className="mt-2 text-sm text-text-muted">
          Access your TradePilot dashboard.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <FormField label="Email">
            <input
              className={inputClasses}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email" autoComplete="email"
              value={email}
            />
          </FormField>

          <FormField label="Password">
            <input
              className={inputClasses}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password" autoComplete="current-password"
              value={password}
            />
          </FormField>

          {error ? (
            <p className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-left text-sm text-negative">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg-base transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-sm text-text-muted">
          Need an account?{' '}
          <Link className="font-medium text-accent hover:text-accent-hover" to="/register">
            Register
          </Link>
        </p>
    </AuthShell>
  )
}
