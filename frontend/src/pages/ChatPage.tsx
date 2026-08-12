import { useState } from 'react'
import ChatInput from '../components/ChatInput'
import ChatMessage from '../components/ChatMessage'
import PdfViewer from '../components/PdfViewer'

type Source = {
  name: string
  page: number | null
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

const initialMessages: Message[] = [
  {
    role: 'user',
    content:
      'Can you summarize the key findings regarding neural network latency in the provided architecture document? Specifically looking at page 12.',
  },
  {
    role: 'assistant',
    content:
      'Based on the documents provided in your library, here is a summary of the key findings regarding neural network latency and the architecture discussed on page 12.',
  },
]


function ChatPage() {

  const [messages, setMessages] =
    useState<Message[]>(initialMessages)


  // Currently selected PDF source
  const [selectedSource, setSelectedSource] =
    useState<Source | null>(null)


  const handleSendMessage = async (
    content: string
  ) => {

    const userMessage: Message = {
      role: 'user',
      content,
    }


    // Show user's message immediately
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ])


    try {

      // Send question to FastAPI
      const response = await fetch(
        'http://127.0.0.1:8000/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            message: content,
          }),
        }
      )


      if (!response.ok) {
        throw new Error(
          'Failed to get response from the server'
        )
      }


      // Convert response to JavaScript object
      const data = await response.json()


      // Create assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,

        sources: data.sources.map(
          (source: {
            source: string
            page: number | null
          }) => ({
            name: source.source,
            page: source.page,
          })
        ),
      }


      // Add assistant response
      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ])

    } catch (error) {

      console.error(
        'Chat request failed:',
        error
      )


      const errorMessage: Message = {
        role: 'assistant',
        content:
          'Sorry, I could not connect to the Ragex backend.',
      }


      setMessages((currentMessages) => [
        ...currentMessages,
        errorMessage,
      ])
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

          {/* Messages */}
          {messages.map(
            (message, index) => (

              <ChatMessage
                key={index}
                message={message}
                onSourceClick={
                  setSelectedSource
                }
              />

            )
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
          onClose={() =>
            setSelectedSource(null)
          }
        />

      )}

    </main>
  )
}

export default ChatPage