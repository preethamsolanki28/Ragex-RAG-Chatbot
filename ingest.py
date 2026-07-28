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

# Lists that will store all chunks and their metadata
texts = []
metadatas = []

# Read every PDF one by one
for pdf in pdf_files:

    print(f"Reading: {pdf.name}")

    # Open the current PDF
    reader = PdfReader(pdf)

    # Read every page separately
    for page_number, page in enumerate(reader.pages, start=1):

        # Extract text from the current page
        page_text = page.extract_text() or ""

        # Skip empty pages
        if not page_text.strip():
            continue

        # Split the page into chunks
        chunks = splitter.split_text(page_text)

        # Store each chunk along with its metadata
        for chunk in chunks:
            texts.append(chunk)

            metadatas.append(
                {
                    "source": pdf.name,
                    "page": page_number
                }
            )

    print(f"Finished processing {pdf.name}")

print(f"\nTotal chunks from all PDFs: {len(texts)}")

# Load the embedding model
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Create the Chroma vector database
# Chroma automatically:
# - Creates embeddings
# - Stores the embeddings
# - Stores the original text
# - Stores the metadata
# - Saves everything inside the chroma_db folder

db = Chroma.from_texts(
    texts=texts,
    metadatas=metadatas,
    embedding=embedding_model,
    persist_directory="chroma_db"
)

print("\nVector database created successfully!")