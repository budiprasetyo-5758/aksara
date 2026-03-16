"""
AKSARA RSCM — Document Parser Service
Uses PyMuPDF (fitz) to extract text blocks from PDFs with page numbers and bounding box metadata.
"""

import fitz  # PyMuPDF
import base64
from models.schemas import ChunkData, BoundingBox
from config import settings
from langchain_text_splitters import RecursiveCharacterTextSplitter


def parse_pdf(file_bytes: bytes, file_name: str = "Unknown", file_url: str = "") -> list[ChunkData]:
    """
    Parse a PDF file and extract text chunks semantically.

    Uses LangChain's RecursiveCharacterTextSplitter to ensure chunks 
    don't break mid-sentence. Stores page_number, file_name, and file_url in metadata.
    Falls back to Vision API OCR for scanned/image-only pages.

    Args:
        file_bytes: Raw PDF file bytes.
        file_name: The name of the document.
        file_url: The public URL of the document.

    Returns:
        List of ChunkData with text, page_number, dummy bbox, chunk_index, and metadata.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    chunks: list[ChunkData] = []
    chunk_index = 0

    # Initialize semantic text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE * 4,  # Approximate chars from token count
        chunk_overlap=settings.CHUNK_OVERLAP * 4,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        keep_separator=True
    )

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_text = page.get_text("text")

        # If the page has no extractable text, use Vision API OCR
        if not page_text.strip():
            print(f"[Parser] Page {page_num + 1} of '{file_name}' has no text — using Vision OCR...")
            try:
                from services.generator import extract_text_vision
                pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                img_bytes = pix.tobytes("jpeg")
                img_base64 = base64.b64encode(img_bytes).decode("utf-8")
                page_text = extract_text_vision(img_base64, "image/jpeg")
                if page_text.strip():
                    print(f"[Parser] Vision OCR extracted {len(page_text)} chars from page {page_num + 1}")
                else:
                    print(f"[Parser] Vision OCR returned empty for page {page_num + 1}, skipping.")
                    continue
            except Exception as e:
                print(f"[Parser] Vision OCR failed for page {page_num + 1}: {e}")
                continue

        # Split the text from this page semantically
        page_chunks = text_splitter.split_text(page_text)

        for chunk_text in page_chunks:
            chunk_text = chunk_text.strip()
            if not chunk_text:
                continue

            chunks.append(
                ChunkData(
                    text=chunk_text,
                    page_number=page_num + 1,  # 1-indexed
                    bbox=BoundingBox(x=0, y=0, width=0, height=0),  # Bbox not reliable across splits
                    chunk_index=chunk_index,
                    metadata={
                        "file_name": file_name,
                        "page_number": page_num + 1,
                        "file_url": file_url
                    }
                )
            )
            chunk_index += 1

    doc.close()
    return chunks


def get_total_pages(file_bytes: bytes) -> int:
    """Return the total number of pages in a PDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total = len(doc)
    doc.close()
    return total
