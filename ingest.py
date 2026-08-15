import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"
DATABASE_PATH = BASE_DIR / "users.db"
OWNER_EMAIL = os.getenv("PRELOADED_DOCUMENT_OWNER_EMAIL", "").strip().lower()

if not OWNER_EMAIL:
    raise ValueError(
        "PRELOADED_DOCUMENT_OWNER_EMAIL is missing from .env."
    )

if not DATABASE_PATH.exists():
    raise FileNotFoundError(
        "users.db does not exist. Start the backend and register an account first."
    )

# This script is for the bundled development PDFs. Run it once during initial
# setup, before normal users begin uploading their own documents.
chroma_has_data = any(
    item.name != '.gitkeep' for item in CHROMA_DIR.iterdir()
) if CHROMA_DIR.exists() else False
if chroma_has_data:
    raise RuntimeError(
        "chroma_db already contains data. Do not run ingest.py on a live "
        "multi-user index. Upload PDFs through the Library instead."
    )

conn = sqlite3.connect(DATABASE_PATH)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys = ON")

owner = conn.execute(
    "SELECT id FROM users WHERE email = ?",
    (OWNER_EMAIL,),
).fetchone()

if owner is None:
    conn.close()
    raise ValueError(
        f"No user exists with email '{OWNER_EMAIL}'. Register that user first."
    )

owner_user_id = int(owner["id"])

pdf_files = sorted(DATA_DIR.glob("*.pdf"))

if not pdf_files:
    conn.close()
    raise FileNotFoundError("No PDFs were found in the data folder.")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)

texts: list[str] = []
metadatas: list[dict] = []

for pdf_path in pdf_files:
    existing = conn.execute(
        """
        SELECT id
        FROM documents
        WHERE user_id = ? AND filename = ?
        """,
        (owner_user_id, pdf_path.name),
    ).fetchone()

    if existing is not None:
        document_id = int(existing["id"])
    else:
        cursor = conn.execute(
            """
            INSERT INTO documents (
                user_id, filename, original_filename, created_at
            ) VALUES (?, ?, ?, ?)
            """,
            (
                owner_user_id,
                pdf_path.name,
                pdf_path.name,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        document_id = int(cursor.lastrowid)

    reader = PdfReader(str(pdf_path))
    chunk_count = 0

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = (page.extract_text() or "").strip()

        if not page_text:
            continue

        for chunk in splitter.split_text(page_text):
            texts.append(chunk)
            metadatas.append(
                {
                    "user_id": owner_user_id,
                    "document_id": document_id,
                    "source": pdf_path.name,
                    "original_filename": pdf_path.name,
                    "page": page_number,
                }
            )
            chunk_count += 1

    print(f"  {pdf_path.name}: {chunk_count} chunks")

conn.commit()
conn.close()

if not texts:
    raise ValueError("No usable text chunks were extracted from the PDFs.")

CHROMA_DIR.mkdir(parents=True, exist_ok=True)

print(f"Total chunks: {len(texts)}")
print("Loading embedding model...")

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
)

print("Building ChromaDB...")

Chroma.from_texts(
    texts=texts,
    metadatas=metadatas,
    ids=[uuid.uuid4().hex for _ in texts],
    embedding=embedding_model,
    persist_directory=str(CHROMA_DIR),
)

print("\nInitial RAG index created successfully.")
print(f"Bundled PDFs assigned to: {OWNER_EMAIL}")
