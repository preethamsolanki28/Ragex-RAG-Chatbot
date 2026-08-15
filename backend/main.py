import os
import sqlite3
import uuid

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from groq import Groq

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from passlib.context import CryptContext

from jose import JWTError, jwt

from pydantic import BaseModel

from pypdf import PdfReader


# --------------------------------------------------
# Load environment variables
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# Project paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"
DATABASE_PATH = BASE_DIR / "users.db"

DATA_DIR.mkdir(exist_ok=True)
CHROMA_DIR.mkdir(exist_ok=True)


# --------------------------------------------------
# API keys
# --------------------------------------------------

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY not found in .env file"
    )


# --------------------------------------------------
# Authentication configuration
# --------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY not found in .env file"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# --------------------------------------------------
# Password hashing
# --------------------------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# --------------------------------------------------
# JWT authentication
# --------------------------------------------------

security = HTTPBearer()


# --------------------------------------------------
# SQLite database
# --------------------------------------------------

def init_db():
    conn = sqlite3.connect(DATABASE_PATH)

    conn.execute(
        "PRAGMA foreign_keys = ON"
    )

    # Users table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    # Documents table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            created_at TEXT NOT NULL,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
        """
    )

    # Index for faster user-document lookups
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_documents_user_id
        ON documents(user_id)
        """
    )

    conn.commit()
    conn.close()


init_db()


# --------------------------------------------------
# Database helper
# --------------------------------------------------

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)

    conn.row_factory = sqlite3.Row

    conn.execute(
        "PRAGMA foreign_keys = ON"
    )

    return conn


# --------------------------------------------------
# Password helpers
# --------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:

    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# --------------------------------------------------
# JWT helpers
# --------------------------------------------------

def create_access_token(
    user_id: int,
    email: str,
) -> str:

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# --------------------------------------------------
# Get current authenticated user
# --------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        try:
            user_id = int(user_id)

        except (TypeError, ValueError):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )

    conn = get_db_connection()

    user = conn.execute(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()

    conn.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return user


# --------------------------------------------------
# Initialize Groq
# --------------------------------------------------

client = Groq(
    api_key=GROQ_API_KEY
)


# --------------------------------------------------
# Initialize embedding model
# --------------------------------------------------

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# --------------------------------------------------
# Initialize text splitter
# --------------------------------------------------

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)


# --------------------------------------------------
# Open ChromaDB
# --------------------------------------------------

db = Chroma(
    persist_directory=str(CHROMA_DIR),
    embedding_function=embedding_model,
)


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Ragex API",
    description=(
        "Backend API for the Ragex RAG research assistant"
    ),
    version="1.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# --------------------------------------------------
# Request / response models
# --------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class ChatRequest(BaseModel):
    message: str


class Source(BaseModel):
    source: str
    page: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    created_at: str


class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    created_at: str
    message: str


# --------------------------------------------------
# Basic routes
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "message": "Ragex API is running"
    }


@app.get("/health")
def health():

    return {
        "status": "ok"
    }


# --------------------------------------------------
# Register
# --------------------------------------------------

@app.post(
    "/auth/register",
    response_model=AuthResponse,
)
def register(
    request: RegisterRequest,
):

    name = request.name.strip()

    email = request.email.strip().lower()

    password = request.password

    # Basic validation
    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required",
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required",
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be at least 6 characters"
            ),
        )

    conn = get_db_connection()

    # Check whether email already exists
    existing_user = conn.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,),
    ).fetchone()

    if existing_user is not None:
        conn.close()

        raise HTTPException(
            status_code=409,
            detail=(
                "An account with this email already exists"
            ),
        )

    # Hash password
    password_hash = hash_password(password)

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    cursor = conn.execute(
        """
        INSERT INTO users (
            name,
            email,
            password_hash,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            name,
            email,
            password_hash,
            created_at,
        ),
    )

    user_id = cursor.lastrowid

    conn.commit()
    conn.close()

    # Create JWT
    access_token = create_access_token(
        user_id=user_id,
        email=email,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user_id,
            "name": name,
            "email": email,
        },
    )


# --------------------------------------------------
# Login
# --------------------------------------------------

@app.post(
    "/auth/login",
    response_model=AuthResponse,
)
def login(
    request: LoginRequest,
):

    email = request.email.strip().lower()

    password = request.password

    conn = get_db_connection()

    user = conn.execute(
        """
        SELECT *
        FROM users
        WHERE email = ?
        """,
        (email,),
    ).fetchone()

    conn.close()

    # Don't reveal whether the email exists.
    if (
        user is None
        or not verify_password(
            password,
            user["password_hash"],
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        user_id=user["id"],
        email=user["email"],
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    )


# --------------------------------------------------
# Current user
# --------------------------------------------------

@app.get("/auth/me")
def get_me(
    current_user=Depends(get_current_user),
):

    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
    }


# --------------------------------------------------
# User documents
# --------------------------------------------------

@app.get(
    "/documents",
    response_model=list[DocumentResponse],
)
def get_documents(
    current_user=Depends(get_current_user),
):

    conn = get_db_connection()

    documents = conn.execute(
        """
        SELECT
            id,
            filename,
            original_filename,
            created_at
        FROM documents
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (current_user["id"],),
    ).fetchall()

    conn.close()

    return [
        DocumentResponse(
            id=document["id"],
            filename=document["filename"],
            original_filename=document["original_filename"],
            created_at=document["created_at"],
        )
        for document in documents
    ]


# --------------------------------------------------
# Upload PDF
# --------------------------------------------------

