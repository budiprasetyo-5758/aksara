"""
AKSARA RSCM — LLM Generation Service
Uses Qwen/Qwen2.5-7B-Instruct via HuggingFace Inference API to generate answers in Indonesian.
"""

import json
from groq import Groq
from config import settings

_client: Groq | None = None

SYSTEM_PROMPT = """Anda adalah AKSARA, asisten AI resmi dari RSCM (Rumah Sakit Cipto Mangunkusumo).
Tugas utama Anda adalah menjawab pertanyaan staf rumah sakit berdasarkan konteks dokumen yang diberikan.

Aturan ketat:
1. Jawab HANYA dalam Bahasa Indonesia.
2. Untuk pertanyaan informasi/fakta, gunakan HANYA informasi dari konteks yang diberikan. JANGAN mengarang informasi (halusinasi).
3. Jika pengguna menanyakan fakta namun tidak tersedia dalam konteks, katakan: "Maaf, informasi tersebut tidak ditemukan dalam dokumen yang tersedia."
4. Jika pengguna hanya memberikan sapaan santai (seperti "halo", "selamat siang", "terima kasih"), silakan balas sapaan tersebut dengan ramah dan profesional tanpa perlu mencari dokumen.
5. Sertakan referensi halaman jika memungkinkan.
6. Gunakan format markdown untuk tulisan.
7. PENTING: Jika pengguna secara eksplisit meminta untuk mengunduh, melihat, atau meminta file/dokumen berikan konfirmasi singkat bahwa file ditemukan, lalu buat link markdown dengan ekstrak `file_url` dari metadata dokumen dengan format persis seperti ini: `[FILE_DOWNLOAD: <file_name>](<file_url>)`."""


def get_inference_client() -> Groq:
    """Get a Groq client (lazy singleton)."""
    global _client
    if _client is None:
        _client = Groq(
            api_key=settings.GROQ_API_KEY,
        )
    return _client


def build_context(chunks: list[dict]) -> str:
    """
    Build a context string from retrieved chunks for the LLM prompt.

    Args:
        chunks: List of chunk dicts with content and metadata.

    Returns:
        Formatted context string with page references.
    """
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        page = chunk.get("page_number", "?")
        content = chunk.get("content", "")
        # Retrieve metadata for file_name and file_url
        metadata = chunk.get("metadata", {})
        file_name = metadata.get("file_name") or chunk.get("file_name", "?")
        file_url = metadata.get("file_url", "")
        
        file_info = f"[Dokumen {i}: {file_name}"
        if file_url:
            file_info += f", URL: {file_url}"
        file_info += f", Halaman {page}]\n{content}"
            
        context_parts.append(file_info)

    return "\n\n---\n\n".join(context_parts)


def generate_answer(query: str, chunks: list[dict]) -> str:
    """
    Generate an answer using Qwen2.5-7B-Instruct based on retrieved context.

    Args:
        query: The user's original question.
        chunks: List of relevant document chunks (already reranked).

    Returns:
        LLM-generated answer string in Indonesian.
    """
    context = build_context(chunks)

    user_prompt = f"""Konteks Dokumen:
{context}

Pertanyaan Pengguna:
{query}

Berikan jawaban yang akurat berdasarkan konteks di atas. Gunakan format markdown."""

    client = get_inference_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    response = client.chat.completions.create(
        messages=messages,
        model=settings.LLM_MODEL,
        max_tokens=1024,
        temperature=0.3,
        top_p=0.9,
    )

    return response.choices[0].message.content


def generate_answer_with_doc_context(query: str, doc_text: str, chunks: list[dict]) -> str:
    """
    Generate an answer using extracted document text as primary context,
    plus optional RAG chunks as supplementary context. Uses the DOC_LLM_MODEL (qwen-3-32b).
    """
    rag_context = build_context(chunks) if chunks else ""

    # Truncate doc_text to avoid exceeding token limits
    max_doc_chars = 12000
    if len(doc_text) > max_doc_chars:
        doc_text = doc_text[:max_doc_chars] + "\n\n... (dokumen terpotong karena terlalu panjang)"

    user_prompt = f"""Konteks dari Dokumen yang Dilampirkan Pengguna:
{doc_text}

{f"Konteks Tambahan dari Database:{chr(10)}{rag_context}" if rag_context else ""}

Pertanyaan Pengguna:
{query}

Berikan jawaban yang akurat berdasarkan konteks di atas. Gunakan format markdown."""

    client = get_inference_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    response = client.chat.completions.create(
        messages=messages,
        model=settings.DOC_LLM_MODEL,
        max_tokens=1024,
        temperature=0.3,
        top_p=0.9,
    )

    return response.choices[0].message.content


def generate_answer_vision(query: str, image_base64: str, mime_type: str) -> str:
    """
    Generate an answer from an image using Groq's Llama 4 Scout vision model.

    Args:
        query: The user's text prompt.
        image_base64: Base64-encoded image string.
        mime_type: MIME type of the image (e.g. 'image/png').

    Returns:
        LLM-generated answer string.
    """
    client = get_inference_client()

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": query if query.strip() else "Jelaskan gambar ini dalam Bahasa Indonesia.",
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{image_base64}",
                    },
                },
            ],
        },
    ]

    response = client.chat.completions.create(
        messages=messages,
        model=settings.VISION_MODEL,
        max_tokens=1024,
        temperature=0.3,
        top_p=0.9,
    )

    return response.choices[0].message.content


def generate_answer_local(query: str, chunks: list[dict]) -> str:
    """
    Alternative: Generate using local Transformers pipeline.
    Use this if you want to run the model locally instead of via HF API.

    Requires: pip install transformers torch accelerate
    """
    from transformers import AutoModelForCausalLM, AutoTokenizer

    context = build_context(chunks)

    user_prompt = f"""Konteks Dokumen:
{context}

Pertanyaan Pengguna:
{query}

Berikan jawaban yang akurat berdasarkan konteks di atas."""

    tokenizer = AutoTokenizer.from_pretrained(settings.LLM_MODEL)
    model = AutoModelForCausalLM.from_pretrained(
        settings.LLM_MODEL,
        torch_dtype="auto",
        device_map="auto",
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    outputs = model.generate(**inputs, max_new_tokens=1024, temperature=0.3, top_p=0.9)
    generated = outputs[0][inputs.input_ids.shape[-1] :]
    return tokenizer.decode(generated, skip_special_tokens=True)
