import SourceCard from './SourceCard'
import type { Message, Source } from '../types'

type ChatMessageProps = {
  message: Message
  onSourceClick: (source: Source) => void
}

function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-[#c7c4d7]/50 bg-[#e2e7ff] px-5 py-4">
          <p className="whitespace-pre-wrap text-[16px] leading-[26px] text-[#131b2e]">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full gap-4">
      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#4648d4]/20 bg-[#4648d4]/10">
        <span className="material-symbols-outlined text-[18px] text-[#4648d4]">
          smart_toy
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-[16px] leading-[28px] text-[#131b2e]">
          {message.content}
        </p>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#4648d4]">
                link
              </span>
              <h4 className="text-[14px] font-medium text-[#464554]">Sources</h4>
            </div>

            <div className="flex flex-wrap gap-3">
              {message.sources.map((source, index) => (
                <SourceCard
                  key={`${source.filename}-${source.page}-${index}`}
                  source={source}
                  onClick={() => onSourceClick(source)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
