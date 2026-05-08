"""
AKSARA RSCM — LLM Generation Service
Uses OpenRouter API to access various LLM models for generating answers in Indonesian.
"""

import json
from openai import OpenAI
from config import settings

_client: OpenAI | None = None

# ── [LEGACY] Groq API client ──────────────────────────
# from groq import Groq
# _client_groq: Groq | None = None
#
# def get_inference_client() -> Groq:
#     """Get a Groq client (lazy singleton)."""
#     global _client_groq
#     if _client_groq is None:
#         _client_groq = Groq(
#             api_key=settings.GROQ_API_KEY,
#         )
#     return _client_groq
# ──────────────────────────────────────────────────────

SYSTEM_PROMPT = """Anda adalah AKSARA, asisten AI resmi dari RSCM (Rumah Sakit Cipto Mangunkusumo).
Tugas utama Anda adalah menjawab pertanyaan staf rumah sakit berdasarkan konteks dokumen yang diberikan.

## Aturan Dasar

1. Jawab HANYA dalam Bahasa Indonesia.
2. Gunakan informasi dari konteks dokumen sebagai dasar jawaban. JANGAN mengarang fakta baru (halusinasi).
3. Sertakan referensi halaman jika memungkinkan.
4. Gunakan format markdown. Jawab secara RINGKAS dan langsung ke inti.
5. Jika pengguna memberikan sapaan santai ("halo", "terima kasih"), balas dengan ramah tanpa mencari dokumen.
6. Jika pengguna meminta file/dokumen, buat link: `[FILE_DOWNLOAD: <file_name>](<file_url>)`.

## Framework Pengambilan Keputusan (SANGAT PENTING)

Sebelum menjawab, KLASIFIKASIKAN pertanyaan pengguna secara INTERNAL (jangan tampilkan label tipe A/B/C/D/E ke pengguna) ke salah satu tipe berikut:

### Tipe A — Pertanyaan Faktual Konkrit
Pertanyaan yang mencari data/angka/aturan SPESIFIK (misalnya kategori pasien tertentu, persentase tertentu).
- Jika jawabannya ADA secara eksplisit di konteks → Jawab langsung.
- Jika kategori/istilah spesifik yang ditanyakan TIDAK ADA di konteks → Katakan informasi spesifik tersebut tidak ditemukan, LALU tunjukkan informasi terkait yang ADA di dokumen agar pengguna bisa memahami apakah pertanyaannya perlu direvisi. **JANGAN tarik kesimpulan akhir atau jawaban definitif dari kategori yang berbeda.**

### Tipe B — Pertanyaan Derivatif / Kalkulatif
Pertanyaan yang bisa dijawab dengan MENERAPKAN aturan/formula yang ADA di konteks ke skenario baru.
- WAJIB lakukan perhitungan, tunjukkan langkah-langkah eksplisit.
- Contoh: Dokumen mengatakan "Operator utama 50%, sisanya dibagi rata" → Jika ditanya 3 operator, HITUNG: 50% ÷ 2 = 25%.
- Ini BUKAN halusinasi — ini penalaran valid dari fakta yang tersedia.

### Tipe C — Pertanyaan dengan Istilah Tidak Cocok
Pengguna menggunakan istilah/terminologi yang tidak ada di dokumen, tetapi mungkin ada istilah serupa.
- Katakan istilah tersebut tidak ditemukan di dokumen.
- Sarankan istilah yang mungkin dimaksud dari dokumen (contoh: "Dokumen menyebutkan 'Pasien JKN' dan 'Pasien Non-Reguler'. Apakah salah satu yang Anda maksud?").

### Tipe D — Pertanyaan Ambigu / Kurang Spesifik
Pertanyaan yang bisa merujuk ke banyak kemungkinan (misal "berapa jasa operator?" tanpa menyebutkan tipe operator atau kategori pasien).
- Tunjukkan SEMUA kemungkinan yang ada di dokumen.
- Jika perlu, minta pengguna memperjelas.

### Tipe E — Pertanyaan Komparatif
Pertanyaan yang meminta perbandingan antara dua hal yang keduanya ADA di dokumen.
- BOLEH menjawab dengan menyintesis informasi dari beberapa bagian dokumen. Ini bukan asumsi, melainkan perbandingan fakta.

## Batas Penalaran

Penalaran dan perhitungan HANYA boleh dilakukan jika:
1. Semua premis/aturan dasar sudah ADA di konteks dokumen.
2. Yang diminta adalah PENERAPAN atau KALKULASI dari aturan tersebut ke skenario baru.

Penalaran TIDAK BOLEH dilakukan jika:
1. Pertanyaan meminta fakta konkrit tentang kategori/istilah yang TIDAK ADA di dokumen.
2. Menjawab memerlukan ASUMSI tentang kategori yang tidak disebutkan dalam dokumen.
3. Kesimpulan hanya bisa ditarik dengan MENYAMAKAN kategori yang berbeda (contoh: mengasumsikan aturan untuk "pasien reguler JKN" berlaku juga untuk "pasien reguler non-JKN" tanpa bukti di dokumen)."""


