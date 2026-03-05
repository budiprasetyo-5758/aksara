"""
AKSARA RSCM — Document Parser Service
Uses PyMuPDF (fitz) to extract text blocks from PDFs with page numbers and bounding box metadata.
"""

import fitz  # PyMuPDF
from models.schemas import ChunkData, BoundingBox
from config import settings


def parse_pdf(file_bytes: bytes) -> list[ChunkData]:
    """
    Parse a PDF file and extract text chunks with metadata.

    Each text block from PyMuPDF includes its bounding box (x0, y0, x1, y1).
    We group blocks into chunks of approximately CHUNK_SIZE tokens,
    preserving paragraph boundaries where possible.

    Args:
        file_bytes: Raw PDF file bytes.

    Returns:
        List of ChunkData with text, page_number, bbox, and chunk_index.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    chunks: list[ChunkData] = []
    chunk_index = 0

    current_text = ""
    current_page = 0
    current_bbox = BoundingBox(x=0, y=0, width=0, height=0)

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # get_text("dict") returns blocks with bbox info
        blocks = page.get_text("dict", sort=True)["blocks"]

        for block in blocks:
            if block["type"] != 0:  # skip image blocks
                continue

            # Extract text lines from spans
            block_text = ""
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    block_text += span["text"]
                block_text += "\n"

            block_text = block_text.strip()
            if not block_text:
                continue

            # Bounding box: (x0, y0, x1, y1) → (x, y, width, height)
            x0, y0, x1, y1 = block["bbox"]
            block_bbox = BoundingBox(
                x=round(x0, 2),
                y=round(y0, 2),
                width=round(x1 - x0, 2),
                height=round(y1 - y0, 2),
            )

            # Check if adding this block exceeds chunk size
            combined = (current_text + "\n" + block_text).strip() if current_text else block_text
            token_count = len(combined.split())  # approximate token count

            if token_count > settings.CHUNK_SIZE and current_text:
                # Save current chunk
                chunks.append(
                    ChunkData(
                        text=current_text.strip(),
                        page_number=current_page + 1,  # 1-indexed
                        bbox=current_bbox,
                        chunk_index=chunk_index,
                    )
                )
                chunk_index += 1

                # Start new chunk with overlap
                overlap_words = current_text.split()[-settings.CHUNK_OVERLAP :]
                current_text = " ".join(overlap_words) + "\n" + block_text
                current_page = page_num
                current_bbox = block_bbox
            else:
                if not current_text:
                    current_page = page_num
                    current_bbox = block_bbox
                current_text = combined

    # Don't forget the last chunk
    if current_text.strip():
        chunks.append(
            ChunkData(
                text=current_text.strip(),
                page_number=current_page + 1,
                bbox=current_bbox,
                chunk_index=chunk_index,
            )
        )

    doc.close()
    return chunks


def get_total_pages(file_bytes: bytes) -> int:
    """Return the total number of pages in a PDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total = len(doc)
    doc.close()
    return total
