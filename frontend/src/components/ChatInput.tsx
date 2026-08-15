import { useState } from 'react'

type ChatInputProps = {
  onSend: (message: string) => void
  disabled?: boolean
}

function ChatInput({
  onSend,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (disabled) {
      return
    }

    const message = input.trim()

    if (!message) {
      return
    }

    onSend(message)
    setInput('')
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !disabled
    ) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 md:left-[280px]">
      <div className="mx-auto max-w-[720px] px-3 pb-4 md:px-6">

        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto rounded-2xl border border-[#c7c4d7] bg-white/95 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={
              disabled
                ? 'Ragex is thinking...'
                : 'Ask anything about your documents...'
            }
            className="w-full resize-none border-0 bg-transparent px-2 py-2 text-[16px] leading-[26px] text-[#131b2e] outline-none placeholder:text-[#767586] disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-2 flex items-center justify-end">

            <button
              type="submit"
              disabled={disabled || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4648d4] text-white transition-all hover:bg-[#2f2ebe] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_upward
              </span>
            </button>

          </div>
        </form>

        <p className="mt-2 text-center text-[11px] text-[#767586]">
          Ragex can make mistakes. Check important information in
          the original documents.
        </p>

      </div>
    </div>
  )
}

export default ChatInput