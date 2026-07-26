from pathlib import Path

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Get all PDF files inside the data folder
pdf_files = list(Path("data").glob("*.pdf"))

# Check whether any PDF exists
if not pdf_files:
    raise FileNotFoundError("No PDF files found inside the data folder.")

# Create the text splitter
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100
)

# List that will store chunks from every PDF
all_chunks = []

# Read every PDF one by one
for pdf in pdf_files:

    print(f"Reading: {pdf.name}")

    # Open the current PDF
    reader = PdfReader(pdf)

    # Extract text from every page
    text = "\n".join(
        page.extract_text() or ""
        for page in reader.pages
    )

    # Split the extracted text into chunks
    chunks = splitter.split_text(text)

    print(f"Created {len(chunks)} chunks.\n")

    # Add the chunks to the main list
    all_chunks.extend(chunks)

print(f"Total chunks from all PDFs: {len(all_chunks)}")

# Load the embedding model
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Create the Chroma vector database
# Chroma automatically:
# - Creates embeddings
# - Stores the embeddings
# - Stores the original text
# - Saves everything inside the chroma_db folder

db = Chroma.from_texts(
    texts=all_chunks,
    embedding=embedding_model,
    persist_directory="chroma_db"
)

print("\nVector database created successfully!")