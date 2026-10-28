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
    return apiErrorMessage(error.response?.data, 'Unable to register. Please try again.')
  }

  return 'Unable to register'
}

export default function Register() {
  const navigate = useNavigate()
  const { register, login } = useAuth()
  const [registrationComplete,setRegistrationComplete]=useState(false)
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
      if(registrationComplete)await login(email,password)
      else await register(name, email, password)
      navigate('/onboarding')
    } catch (caughtError) {
      if(caughtError instanceof Error && caughtError.name==='RegistrationSignInError'){
        setRegistrationComplete(true);setError(caughtError.message);
      }else setError(getErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell>
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
              type="password" autoComplete="new-password"
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
            {isSubmitting ? (registrationComplete?'Signing in...':'Creating account...') : registrationComplete?'Sign in to created account':'Register'}
          </button>
        </form>

        <p className="mt-5 text-sm text-text-muted">
          Already registered?{' '}
          <Link className="font-medium text-accent hover:text-accent-hover" to="/login">
            Login
          </Link>
        </p>
    </AuthShell>
  )
}
