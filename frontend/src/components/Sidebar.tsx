import type { ChatSummary, User } from '../types'

type View = 'chat' | 'documents'

type SidebarProps = {
  user: User
  activeView: View
  documentCount: number
  chats: ChatSummary[]
  activeChatId: number | null
  onNavigate: (view: View) => void
  onNewChat: () => void
  onSelectChat: (chatId: number) => void
  onDeleteChat: (chatId: number) => void
  onLogout: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function Sidebar({
  user,
  activeView,
  documentCount,
  chats,
  activeChatId,
  onNavigate,
  onNewChat,
  onSelectChat,
  onDeleteChat,
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
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-[#c7c4d7] bg-[#f2f3ff] py-5 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center gap-3 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4648d4] to-[#22d3ee] text-sm font-bold text-white">
            R
          </div>
          <div>
            <h1 className="text-[24px] font-semibold leading-8">
              Ragex
            </h1>
            <p className="text-[12px] text-[#464554]">
              AI Research Assistant
            </p>
          </div>
        </div>

        <div className="px-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4648d4] to-[#22d3ee] py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[20px]">
              add
            </span>
            New chat
          </button>
        </div>

        <nav className="mt-5 space-y-1 px-2">
          <button
            type="button"
            onClick={() => handleNavigate('chat')}
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-[14px] font-medium ${
              activeView === 'chat'
                ? 'bg-[#e2e7ff] text-[#4648d4]'
                : 'text-[#464554] hover:bg-[#e2e7ff] hover:text-[#4648d4]'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">
              chat
            </span>
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
            <span className="material-symbols-outlined text-[21px]">
              library_books
            </span>
            Library
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] text-[#767586]">
              {documentCount}
            </span>
          </button>
        </nav>

        <div className="mt-5 min-h-0 flex-1 px-2">
          <div className="mb-2 flex items-center justify-between px-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#767586]">
              History
            </p>

            {chats.length > 0 && (
              <span className="text-[11px] text-[#9998a7]">
                {chats.length}
              </span>
            )}
          </div>

          <div className="h-full overflow-y-auto pb-3">
            {chats.length === 0 ? (
              <p className="px-4 py-3 text-[12px] leading-5 text-[#8b8998]">
                Your conversations will appear here.
              </p>
            ) : (
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center rounded-lg ${
                      activeChatId === chat.id && activeView === 'chat'
                        ? 'bg-[#e2e7ff] text-[#4648d4]'
                        : 'text-[#464554] hover:bg-white/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className="min-w-0 flex-1 px-4 py-2.5 text-left text-[13px]"
                      title={chat.title}
                    >
                      <span className="block truncate">
                        {chat.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${chat.title}`}
                      onClick={() => onDeleteChat(chat.id)}
                      className="mr-1 hidden h-8 w-8 items-center justify-center rounded-md text-[#9998a7] hover:bg-white hover:text-red-500 group-hover:flex"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#c7c4d7] px-4 pt-4">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#e2e7ff] text-[13px] font-semibold text-[#4648d4]">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[#30303d]">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-[#767586]">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-[#464554] hover:bg-[#e2e7ff]"
          >
            <span className="material-symbols-outlined">
              logout
            </span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