def get_inference_client() -> OpenAI:
    """Get an OpenRouter client (lazy singleton)."""
    global _client
    if _client is None:
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
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


def generate_answer(query: str, chunks: list[dict], history: list[dict] = None) -> str:
    """
    Generate an answer using the configured LLM model via OpenRouter.

    Args:
        query: The user's original question.
        chunks: List of relevant document chunks (already reranked).
        history: Optional list of previous chat messages.

    Returns:
        LLM-generated answer string in Indonesian.
    """
    context = build_context(chunks)

    user_prompt = f"""Konteks Dokumen:
{context}

Pertanyaan Pengguna:
{query}

Instruksi: Klasifikasikan pertanyaan di atas (faktual/derivatif/ambigu) sesuai framework, lalu jawab dengan tepat. Jika faktual dan tidak ada di dokumen, tunjukkan info terkait tanpa memaksakan kesimpulan. Jika derivatif, hitung dan tunjukkan langkahnya. Gunakan format markdown."""

    client = get_inference_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_prompt})

    # ── Debug: log what we send to the LLM ──────────
    print(f"[Generator DEBUG] Context length: {len(context)} chars")
    print(f"[Generator DEBUG] Messages count: {len(messages)}")
    print(f"[Generator DEBUG] Model: {settings.LLM_MODEL}")
    for i, m in enumerate(messages):
        role = m['role']
        content_len = len(m['content']) if isinstance(m['content'], str) else str(m['content'])[:50]
        print(f"[Generator DEBUG]   msg[{i}]: role={role}, len={content_len}")
    # ──────────────────────────────────────────────────

    response = client.chat.completions.create(
        messages=messages,
        model=settings.LLM_MODEL,
        max_tokens=4096,
        temperature=0.3,
        top_p=0.9,
    )

    # ── Debug: log LLM response ──────────────────────
    print(f"[Generator DEBUG] finish_reason: {response.choices[0].finish_reason}")
    print(f"[Generator DEBUG] usage: {response.usage}")
    answer = response.choices[0].message.content
    print(f"[Generator DEBUG] answer preview: {answer[:100]}...")
    # ──────────────────────────────────────────────────

    return answer


