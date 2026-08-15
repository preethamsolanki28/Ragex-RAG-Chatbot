# Ragex — RAG Research Assistant

Ragex is a multi-user RAG application with a ChatGPT-style conversation experience.

## Stack

- React + TypeScript + Vite
- FastAPI
- SQLite
- JWT authentication
- bcrypt password hashing
- ChromaDB
- HuggingFace `all-MiniLM-L6-v2` embeddings
- Groq for answer generation
- PyPDF for PDF extraction

## Features

- Gmail-only account registration/login
- JWT session validation on application startup
- User-specific documents
- PDF upload, extraction, chunking, embeddings and indexing
- User-filtered vector retrieval
- Grounded Groq responses with source pages
- Authenticated PDF viewer
- Persistent chat history
- New chat
- Open previous conversations
- Delete conversations
- Persistent documents/library
- Upload and delete PDFs
- Export conversations
- Responsive sidebar

## Architecture

```text
User
 |
 | login/register
 v
React
 |
 | JWT
 v
FastAPI
 |
 +--> SQLite
 |     +--> users
 |     +--> documents
 |     +--> chats
 |     +--> messages
 |
 +--> ChromaDB
 |     +--> user_id metadata filter
 |     +--> document/page metadata
 |
 +--> Groq
       |
       v
    grounded answer
```

## macOS setup

### 1. Python

Use Python 3.12.

```bash
python3.12 --version
```

Create the environment:

```bash
python3.12 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 2. Environment variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Put your real Groq key and a strong secret in `.env`.

Generate a secret on macOS:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Set:

```env
GROQ_API_KEY=your_real_key
SECRET_KEY=your_generated_secret
PRELOADED_DOCUMENT_OWNER_EMAIL=your_gmail@gmail.com
```

### 3. Start FastAPI

From the project root:

```bash
source venv/bin/activate
uvicorn backend.main:app --reload
```

API:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 4. Start React

Open another Terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in Terminal.

### 5. Create your Gmail account

Use **Sign up**.

Only addresses ending in:

```text
@gmail.com
```

are accepted.

The backend also enforces this rule, so it cannot be bypassed by calling the API directly.

### 6. Optional: index the bundled PDFs

The `data/` directory contains development PDFs.

After registering your Gmail account, set:

```env
PRELOADED_DOCUMENT_OWNER_EMAIL=your_gmail@gmail.com
```

Then run:

```bash
python ingest.py
```

Run this before using the bundled PDFs. Normal PDFs uploaded from the Library are indexed automatically.

## Chat history

Each conversation is stored in SQLite:

```text
chats
  |
  +--> messages
```

Each chat belongs to a `user_id`.

The frontend never trusts a chat ID by itself. FastAPI verifies that the requested chat belongs to the authenticated user before returning or modifying it.

## RAG flow

```text
PDF
 |
 +--> PyPDF text extraction
 |
 +--> page-aware chunking
 |
 +--> HuggingFace embeddings
 |
 +--> ChromaDB
       metadata:
       user_id
       document_id
       source
       page
 |
 +--> similarity search filtered by user_id
 |
 +--> context sent to Groq
 |
 +--> answer + source metadata
 |
 +--> saved in chat history
```

## Security model

1. Passwords are hashed with bcrypt.
2. Login returns a JWT.
3. The frontend stores the JWT locally.
4. Protected API requests send `Authorization: Bearer <token>`.
5. FastAPI verifies the JWT.
6. The authenticated `user_id` comes from the verified token.
7. Documents, chats and vector retrieval are filtered by that user ID.
8. PDF access checks ownership before returning the file.

## Interview-level concepts

You do not need to memorize the code. Understand:

- Authentication vs authorization
- JWT structure and expiration
- Why passwords are hashed instead of encrypted
- Why `user_id` comes from the verified JWT
- SQLite foreign keys and user ownership
- Persistent chat/message modeling
- PDF extraction and chunking
- Embeddings and vector similarity
- ChromaDB metadata filtering
- RAG grounding and prompt construction
- Source/page metadata
- React state vs persistent backend state
- Why the frontend should not be trusted for authorization

## Git

Do not commit:

- `.env`
- `users.db`
- `chroma_db/`
- `venv/`
- `frontend/node_modules/`
- `frontend/dist/`

The root `.gitignore` already covers these.
