import os

def generate_pdf():
    # We will install reportlab if not present, and generate the PDF
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except ImportError:
        print("Installing reportlab to generate test PDF...")
        os.system("pip install reportlab")
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

    pdf_filename = "test_document.pdf"
    c = canvas.Canvas(pdf_filename, pagesize=letter)
    
    # Page 1: Title and Introduction
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, 700, "Introduction to Vector Search")
    
    c.setFont("Helvetica", 12)
    text_p1 = [
        "Vector search is a technique used in computer science and information retrieval",
        "to find items that are semantically similar to a query item. Unlike traditional",
        "keyword searches that look for exact word matches, vector search converts words,",
        "sentences, or entire documents into high-dimensional mathematical vectors.",
        "These vectors represent the meaning or context of the text.",
        "",
        "In this guide, we will explore how vector database systems index high-dimensional",
        "vectors and perform fast similarity search using algorithms like HNSW (Hierarchical",
        "Navigable Small World) and cosine similarity metrics."
    ]
    y = 650
    for line in text_p1:
        c.drawString(50, y, line)
        y -= 20
        
    c.showPage()
    
    # Page 2: Vector Embedding and Storage
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, 720, "Vector Embeddings and Database Storage")
    
    c.setFont("Helvetica", 12)
    text_p2 = [
        "A vector embedding is a numerical representation of data in a high-dimensional space.",
        "Typically, deep learning models (such as BERT or Sentence-Transformers) output",
        "embeddings with dimensions ranging from 384 to 1536 float values.",
        "",
        "Key concepts of vector storage include:",
        "1. High-Dimensional Indexing: Databases like pgvector and ChromaDB create index",
        "   structures to search through millions of vectors in milliseconds.",
        "2. Cosine Similarity: A common mathematical metric used to calculate the angle",
        "   between two vectors. A smaller angle means higher semantic similarity.",
        "3. Chunking: Large documents are broken down into smaller chunks (e.g. 512 tokens)",
        "   so that the search results can point to the exact location/page of interest."
    ]
    y = 670
    for line in text_p2:
        c.drawString(50, y, line)
        y -= 20
        
    c.showPage()
    
    # Page 3: RAG (Retrieval-Augmented Generation)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, 720, "Retrieval-Augmented Generation (RAG)")
    
    c.setFont("Helvetica", 12)
    text_p3 = [
        "Retrieval-Augmented Generation (RAG) is a framework that combines information retrieval",
        "with large language model (LLM) text synthesis.",
        "",
        "The RAG workflow operates as follows:",
        "First, the user asks a question (the query). The query is converted into a vector",
        "using the same embedding model. Second, the vector database is queried to find the",
        "most similar text chunks from the ingested PDFs. Third, these relevant chunks are",
        "injected into the prompt context of the LLM. Finally, the LLM generates a factual,",
        "grounded answer using the provided context, preventing hallucinations."
    ]
    y = 670
    for line in text_p3:
        c.drawString(50, y, line)
        y -= 20
        
    c.showPage()
    c.save()
    print(f"Generated {pdf_filename} successfully!")

if __name__ == "__main__":
    generate_pdf()
