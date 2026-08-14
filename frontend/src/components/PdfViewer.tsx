import { useEffect, useState } from 'react'

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

  const [pdfUrl, setPdfUrl] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {

    let objectUrl: string | null = null

    const loadPdf = async () => {

      setLoading(true)
      setError(null)

      try {

        const token =
          localStorage.getItem('access_token')

        if (!token) {
          localStorage.removeItem('user')
          window.location.reload()
          return
        }

        const encodedFilename =
          encodeURIComponent(filename)

        const response = await fetch(
          `http://127.0.0.1:8000/pdf/${encodedFilename}`,
          {
            method: 'GET',

            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        // Token is invalid or expired
        if (response.status === 401) {

          localStorage.removeItem(
            'access_token'
          )

          localStorage.removeItem('user')

          window.location.reload()

          return
        }

        if (response.status === 403) {
          throw new Error(
            'You do not have permission to access this PDF.'
          )
        }

        if (!response.ok) {
          throw new Error(
            'Could not load the PDF.'
          )
        }

        // Convert the PDF response into binary data
        const blob = await response.blob()

        // Create a temporary browser URL for the PDF
        objectUrl = URL.createObjectURL(blob)

        const urlWithPage =
          page !== null
            ? `${objectUrl}#page=${page}`
            : objectUrl

        setPdfUrl(urlWithPage)

      } catch (error) {

        console.error(
          'PDF request failed:',
          error
        )

        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError(
            'Could not load the PDF.'
          )
        }

      } finally {

        setLoading(false)

      }
    }

    loadPdf()

    // Clean up the temporary object URL
    // when the viewer is closed or the source changes.
    return () => {

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

    }

  }, [filename, page])


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
      <div className="relative min-h-0 flex-1 bg-[#525659]">

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="flex items-center gap-3">

              <span className="material-symbols-outlined animate-spin">
                progress_activity
              </span>

              <span className="text-[14px]">
                Loading PDF...
              </span>

            </div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-6">

            <div className="rounded-xl bg-white p-6 text-center shadow-lg">

              <span className="material-symbols-outlined text-[36px] text-red-500">
                error
              </span>

              <p className="mt-3 text-[14px] font-medium text-[#30303d]">
                {error}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-lg bg-[#4648d4] px-4 py-2 text-[14px] font-medium text-white hover:opacity-90"
              >
                Close
              </button>

            </div>

          </div>
        )}

        {pdfUrl && !error && (
          <iframe
            src={pdfUrl}
            title={`${filename} PDF viewer`}
            className="h-full w-full border-0"
          />
        )}

      </div>

    </div>
  )
}

export default PdfViewer