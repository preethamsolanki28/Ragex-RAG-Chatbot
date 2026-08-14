import { useEffect, useState } from 'react'
import ChatPage from './pages/ChatPage'

const API_URL = 'http://127.0.0.1:8000'

type User = {
  id: number
  name: string
  email: string
}

type LoginResponse = {
  access_token: string
  token_type: string
  user: User
}

function LoginPage({
  onLogin,
}: {
  onLogin: (user: User, token: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      const loginData = data as LoginResponse

      localStorage.setItem('access_token', loginData.access_token)
      localStorage.setItem('user', JSON.stringify(loginData.user))

      onLogin(loginData.user, loginData.access_token)
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex items-center justify-center p-3 md:p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#c7c4d7] bg-white p-6 md:p-12 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">

        <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-[#3b82f6] to-[#22d3ee]" />

        <div className="mb-8 text-center">
          <h1 className="text-[40px] leading-[48px] font-semibold tracking-[-0.02em]">
            Ragex
          </h1>

          <p className="mt-2 text-[16px] leading-[26px] text-[#464554]">
            Sign in to your account to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-[14px] leading-[20px] font-medium"
            >
              Email Address
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767586]">
                mail
              </span>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] py-3 pl-10 pr-4 text-[16px] leading-[26px] outline-none transition-colors placeholder:text-[#767586] focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[14px] leading-[20px] font-medium"
              >
                Password
              </label>

              <button
                type="button"
                className="text-[12px] leading-[16px] font-medium text-[#4648d4]"
              >
                Forgot password?
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767586]">
                lock
              </span>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-[#c7c4d7] bg-[#f2f3ff] py-3 pl-10 pr-4 text-[16px] leading-[26px] outline-none transition-colors placeholder:text-[#767586] focus:border-[#4648d4] focus:ring-1 focus:ring-[#4648d4]"
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
            className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#22d3ee] py-3 text-[14px] leading-[20px] font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

        </form>

        <div className="mt-8 text-center">
          <p className="text-[16px] leading-[26px] text-[#464554]">
            Don't have an account?{' '}
            <button
              type="button"
              className="font-medium text-[#4648d4] hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>

      </div>
    </main>
  )
}

function Sidebar({
  user,
  onLogout,
}: {
  user: User
  onLogout: () => void
}) {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[280px] flex-col border-r border-[#c7c4d7] bg-[#f2f3ff] py-6 md:flex">

      <div className="mb-8 flex items-center gap-3 px-6">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4648d4] to-[#22d3ee] text-sm font-bold text-white">
          R
        </div>

        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold">
            Ragex
          </h1>

          <p className="text-[12px] leading-[16px] text-[#464554]">
            AI Research Assistant
          </p>
        </div>

      </div>

      <div className="px-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4648d4] to-[#22d3ee] py-3 text-[14px] font-medium text-white">
          <span className="material-symbols-outlined text-[20px]">
            add
          </span>

          New chat
        </button>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-2">

        {[
          ['Explore', 'explore'],
          ['Library', 'book'],
          ['Files', 'folder'],
          ['History', 'history'],
          ['Documents', 'description'],
        ].map(([name, icon]) => (
          <button
            key={name}
            className="flex h-10 w-full items-center gap-3 rounded-r-lg px-4 text-left text-[14px] font-medium text-[#464554] hover:bg-[#e2e7ff] hover:text-[#4648d4]"
          >
            <span className="material-symbols-outlined text-[21px]">
              {icon}
            </span>

            {name}
          </button>
        ))}

      </nav>

      <div className="border-t border-[#c7c4d7] px-4 pt-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-[14px] font-medium text-[#464554] hover:bg-[#e2e7ff]"
        >
          <span className="material-symbols-outlined">
            person
          </span>

          {user.name}
        </button>
      </div>

    </aside>
  )
}

function MainApplication({
  user,
  onLogout,
}: {
  user: User
  onLogout: () => void
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar user={user} onLogout={onLogout} />
      <ChatPage />
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('access_token')

      if (!token) {
        setCheckingSession(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          setUser(null)
          return
        }

        const currentUser = (await response.json()) as User

        localStorage.setItem('user', JSON.stringify(currentUser))
        setUser(currentUser)

      } catch (error) {
        console.error(
          'Failed to validate authentication session:',
          error
        )
      } finally {
        setCheckingSession(false)
      }
    }

    validateSession()
  }, [])

  const handleLogin = (loggedInUser: User, _token: string) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">

          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c7c4d7] border-t-[#4648d4]" />

          <p className="text-[14px] text-[#464554]">
            Checking your session...
          </p>

        </div>
      </main>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <MainApplication
      user={user}
      onLogout={handleLogout}
    />
  )
}

export default App