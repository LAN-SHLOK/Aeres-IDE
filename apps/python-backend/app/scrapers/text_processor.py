"""Text processor — chunks text for vector storage."""

from __future__ import annotations

from typing import List


def chunk_for_vectorization(
    text: str, chunk_size: int = 500, overlap: int = 50
) -> List[str]:
    """Split text into overlapping chunks respecting sentence boundaries.

    Args:
        text: The source text to chunk.
        chunk_size: Approximate number of characters per chunk.
        overlap: Number of characters of overlap between consecutive chunks.

    Returns:
        A list of text chunks.
    """
    if not text.strip():
        return []

    # Split on sentence boundaries
    sentences: List[str] = []
    current = ""
    for char in text:
        current += char
        if char in ".!?\n" and len(current.strip()) > 10:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())

    if not sentences:
        return [text[:chunk_size]]

    chunks: List[str] = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            # Carry overlap from end of previous chunk
            overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
            current_chunk = overlap_text + " " + sentence
        else:
            current_chunk = (current_chunk + " " + sentence).strip()

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:chunk_size]]
