"""
Unified chat service — switches between Ollama (local) and Groq (cloud)
based on the CHAT_PROVIDER environment variable. Same interface, same code.
"""

import json
import httpx
from config import settings


class ChatService:
    def __init__(self):
        self._provider = settings.chat_provider.lower()
        if self._provider not in ("ollama", "groq"):
            raise ValueError(f"CHAT_PROVIDER must be 'ollama' or 'groq', got '{self._provider}'")
        print(f"[ChatService] Provider: {self._provider}")

    async def stream_chat(self, messages: list[dict]):
        if self._provider == "groq":
            async for token in self._groq(messages):
                yield token
        else:
            async for token in self._ollama(messages):
                yield token

    async def _ollama(self, messages: list[dict]):
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_base_url}/api/chat",
                json={"model": settings.ollama_chat_model, "messages": messages, "stream": True},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    if data.get("done"):
                        break
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield content

    async def _groq(self, messages: list[dict]):
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        stream = await client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            stream=True,
            max_tokens=1024,
        )
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    async def health_check(self) -> bool:
        if self._provider == "groq":
            return bool(settings.groq_api_key)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{settings.ollama_base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False
