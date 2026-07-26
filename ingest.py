from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

#1: Read the PDF file
reader = PdfReader("data/Physics_Notes_for_RAG.pdf")

# Store all extracted text in one string
text = "\n".join(
    page.extract_text() or ""
    for page in reader.pages
)

#2: Split the text into smaller chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100
)

chunks = splitter.split_text(text)

print(f"Total chunks created: {len(chunks)}")

#3: Load the embedding model
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

#4: Create the Chroma Vector Database
# Chroma automatically:
# 1. Creates embeddings for every chunk
# 2. Stores the embeddings
# 3. Stores the original text
# 4. Saves everything inside the "chroma_db" folder

db = Chroma.from_texts(
    texts=chunks,
    embedding=embedding_model,
    persist_directory="chroma_db"
)

print("\nVector database created successfully!")