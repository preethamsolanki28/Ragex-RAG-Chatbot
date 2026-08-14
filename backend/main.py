import os
import sqlite3
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from groq import Groq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel


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


# --------------------------------------------------
# API keys
# --------------------------------------------------

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")


# --------------------------------------------------
# Authentication configuration
# --------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY not found in .env file")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# --------------------------------------------------
# Password hashing
# --------------------------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
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

    # Enable foreign-key support in SQLite
    conn.execute("PRAGMA foreign_keys = ON")

    # Users table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # Documents table
    conn.execute("""
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
    """)

    # Index for quickly finding documents
    # belonging to a specific user.
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_documents_user_id
        ON documents(user_id)
    """)

    conn.commit()
    conn.close()


init_db()


# --------------------------------------------------
# Database helper
# --------------------------------------------------

def get_db_connection():

    conn = sqlite3.connect(DATABASE_PATH)

    conn.row_factory = sqlite3.Row

    conn.execute("PRAGMA foreign_keys = ON")

    return conn


# --------------------------------------------------
# Password helpers
# --------------------------------------------------

def hash_password(password: str) -> str:

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# --------------------------------------------------
# JWT helpers
# --------------------------------------------------

def create_access_token(
    user_id: int,
    email: str
) -> str:

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# --------------------------------------------------
# Get current authenticated user
# --------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")
        email = payload.get("email")

        if user_id is None or email is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )

    conn = get_db_connection()

    user = conn.execute(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE id = ?
        """,
        (int(user_id),)
    ).fetchone()

    conn.close()

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# --------------------------------------------------
# Initialize Groq
# --------------------------------------------------

client = Groq(
    api_key=api_key
)


# --------------------------------------------------
# Initialize embedding model
# --------------------------------------------------

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# --------------------------------------------------
# Open existing ChromaDB
# --------------------------------------------------

db = Chroma(
    persist_directory=str(CHROMA_DIR),
    embedding_function=embedding_model
)


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Ragex API",
    description="Backend API for the Ragex RAG research assistant",
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
    response_model=AuthResponse
)
def register(
    request: RegisterRequest
):

    name = request.name.strip()

    email = request.email.strip().lower()

    password = request.password


    # Basic validation
    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )


    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required"
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters"
        )


    conn = get_db_connection()


    # Check if email already exists
    existing_user = conn.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()


    if existing_user is not None:

        conn.close()

        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists"
        )


    # Hash password
    password_hash = hash_password(
        password
    )


    # Create user
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
            created_at
        )
    )


    user_id = cursor.lastrowid


    conn.commit()

    conn.close()


    # Create JWT
    access_token = create_access_token(
        user_id=user_id,
        email=email
    )


    return AuthResponse(
        access_token=access_token,

        token_type="bearer",

        user={
            "id": user_id,
            "name": name,
            "email": email
        }
    )


# --------------------------------------------------
# Login
# --------------------------------------------------

@app.post(
    "/auth/login",
    response_model=AuthResponse
)
def login(
    request: LoginRequest
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
        (email,)
    ).fetchone()


    conn.close()


    # Don't reveal whether email exists
    # or password is incorrect.
    if user is None or not verify_password(
        password,
        user["password_hash"]
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # Create JWT
    access_token = create_access_token(
        user_id=user["id"],
        email=user["email"]
    )


    return AuthResponse(
        access_token=access_token,

        token_type="bearer",

        user={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    )


# --------------------------------------------------
# Current user
# --------------------------------------------------

@app.get("/auth/me")
def get_me(
    current_user=Depends(get_current_user)
):

    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }


# --------------------------------------------------
# User documents
# --------------------------------------------------

@app.get(
    "/documents",
    response_model=list[DocumentResponse]
)
def get_documents(
    current_user=Depends(get_current_user)
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
        (current_user["id"],)
    ).fetchall()


    conn.close()


    return [
        DocumentResponse(
            id=document["id"],
            filename=document["filename"],
            original_filename=document["original_filename"],
            created_at=document["created_at"]
        )
        for document in documents
    ]


# --------------------------------------------------
# Chat / RAG endpoint
# --------------------------------------------------

@app.post(
    "/chat",
    response_model=ChatResponse
)
def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user)
):

    query = request.message.strip()


    if not query:

        return ChatResponse(
            answer="Please enter a question.",
            sources=[]
        )


    # Retrieve the top 3 most relevant chunks
    results = db.similarity_search(
        query,
        k=3
    )


    # Combine retrieved chunks into context
    context = "\n\n".join(
        doc.page_content
        for doc in results
    )


    # Create RAG prompt
    prompt = f"""
You are a helpful AI assistant.

Answer ONLY using the provided context.

If the answer is not present in the context, reply exactly:
"I couldn't find that information in the provided documents."

Context:
{context}

Question:
{query}
"""


    # Send context and question to Groq
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0
    )


    answer = response.choices[0].message.content


    # Extract source metadata
    sources = []


    for doc in results:

        metadata = doc.metadata

        source = metadata.get("source")

        page = metadata.get("page")


        if source is not None:

            sources.append(
                Source(
                    source=str(source),

                    page=(
                        int(page)
                        if page is not None
                        else None
                    )
                )
            )


    return ChatResponse(
        answer=answer,
        sources=sources
    )


# --------------------------------------------------
# PDF endpoint
# --------------------------------------------------

@app.get(
    "/pdf/{filename}"
)
def get_pdf(
    filename: str,
    current_user=Depends(get_current_user)
):

    # Only use the filename itself.
    # This prevents paths such as ../../something
    # from escaping the data directory.
    safe_filename = Path(filename).name


    pdf_path = DATA_DIR / safe_filename


    # Make sure the PDF exists
    if not pdf_path.exists():

        raise HTTPException(
            status_code=404,
            detail="PDF not found"
        )


    # Make sure it is actually a file
    if not pdf_path.is_file():

        raise HTTPException(
            status_code=404,
            detail="PDF not found"
        )


    # Only allow PDF files
    if pdf_path.suffix.lower() != ".pdf":

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )


    # Return the PDF inline so the browser displays it
    # instead of downloading it.
    return FileResponse(
        path=pdf_path,

        media_type="application/pdf",

        headers={
            "Content-Disposition": "inline"
        }
    )