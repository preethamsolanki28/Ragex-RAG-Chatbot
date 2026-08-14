import { useState } from 'react'
import ChatInput from '../components/ChatInput'
import ChatMessage from '../components/ChatMessage'
import PdfViewer from '../components/PdfViewer'

const API_URL = 'http://127.0.0.1:8000'

type Source = {
  name: string
  page: number | null
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

type ChatResponse = {
  answer: string
  sources: {
    source: string
    page: number | null
  }[]
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedSource, setSelectedSource] =
    useState<Source | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    if (loading || !content.trim()) {
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ])

    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')

      if (!token) {
        localStorage.removeItem('user')
        window.location.reload()
        return
      }

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content.trim(),
        }),
      })

      if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        window.location.reload()
        return
      }

      if (response.status === 403) {
        throw new Error(
          'You do not have permission to access this resource.'
        )
      }

      if (!response.ok) {
        throw new Error(
          'The Ragex backend returned an error.'
        )
      }

      const data = (await response.json()) as ChatResponse

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: Array.isArray(data.sources)
          ? data.sources.map((source) => ({
              name: source.source,
              page: source.page,
            }))
          : [],
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ])
    } catch (error) {
      console.error('Chat request failed:', error)

      let errorText =
        'Sorry, something went wrong while processing your question.'

      if (
        error instanceof Error &&
        error.message.includes('permission')
      ) {
        errorText =
          'You do not have permission to access this resource.'
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: errorText,
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        errorMessage,
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex h-screen flex-1 flex-col md:ml-[280px]">

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#c7c4d7] bg-white/90 px-4 backdrop-blur-md md:px-6">

        <div className="flex items-center gap-4">

          <button className="rounded-lg p-2 text-[#464554] hover:bg-[#f2f3ff] md:hidden">
            <span className="material-symbols-outlined">
              menu
            </span>
          </button>

          <h2 className="text-[20px] font-semibold">
            New Chat
          </h2>

        </div>

        <div className="flex items-center gap-2">

          <button className="hidden items-center gap-2 rounded-full border border-[#c7c4d7] bg-[#f2f3ff] px-3 py-1.5 text-[12px] font-medium text-[#464554] sm:flex">
            <span className="material-symbols-outlined text-[18px] text-[#4648d4]">
              library_books
            </span>

            3 documents selected

            <span className="material-symbols-outlined text-[17px] text-[#767586]">
              expand_more
            </span>
          </button>

          <button className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-[#4648d4] hover:bg-[#f2f3ff] sm:block">
            Export chat
          </button>

          <button className="rounded-lg p-2 text-[#767586] hover:bg-[#f2f3ff]">
            <span className="material-symbols-outlined">
              more_horiz
            </span>
          </button>

        </div>

      </header>

      {/* Chat */}
      <div className="relative flex-1 overflow-y-auto bg-white">

        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-3 pb-36 pt-8 md:px-6">

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">

              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4648d4] to-[#22d3ee] text-xl font-bold text-white">
                R
              </div>

              <h1 className="text-[24px] font-semibold text-[#131b2e]">
                What can I help you research?
              </h1>

              <p className="mt-2 max-w-md text-[14px] leading-6 text-[#767586]">
                Ask a question about your documents and Ragex
                will find relevant information from your library.
              </p>

            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              onSourceClick={setSelectedSource}
            />
          ))}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-3 text-[14px] text-[#767586]">

              <div className="flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#4648d4]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#4648d4] [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#4648d4] [animation-delay:300ms]" />
              </div>

              <span>
                Ragex is thinking...
              </span>

            </div>
          )}

        </div>

        {/* Chat input */}
        <ChatInput
          onSend={handleSendMessage}
        />

      </div>

      {/* PDF viewer */}
      {selectedSource && (
        <PdfViewer
          filename={selectedSource.name}
          page={selectedSource.page}
          onClose={() => setSelectedSource(null)}
        />
      )}

    </main>
  )
}

export default ChatPage