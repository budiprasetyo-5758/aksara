"""Debug: Test the full LLM call with increased max_tokens."""
import sys
sys.path.insert(0, ".")

from config import settings
from services.retriever import retrieve_and_rerank
from services.generator import build_context, SYSTEM_PROMPT
from openai import OpenAI

print(f"Model: {settings.LLM_MODEL}")
print(f"max_tokens: 4096\n")

query = "berapa persentase yang didapatkan jika ada operator ketiga"
chunks, sources = retrieve_and_rerank(query)
context = build_context(chunks)

user_prompt = f"""Konteks Dokumen:
{context}

Pertanyaan Pengguna:
{query}

Berikan jawaban yang akurat berdasarkan konteks di atas. Jika pertanyaan membutuhkan perhitungan atau penalaran logis dari data konteks, lakukan dan tunjukkan langkahnya. Gunakan format markdown."""

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)

print("Calling API...")
response = client.chat.completions.create(
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ],
    model=settings.LLM_MODEL,
    max_tokens=4096,
    temperature=0.3,
    top_p=0.9,
)

print(f"Finish reason: {response.choices[0].finish_reason}")
print(f"\n=== ANSWER ===\n")
print(response.choices[0].message.content)
