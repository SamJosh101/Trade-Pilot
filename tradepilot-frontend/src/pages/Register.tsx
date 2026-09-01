import axios from 'axios'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FormField, { inputClasses } from '../components/FormField'

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? 'Unable to register'
  }

  return 'Unable to register'
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)

    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-border-subtle bg-bg-surface p-8">
        <h1 className="text-2xl font-semibold text-text-primary">Register</h1>
        <p className="mt-2 text-sm text-text-muted">
          Create your TradePilot account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <FormField label="Name">
            <input
              className={inputClasses}
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </FormField>

          <FormField label="Email">
            <input
              className={inputClasses}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </FormField>

          <FormField label="Password">
            <input
              className={inputClasses}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </FormField>

          {error ? (
            <p className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-left text-sm text-negative">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-5 text-sm text-text-muted">
          Already registered?{' '}
          <Link className="font-medium text-accent hover:text-accent-hover" to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  )
}