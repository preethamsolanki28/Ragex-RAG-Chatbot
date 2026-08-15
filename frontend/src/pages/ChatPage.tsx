import { useEffect, useState } from 'react'
import ChatInput from '../components/ChatInput'
import ChatMessage from '../components/ChatMessage'
import PdfViewer from '../components/PdfViewer'
import { ApiError, apiFetch } from '../lib/api'
import type {
  ChatDetail,
  ChatResponse,
  ChatSummary,
  Document,
  Message,
  Source,
} from '../types'

type ChatPageProps = {
  activeChatId: number | null
  onChatCreated: (chat: ChatSummary) => void
  onChatUpdated: () => void
  onSessionExpired: () => void
  onDocumentCountChange: (count: number) => void
}

function ChatPage({
  activeChatId,
  onChatCreated,
  onChatUpdated,
  onSessionExpired,
  onDocumentCountChange,
}: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatTitle, setChatTitle] = useState('New Chat')
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDocumentCount = async () => {
      try {
        const documents = await apiFetch<Document[]>('/documents')
        setDocumentCount(documents.length)
        onDocumentCountChange(documents.length)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired()
        }
      }
    }

    void loadDocumentCount()
  }, [onDocumentCountChange, onSessionExpired])

  useEffect(() => {
    let cancelled = false

    const loadChat = async () => {
      if (activeChatId === null) {
        setMessages([])
        setChatTitle('New Chat')
        setError('')
        return
      }

      setLoadingChat(true)
      setError('')

      try {
        const data = await apiFetch<ChatDetail>(
          `/chats/${activeChatId}`,
        )

        if (cancelled) return

        setChatTitle(data.title)
        setMessages(data.messages)
      } catch (error) {
        if (cancelled) return

        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired()
          return
        }

        setError(
          error instanceof Error
            ? error.message
            : 'Could not load this conversation.',
        )
      } finally {
        if (!cancelled) {
          setLoadingChat(false)
        }
      }
    }

    void loadChat()

    return () => {
      cancelled = true
    }
  }, [activeChatId, onSessionExpired])

  const handleSendMessage = async (content: string) => {
    const message = content.trim()

    if (loading || !message || loadingChat) {
      return
    }

    setError('')

    let chatId = activeChatId
    let createdChat: ChatSummary | null = null

    try {
      if (chatId === null) {
        createdChat = await apiFetch<ChatSummary>('/chats', {
          method: 'POST',
          body: JSON.stringify({
            title: message.slice(0, 60),
          }),
        })

        chatId = createdChat.id

        // Add the newly created chat to the sidebar immediately.
        // Do not wait for the message request to succeed.
        onChatCreated(createdChat)
      }

      setMessages((current) => [
        ...current,
        {
          role: 'user',
          content: message,
        },
      ])

      setLoading(true)

      const data = await apiFetch<ChatResponse>(
        `/chats/${chatId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            message,
          }),
        },
      )

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
        },
      ])

      if (createdChat) {
        setChatTitle(createdChat.title)
      }

      onChatUpdated()
    } catch (error) {
      // Do NOT delete a newly created chat when message generation fails.
      // The chat is a real saved conversation and should remain in history.

      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
        return
      }

      setError(
        error instanceof Error
          ? error.message
          : 'Sorry, something went wrong while processing your question.',
      )

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Sorry, something went wrong while processing your question.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (messages.length === 0) return

    const text = messages
      .map((message) => {
        const label = message.role === 'user' ? 'You' : 'Ragex'
        const sources =
          message.sources && message.sources.length > 0
            ? `\nSources:\n${message.sources
                .map(
                  (source) =>
                    `- ${source.name}${source.page !== null ? ` (Page ${source.page})` : ''}`,
                )
                .join('\n')}`
            : ''

        return `${label}:\n${message.content}${sources}`
      })
      .join('\n\n')

    const blob = new Blob([text], {
      type: 'text/plain;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${chatTitle || 'ragex-chat'}.txt`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex h-screen flex-1 flex-col md:ml-[280px]">
      <header className="sticky top-0 z-40 flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-[#c7c4d7] bg-white/90 px-4 backdrop-blur-md md:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-[20px] font-semibold">
            {chatTitle}
          </h2>
          {activeChatId !== null && (
            <p className="text-[11px] text-[#767586]">
              Saved conversation
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[#c7c4d7] bg-[#f2f3ff] px-3 py-1.5 text-[12px] font-medium text-[#464554] sm:flex">
            <span className="material-symbols-outlined text-[18px] text-[#4648d4]">
              library_books
            </span>
            {documentCount}{' '}
            {documentCount === 1 ? 'document' : 'documents'}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={messages.length === 0}
            className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-[#4648d4] hover:bg-[#f2f3ff] disabled:cursor-not-allowed disabled:opacity-40 sm:block"
          >
            Export chat
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto bg-white">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-3 pb-36 pt-8 md:px-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {loadingChat ? (
            <div className="flex min-h-[55vh] items-center justify-center text-[14px] text-[#767586]">
              Loading conversation...
            </div>
          ) : (
            <>
              {messages.length === 0 && !loading && (
                <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4648d4] to-[#22d3ee] text-xl font-bold text-white">
                    R
                  </div>

                  <h1 className="text-[24px] font-semibold text-[#131b2e]">
                    What can I help you research?
                  </h1>

                  <p className="mt-2 max-w-md text-[14px] leading-6 text-[#767586]">
                    Ask a question about your documents and Ragex will
                    retrieve relevant information from your personal
                    knowledge base.
                  </p>

                  {documentCount === 0 && (
                    <p className="mt-4 text-[13px] text-[#4648d4]">
                      Upload a PDF from Library before asking questions.
                    </p>
                  )}
                </div>
              )}

              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id ?? `${message.role}-${index}`}
                  message={message}
                  onSourceClick={setSelectedSource}
                />
              ))}

              {loading && (
                <div className="flex items-center gap-3 text-[14px] text-[#767586]">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#4648d4]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#4648d4] [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#4648d4] [animation-delay:300ms]" />
                  </div>
                  <span>Ragex is thinking...</span>
                </div>
              )}
            </>
          )}
        </div>

        <ChatInput
          onSend={handleSendMessage}
          disabled={loading || loadingChat}
        />
      </div>

      {selectedSource && (
        <PdfViewer
          filename={selectedSource.filename}
          page={selectedSource.page}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </main>
  )
}

export default ChatPage