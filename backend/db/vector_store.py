"""
Vector store layer for E-Learning RAG.

Responsibilities:
- Initialize embedding model.
- Connect to local ChromaDB.
- Add processed chunks into vector database.
"""

import hashlib
from typing import Any

from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from backend.core.config import (
    CHROMA_COLLECTION_NAME,
    CHROMA_DIR,
    EMBEDDING_DEVICE,
    EMBEDDING_MODEL,
)


_embedder: HuggingFaceEmbeddings | None = None
_vectorstore: Chroma | None = None


def get_embedder() -> HuggingFaceEmbeddings:
    """
    Initialize and cache embedding model.
    """
    global _embedder

    if _embedder is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        _embedder = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": EMBEDDING_DEVICE},
            encode_kwargs={"normalize_embeddings": True},
        )

    return _embedder


def init_vector_store() -> Chroma:
    """
    Initialize and cache Chroma vector store.
    """
    global _vectorstore

    if _vectorstore is None:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)

        print(f"Connecting to ChromaDB at {CHROMA_DIR}")
        _vectorstore = Chroma(
            persist_directory=str(CHROMA_DIR),
            embedding_function=get_embedder(),
            collection_name=CHROMA_COLLECTION_NAME,
        )

    return _vectorstore


def build_chunk_id(chunk: dict[str, Any]) -> str:
    """
    Build stable chunk id from metadata and text.
    This helps avoid uncontrolled duplicate vectors.
    """
    text = chunk.get("text", "")
    metadata = chunk.get("metadata", {})

    source = metadata.get("source", "unknown")
    page = metadata.get("page", "unknown")
    chunk_index = metadata.get("chunk_index", "unknown")
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]

    return f"{source}_p{page}_c{chunk_index}_{text_hash}"


def add_chunks_to_db(chunks_data: list[dict[str, Any]]) -> int:
    """
    Add processed chunks into ChromaDB.

    Returns:
        Number of chunks added.
    """
    if not chunks_data:
        print("No chunks to add.")
        return 0

    db = init_vector_store()

    texts = [chunk["text"] for chunk in chunks_data]
    metadatas = [chunk["metadata"] for chunk in chunks_data]
    ids = [build_chunk_id(chunk) for chunk in chunks_data]

    print(f"Embedding and saving {len(texts)} chunks into ChromaDB...")
    db.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    print("Saved chunks into ChromaDB.")

    return len(texts)


def get_collection_count() -> int:
    """
    Return number of chunks currently stored in ChromaDB.
    """
    db = init_vector_store()
    return db._collection.count()


if __name__ == "__main__":
    from backend.ingestion.chunker import chunk_text
    from backend.ingestion.pdf_parser import parse_pdf

    test_pdf = "data/raw/sample.pdf"

    pages = parse_pdf(test_pdf)
    chunks = chunk_text(pages)

    add_chunks_to_db(chunks)

    print(f"\n=> ChromaDB currently contains {get_collection_count()} chunks.")