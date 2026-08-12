type Source = {
  name: string
  page: number | null
}

type SourceCardProps = {
  source: Source
  onClick: () => void
}

function SourceCard({
  source,
  onClick,
}: SourceCardProps) {

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-[190px] items-center gap-3 rounded-xl border border-[#c7c4d7] bg-white px-4 py-3 text-left transition hover:border-[#4648d4] hover:bg-[#f7f7ff]"
    >

      {/* PDF icon */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f2f3ff]">

        <span className="material-symbols-outlined text-[20px] text-[#4648d4]">
          description
        </span>

      </div>


      {/* File information */}
      <div className="min-w-0 flex-1">

        <p className="truncate text-[13px] font-medium text-[#30303d] group-hover:text-[#4648d4]">
          {source.name}
        </p>

        <p className="mt-1 text-[12px] text-[#767586]">
          {source.page !== null
            ? `Page ${source.page}`
            : 'Page unavailable'}
        </p>

      </div>


      {/* Open icon */}
      <span className="material-symbols-outlined text-[18px] text-[#767586] group-hover:text-[#4648d4]">
        open_in_new
      </span>

    </button>
  )
}

export default SourceCard