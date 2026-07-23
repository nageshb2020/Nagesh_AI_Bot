from services.embed_service import EmbedService
from services.chat_service import ChatService
from services.profile_service import ProfileService
from config import settings

SYSTEM_PROMPT = """\
You are an AI recruitment assistant representing {name}.

Your role is to help recruiters and hiring managers understand {name}'s background,
skills, projects, and career goals through natural, professional conversation.

## Behaviour Rules
- Speak confidently and enthusiastically about {name}'s capabilities
- Always refer to the candidate as "{name}" or "he/his/him"
- Base ALL answers strictly on the Profile Context below — never fabricate
- If context doesn't contain the answer, say: "I don't have that specific detail — \
feel free to reach {name} directly at {email}"
- Keep responses concise and recruiter-friendly — lead with the most relevant point
- End each response with a brief invitation for follow-up questions

## Profile Context
{context}
"""


class RAGService:
    def __init__(self, embed_service: EmbedService, chat_service: ChatService, profile_service: ProfileService):
        self.embed_service = embed_service
        self.chat_service = chat_service
        self.profile_service = profile_service

    async def stream(self, query: str, history: list[dict]):
        chunks = self.embed_service.retrieve(query, n=4)
        context = "\n\n---\n\n".join(chunks) if chunks else "No context available."

        email = self.profile_service.get_profile().get("personal", {}).get("email", "")
        messages: list[dict] = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT.format(
                    name=settings.candidate_name,
                    email=email,
                    context=context,
                ),
            }
        ]

        for msg in history[-8:]:
            if msg.get("role") in ("user", "assistant") and msg.get("content"):
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": query})

        async for token in self.chat_service.stream_chat(messages):
            yield token
