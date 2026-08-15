import { useState } from 'react'
import { apiFetch } from '../lib/api'
import type { AuthResponse } from '../types'

type RegisterPageProps = {
  onRegistered: (data: AuthResponse) => void
  onSwitchToLogin: () => void
}

function RegisterPage({
  onRegistered,
  onSwitchToLogin,
}: RegisterPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const data = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email: normalizedEmail, password }),
      })
      onRegistered(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed.')
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
            Create your account to start researching.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-[14px] font-medium">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] px-4 py-3 text-[16px] outline-none focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-2 block text-[14px] font-medium">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@gmail.com"
              required
              className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] px-4 py-3 text-[16px] outline-none focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-2 block text-[14px] font-medium">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] px-4 py-3 text-[16px] outline-none focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-[14px] font-medium">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              minLength={8}
              required
              className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] px-4 py-3 text-[16px] outline-none focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
            />
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-[#464554]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-[#4648d4] hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </main>
  )
}

export default RegisterPage
