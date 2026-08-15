export type User = {
  id: number
  name: string
  email: string
  created_at?: string
}

export type Source = {
  filename: string
  name: string
  page: number | null
}

export type Message = {
  id?: number
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  created_at?: string
}

export type Document = {
  id: number
  filename: string
  original_filename: string
  created_at: string
}

export type AuthResponse = {
  access_token: string
  token_type: string
  user: User
}

export type ChatSummary = {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export type ChatDetail = ChatSummary & {
  messages: Message[]
}

export type ChatResponse = {
  answer: string
  sources: Source[]
}
