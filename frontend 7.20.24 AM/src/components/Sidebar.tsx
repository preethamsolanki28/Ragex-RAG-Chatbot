import type { User } from '../types'

type View = 'chat' | 'documents'

type SidebarProps = {
  user: User
  activeView: View
  documentCount: number
  onNavigate: (view: View) => void
  onNewChat: () => void
  onLogout: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function Sidebar({
  user,
  activeView,
  documentCount,
  onNavigate,
  onNewChat,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNavigate = (view: View) => {
    onNavigate(view)
    onCloseMobile()
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-[#c7c4d7] bg-[#f2f3ff] py-6 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4648d4] to-[#22d3ee] text-sm font-bold text-white">
            R
          </div>
          <div>
            <h1 className="text-[24px] leading-[32px] font-semibold">Ragex</h1>
            <p className="text-[12px] leading-[16px] text-[#464554]">
              AI Research Assistant
            </p>
          </div>
        </div>

        <div className="px-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4648d4] to-[#22d3ee] py-3 text-[14px] font-medium text-white"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New chat
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-2">
          <button
            type="button"
            onClick={() => handleNavigate('chat')}
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-[14px] font-medium ${
              activeView === 'chat'
                ? 'bg-[#e2e7ff] text-[#4648d4]'
                : 'text-[#464554] hover:bg-[#e2e7ff] hover:text-[#4648d4]'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">chat</span>
            Chat
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('documents')}
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-[14px] font-medium ${
              activeView === 'documents'
                ? 'bg-[#e2e7ff] text-[#4648d4]'
                : 'text-[#464554] hover:bg-[#e2e7ff] hover:text-[#4648d4]'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">description</span>
            Documents
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] text-[#767586]">
              {documentCount}
            </span>
          </button>
        </nav>

        <div className="border-t border-[#c7c4d7] px-4 pt-4">
          <div className="mb-2 px-4">
            <p className="truncate text-[13px] font-medium text-[#30303d]">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-[#767586]">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-[14px] font-medium text-[#464554] hover:bg-[#e2e7ff]"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