@app.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
)
async def upload_document(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):

    # Make sure a filename exists.
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A filename is required",
        )

    original_filename = Path(
        file.filename
    ).name

    # Only PDFs are accepted.
    if not original_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    # Generate a unique internal filename.
    stored_filename = (
        f"{uuid.uuid4().hex}.pdf"
    )

    pdf_path = DATA_DIR / stored_filename

    try:
        # Save uploaded PDF.
        with pdf_path.open("wb") as buffer:

            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                buffer.write(chunk)

        # Open PDF and extract text page-by-page.
        reader = PdfReader(str(pdf_path))

        if len(reader.pages) == 0:
            raise HTTPException(
                status_code=400,
                detail="The PDF contains no pages",
            )

        page_documents = []

        for page_number, page in enumerate(
            reader.pages,
            start=1,
        ):

            text = page.extract_text() or ""

            text = text.strip()

            if not text:
                continue

            page_documents.append(
                {
                    "text": text,
                    "page": page_number,
                }
            )

        if not page_documents:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No extractable text was found in the PDF"
                ),
            )

        # Split each page into smaller chunks.
        documents_to_store = []

        for page_document in page_documents:

            chunks = text_splitter.split_text(
                page_document["text"]
            )

            for chunk in chunks:

                documents_to_store.append(
                    {
                        "text": chunk,
                        "metadata": {
                            "user_id": current_user["id"],
                            "document_id": None,
                            "source": stored_filename,
                            "original_filename": (
                                original_filename
                            ),
                            "page": page_document["page"],
                        },
                    }
                )

        if not documents_to_store:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No usable text chunks were created"
                ),
            )

        # Create database document record.
        created_at = datetime.now(
            timezone.utc
        ).isoformat()

        conn = get_db_connection()

        cursor = conn.execute(
            """
            INSERT INTO documents (
                user_id,
                filename,
                original_filename,
                created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                current_user["id"],
                stored_filename,
                original_filename,
                created_at,
            ),
        )

        document_id = cursor.lastrowid

        conn.commit()
        conn.close()

        # Add document ID to chunk metadata.
        for document in documents_to_store:
            document["metadata"]["document_id"] = (
                document_id
            )

        # Add chunks to ChromaDB.
        db.add_texts(
            texts=[
                document["text"]
                for document in documents_to_store
            ],
            metadatas=[
                document["metadata"]
                for document in documents_to_store
            ],
        )

        return DocumentUploadResponse(
            id=document_id,
            filename=stored_filename,
            original_filename=original_filename,
            created_at=created_at,
            message="PDF uploaded and indexed successfully",
        )

    except HTTPException:
        if pdf_path.exists():
            pdf_path.unlink()

        raise

    except Exception as error:
        if pdf_path.exists():
            pdf_path.unlink()

        print(
            "Document upload failed:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to process the PDF",
        )


# --------------------------------------------------
# Chat / user-specific RAG
# --------------------------------------------------

@app.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
):

    query = request.message.strip()

    if not query:
        return ChatResponse(
            answer="Please enter a question.",
            sources=[],
        )

    user_id = current_user["id"]

    # --------------------------------------------------
    # IMPORTANT:
    # Only retrieve chunks belonging to this user.
    # --------------------------------------------------

    results = db.similarity_search(
        query,
        k=3,
        filter={
            "user_id": user_id
        },
    )

    if not results:
        return ChatResponse(
            answer=(
                "I couldn't find any relevant information "
                "in your documents."
            ),
            sources=[],
        )

    # Combine retrieved chunks into context.
    context = "\n\n".join(
        document.page_content
        for document in results
    )

    # Create RAG prompt.
    prompt = f"""
You are Ragex, a helpful AI research assistant.

Answer ONLY using the provided context.

Do not use outside knowledge.

If the answer is not present in the context, reply exactly:

"I couldn't find that information in the provided documents."

Context:
{context}

Question:
{query}
"""

    # Send context and question to Groq.
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",

        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],

        temperature=0,
    )

    answer = (
        response.choices[0].message.content
        or "I couldn't generate an answer."
    )

    # Extract source metadata.
    sources = []

    seen_sources = set()

    for document in results:

        metadata = document.metadata

        source = metadata.get("source")

        page = metadata.get("page")

        if source is None:
            continue

        source_name = str(source)

        page_number = (
            int(page)
            if page is not None
            else None
        )

        source_key = (
            source_name,
            page_number,
        )

        if source_key in seen_sources:
            continue

        seen_sources.add(source_key)

        sources.append(
            Source(
                source=source_name,
                page=page_number,
            )
        )

    return ChatResponse(
        answer=answer,
        sources=sources,
    )


# --------------------------------------------------
# PDF endpoint
# --------------------------------------------------

@app.get(
    "/pdf/{filename}"
)
def get_pdf(
    filename: str,
    current_user=Depends(get_current_user),
):

    safe_filename = Path(filename).name

    # --------------------------------------------------
    # IMPORTANT:
    # Verify that this PDF belongs to the
    # authenticated user.
    # --------------------------------------------------

    conn = get_db_connection()

    document = conn.execute(
        """
        SELECT id
        FROM documents
        WHERE filename = ?
          AND user_id = ?
        """,
        (
            safe_filename,
            current_user["id"],
        ),
    ).fetchone()

    conn.close()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="PDF not found",
        )

    pdf_path = DATA_DIR / safe_filename

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail="PDF not found",
        )

    if not pdf_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="PDF not found",
        )

    if pdf_path.suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline"
        },
    )