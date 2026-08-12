type PdfViewerProps = {
  filename: string
  page: number | null
  onClose: () => void
}

function PdfViewer({
  filename,
  page,
  onClose,
}: PdfViewerProps) {

  const encodedFilename = encodeURIComponent(filename)

  const pdfUrl =
    `http://127.0.0.1:8000/pdf/${encodedFilename}` +
    (page !== null ? `#page=${page}` : '')


  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/50">

      {/* Viewer header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#c7c4d7] bg-white px-4 md:px-6">

        <div className="flex min-w-0 items-center gap-3">

          <span className="material-symbols-outlined text-[#4648d4]">
            picture_as_pdf
          </span>

          <div className="min-w-0">

            <h2 className="truncate text-[15px] font-semibold text-[#30303d]">
              {filename}
            </h2>

            {page !== null && (
              <p className="text-[12px] text-[#767586]">
                Page {page}
              </p>
            )}

          </div>

        </div>


        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#767586] hover:bg-[#f2f3ff] hover:text-[#30303d]"
        >
          <span className="material-symbols-outlined">
            close
          </span>
        </button>

      </div>


      {/* PDF */}
      <div className="min-h-0 flex-1 bg-[#525659]">

        <iframe
          src={pdfUrl}
          title={`${filename} PDF viewer`}
          className="h-full w-full border-0"
        />

      </div>

    </div>
  )
}

export default PdfViewer