async def generate_answer_stream(query: str, chunks: list[dict], history: list[dict] = None):
    """
    Streaming version of generate_answer(). Yields SSE-formatted chunks.
    Uses OpenAI SDK's native streaming support (stream=True).

    The OpenAI SDK streaming is synchronous, so we run it in a thread
    and yield from an async generator via a queue.

    Args:
        query: The user's original question.
        chunks: List of relevant document chunks (already reranked).
        history: Optional list of previous chat messages.

    Yields:
        SSE-formatted strings: 'data: {"token": "..."}\n\n'
        Final: 'data: {"done": true}\n\n'
    """
    import asyncio
    import queue
    import threading

    context = build_context(chunks)

    user_prompt = f"""Konteks Dokumen:
{context}

Pertanyaan Pengguna:
{query}

Instruksi: Klasifikasikan pertanyaan di atas (faktual/derivatif/ambigu) sesuai framework, lalu jawab dengan tepat. Jika faktual dan tidak ada di dokumen, tunjukkan info terkait tanpa memaksakan kesimpulan. Jika derivatif, hitung dan tunjukkan langkahnya. Gunakan format markdown."""

    client = get_inference_client()

    messages_list = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    if history:
        for msg in history:
            messages_list.append({"role": msg["role"], "content": msg["content"]})
    messages_list.append({"role": "user", "content": user_prompt})

    print(f"[Generator Stream] Starting stream, context={len(context)} chars, model={settings.LLM_MODEL}")

    # Use a thread-safe queue to bridge sync streaming → async generator
    q: queue.Queue = queue.Queue()
    _SENTINEL = object()

    def _stream_worker():
        """Runs in a thread: calls the sync streaming API and puts chunks in the queue."""
        try:
            stream = client.chat.completions.create(
                messages=messages_list,
                model=settings.LLM_MODEL,
                max_tokens=4096,
                temperature=0.3,
                top_p=0.9,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    q.put(delta.content)
        except Exception as e:
            q.put(e)  # Signal error
        finally:
            q.put(_SENTINEL)  # Signal completion

    # Start streaming in a background thread
    thread = threading.Thread(target=_stream_worker, daemon=True)
    thread.start()

    # Yield SSE chunks as they arrive from the thread
    full_answer_parts = []
    while True:
        # Non-blocking poll with short sleep to stay async-friendly
        try:
            item = await asyncio.to_thread(q.get, timeout=60)
        except Exception:
            break

        if item is _SENTINEL:
            break
        if isinstance(item, Exception):
            yield f'data: {json.dumps({"error": str(item)})}\n\n'
            break

        full_answer_parts.append(item)
        yield f'data: {json.dumps({"token": item})}\n\n'

    full_answer = "".join(full_answer_parts)
    yield f'data: {json.dumps({"done": True, "full_answer": full_answer})}\n\n'
    print(f"[Generator Stream] Complete, {len(full_answer)} chars")



def generate_answer_with_doc_context(query: str, doc_text: str, chunks: list[dict], history: list[dict] = None) -> str:
    """
    Generate an answer using extracted document text as primary context,
    plus optional RAG chunks as supplementary context. Uses the DOC_LLM_MODEL.
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

Instruksi: Klasifikasikan pertanyaan di atas (faktual/derivatif/ambigu) sesuai framework, lalu jawab dengan tepat. Jika faktual dan tidak ada di dokumen, tunjukkan info terkait tanpa memaksakan kesimpulan. Jika derivatif, hitung dan tunjukkan langkahnya. Gunakan format markdown."""

    client = get_inference_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_prompt})

    response = client.chat.completions.create(
        messages=messages,
        model=settings.DOC_LLM_MODEL,
        max_tokens=4096,
        temperature=0.3,
        top_p=0.9,
    )

    return response.choices[0].message.content


def generate_answer_vision(query: str, image_base64: str, mime_type: str, history: list[dict] = None) -> str:
    """
    Generate an answer from an image using the configured vision model via OpenRouter.

    Args:
        query: The user's text prompt.
        image_base64: Base64-encoded image string.
        mime_type: MIME type of the image (e.g. 'image/png').
        history: Optional list of previous chat messages.

    Returns:
        LLM-generated answer string.
    """
    client = get_inference_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({
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
    })

    response = client.chat.completions.create(
        messages=messages,
        model=settings.VISION_MODEL,
        max_tokens=4096,
        temperature=0.3,
        top_p=0.9,
    )

    return response.choices[0].message.content


def extract_text_vision(image_base64: str, mime_type: str = "image/jpeg") -> str:
    """
    Extract raw text from a scanned document image using the Vision model via OpenRouter.
    Used as an OCR fallback when PyMuPDF cannot extract text from image-only PDF pages.

    Args:
        image_base64: Base64-encoded image of the PDF page.
        mime_type: MIME type of the image (default: 'image/jpeg').

    Returns:
        Extracted text string from the image.
    """
    client = get_inference_client()

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Ekstrak semua teks yang ada di gambar dokumen ini secara persis dan lengkap. "
                        "Keluarkan hanya teks mentah tanpa format markdown, tanpa code block, "
                        "dan tanpa komentar atau penjelasan tambahan apapun."
                    ),
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

    try:
        response = client.chat.completions.create(
            messages=messages,
            model=settings.VISION_MODEL,
            max_tokens=2048,
            temperature=0.1,
        )
        text = response.choices[0].message.content or ""
        # Strip any accidental markdown code fences
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        return text.strip()
    except Exception as e:
        print(f"[VisionOCR] Failed to extract text: {e}")
        return ""


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
