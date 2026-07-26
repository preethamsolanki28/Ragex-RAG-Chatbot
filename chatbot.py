import os

from dotenv import load_dotenv
from google import genai

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# STEP 1 : Load the environment variables
# Reads variables from the .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# STEP 2 : Initialize Gemini
client = genai.Client(api_key=api_key)

# STEP 3 : Load the embedding model
# IMPORTANT:
# The embedding model converts the user's question into a
# vector so ChromaDB can perform semantic search.
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# STEP 4 : Load the existing Chroma database
# This DOES NOT recreate the database.
# It simply opens the existing vector database.
db = Chroma(
    persist_directory="chroma_db",
    embedding_function=embedding_model
)

print("RAG Chatbot is ready!\n")

# STEP 5 : Ask questions continuously
while True:

    query = input("Ask a question (type 'exit' to quit): ")

    if query.lower() == "exit":
        print("Goodbye!")
        break

    # Retrieve the top 3 most relevant chunks
    results = db.similarity_search(
        query,
        k=3
    )

    # Combine all retrieved chunks into one context string
    context = "\n\n".join(
        doc.page_content
        for doc in results
    )

    # Create the prompt for Gemini
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

    # Generate the answer using Gemini
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    # Display the answer
    print("\nAnswer:\n")
    print(response.text)
    print("-" * 70)