import json
from pathlib import Path
from config import settings


class ProfileService:
    def __init__(self):
        self._profile: dict = {}

    def load(self) -> None:
        with open(settings.profile_path, encoding="utf-8") as f:
            self._profile = json.load(f)

    def get_profile(self) -> dict:
        return self._profile

    def get_chunks(self) -> list[dict]:
        p = self._profile
        chunks: list[dict] = []

        personal = p.get("personal", {})
        chunks.append({
            "id": "summary",
            "text": (
                f"Name: {personal.get('name')}\n"
                f"Title: {personal.get('title')}\n"
                f"Location: {personal.get('location')}\n"
                f"Summary: {personal.get('summary')}\n"
                f"Availability: {p.get('availability', '')}\n"
                f"Interests: {', '.join(p.get('interests', []))}"
            ),
            "metadata": {"section": "summary"},
        })

        for i, exp in enumerate(p.get("experience", [])):
            achievements = "\n".join(f"  - {a}" for a in exp.get("achievements", []))
            chunks.append({
                "id": f"experience_{i}",
                "text": (
                    f"Role: {exp['title']} at {exp['company']} ({exp['period']})\n"
                    f"Location: {exp.get('location', '')}\n"
                    f"Description: {exp['description']}\n"
                    f"Key Achievements:\n{achievements}"
                ),
                "metadata": {"section": "experience", "company": exp["company"]},
            })

        skills = p.get("skills", {})
        chunks.append({
            "id": "skills",
            "text": (
                f"AI & ML Skills: {', '.join(skills.get('ai_ml', []))}\n"
                f"Technical Skills: {', '.join(skills.get('technical', []))}\n"
                f"Product Management Skills: {', '.join(skills.get('product', []))}\n"
                f"Tools & Platforms: {', '.join(skills.get('tools', []))}"
            ),
            "metadata": {"section": "skills"},
        })

        for i, proj in enumerate(p.get("projects", [])):
            chunks.append({
                "id": f"project_{i}",
                "text": (
                    f"Project: {proj['name']}\n"
                    f"Description: {proj['description']}\n"
                    f"Technologies: {', '.join(proj.get('tech', []))}\n"
                    f"Impact: {proj.get('impact', '')}"
                ),
                "metadata": {"section": "projects", "project": proj["name"]},
            })

        edu_lines = [
            f"  - {e['degree']} | {e['institution']} ({e['year']})"
            for e in p.get("education", [])
        ]
        cert_lines = [
            f"  - {c['name']} by {c['issuer']} ({c['year']})"
            for c in p.get("certifications", [])
        ]
        chunks.append({
            "id": "education_certifications",
            "text": (
                "Education:\n" + "\n".join(edu_lines) + "\n\n"
                "Certifications:\n" + "\n".join(cert_lines)
            ),
            "metadata": {"section": "education"},
        })

        achievement_lines = "\n".join(
            f"  - {a}" for a in p.get("achievements", [])
        )
        chunks.append({
            "id": "achievements",
            "text": f"Achievements & Recognition:\n{achievement_lines}",
            "metadata": {"section": "achievements"},
        })

        return chunks
