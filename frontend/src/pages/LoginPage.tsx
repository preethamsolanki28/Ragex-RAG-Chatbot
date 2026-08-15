import { useState } from 'react'
import { apiFetch } from '../lib/api'
import type { AuthResponse } from '../types'

type LoginPageProps = {
  onLogin: (data: AuthResponse) => void
  onSwitchToRegister: () => void
}

function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail.endsWith('@gmail.com')) {
      setError('Please use a @gmail.com email address.')
      return
    }

    setLoading(true)

    try {
      const data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      onLogin(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] p-3 text-[#131b2e] md:p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#c7c4d7] bg-white p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] md:p-12">
        <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-[#3b82f6] to-[#22d3ee]" />

        <div className="mb-8 text-center">
          <h1 className="text-[40px] font-semibold tracking-[-0.02em]">Ragex</h1>
          <p className="mt-2 text-[16px] leading-[26px] text-[#464554]">
            Sign in to your account to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-[14px] font-medium">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767586]">
                mail
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gmail.com"
                required
                className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] py-3 pl-10 pr-4 text-[16px] outline-none focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-[14px] font-medium">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767586]">
                lock
              </span>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] py-3 pl-10 pr-4 text-[16px] outline-none focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#22d3ee] py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-[#464554]">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-[#4648d4] hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </main>
  )
}

export default LoginPage
