import { useEffect, useRef, useState } from 'react'
import PdfViewer from '../components/PdfViewer'
import { ApiError, apiFetch } from '../lib/api'
import type { Document } from '../types'

type DocumentsPageProps = {
  onSessionExpired: () => void
  onCountChange: (count: number) => void
}

function DocumentsPage({ onSessionExpired, onCountChange }: DocumentsPageProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    try {
      const data = await apiFetch<Document[]>('/documents')
      setDocuments(data)
      onCountChange(data.length)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
        return
      }
      setError(error instanceof Error ? error.message : 'Could not load documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const fetchDocuments = async () => {
      try {
        const data = await apiFetch<Document[]>('/documents')
        if (cancelled) return
        setDocuments(data)
        onCountChange(data.length)
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired()
          return
        }
        setError(error instanceof Error ? error.message : 'Could not load documents.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchDocuments()

    return () => {
      cancelled = true
    }
  }, [onCountChange, onSessionExpired])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/documents/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      )

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          onSessionExpired()
          return
        }
        throw new Error(data.detail || 'Upload failed.')
      }

      setLoading(true)
      await loadDocuments()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (document: Document) => {
    const confirmed = window.confirm(
      `Delete "${document.original_filename}"? This will remove it from your RAG knowledge base.`,
    )
    if (!confirmed) return

    try {
      await apiFetch(`/documents/${document.id}`, { method: 'DELETE' })
      setDocuments((current) => {
        const next = current.filter((item) => item.id !== document.id)
        onCountChange(next.length)
        return next
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired()
        return
      }
      setError(error instanceof Error ? error.message : 'Could not delete document.')
    }
  }

  return (
    <main className="flex h-screen flex-1 flex-col md:ml-[280px]">
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#c7c4d7] bg-white px-4 md:px-6">
        <div>
          <h2 className="text-[20px] font-semibold">Documents</h2>
          <p className="text-[12px] text-[#767586]">
            Upload PDFs and build your personal RAG knowledge base.
          </p>
        </div>

        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4648d4] to-[#22d3ee] px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[19px]">upload_file</span>
            {uploading ? 'Uploading...' : 'Upload PDF'}
          </button>
        </>
      </header>

      <div className="flex-1 overflow-y-auto bg-white px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-[#767586]">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#c7c4d7] bg-[#faf8ff] px-6 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#4648d4]">picture_as_pdf</span>
              <h3 className="mt-4 text-[18px] font-semibold">No documents yet</h3>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-[#767586]">
                Upload a PDF to add it to your personal RAG knowledge base.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-2xl border border-[#c7c4d7] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#f2f3ff]">
                      <span className="material-symbols-outlined text-[#4648d4]">description</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[#30303d]">
                        {document.original_filename}
                      </p>
                      <p className="mt-1 text-[11px] text-[#767586]">
                        Added {new Date(document.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDocument(document)}
                      className="flex-1 rounded-lg border border-[#c7c4d7] px-3 py-2 text-[13px] font-medium text-[#464554] hover:bg-[#f2f3ff]"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(document)}
                      className="rounded-lg px-3 py-2 text-[13px] font-medium text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDocument && (
        <PdfViewer
          filename={selectedDocument.filename}
          page={null}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </main>
  )
}

export default DocumentsPage
