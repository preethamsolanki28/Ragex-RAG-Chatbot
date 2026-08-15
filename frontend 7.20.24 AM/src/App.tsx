import { useCallback, useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import Sidebar from './components/Sidebar'
import { ApiError, apiFetch } from './lib/api'
import type { AuthResponse, User } from './types'

type View = 'chat' | 'documents'
type AuthMode = 'login' | 'register'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [view, setView] = useState<View>('chat')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const [chatKey, setChatKey] = useState(0)

  const clearSession = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    setView('chat')
    setDocumentCount(0)
  }, [])

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('access_token')

      if (!token) {
        setCheckingSession(false)
        return
      }

      try {
        const currentUser = await apiFetch<User>('/auth/me')
        localStorage.setItem('user', JSON.stringify(currentUser))
        setUser(currentUser)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
        } else {
          console.error('Session validation failed:', error)
        }
      } finally {
        setCheckingSession(false)
      }
    }

    void validateSession()
  }, [clearSession])

  const handleAuthenticated = (data: AuthResponse) => {
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    setView('chat')
  }

  const handleNewChat = () => {
    setChatKey((current) => current + 1)
    setView('chat')
    setMobileSidebarOpen(false)
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] text-[#131b2e]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c7c4d7] border-t-[#4648d4]" />
          <p className="text-[14px] text-[#464554]">Checking your session...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    if (authMode === 'register') {
      return (
        <RegisterPage
          onRegistered={handleAuthenticated}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      )
    }

    return (
      <LoginPage
        onLogin={handleAuthenticated}
        onSwitchToRegister={() => setAuthMode('register')}
      />
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar
        user={user}
        activeView={view}
        documentCount={documentCount}
        onNavigate={setView}
        onNewChat={handleNewChat}
        onLogout={clearSession}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation"
          className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#464554] shadow md:hidden"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {view === 'chat' ? (
          <ChatPage
            key={chatKey}
            onSessionExpired={clearSession}
            onDocumentCountChange={setDocumentCount}
          />
        ) : (
          <DocumentsPage
            onSessionExpired={clearSession}
            onCountChange={setDocumentCount}
          />
        )}
      </div>
    </div>
  )
}

export default App
