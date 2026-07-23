import sqlite3
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from pathlib import Path

from config import settings


class LeadsService:
    def __init__(self):
        self.db_path = Path(settings.data_dir) / "leads.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _connect(self):
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            with conn:
                yield conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    company TEXT,
                    message TEXT,
                    session_id TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    question TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def add_lead(self, name: str, email: str, company: str, message: str, session_id: str) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO leads (name, email, company, message, session_id, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (name, email, company, message, session_id, self._now()),
            )
            return cur.lastrowid

    def log_chat(self, session_id: str, question: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO chat_logs (session_id, question, created_at) VALUES (?, ?, ?)",
                (session_id, question, self._now()),
            )

    def list_leads(self, limit: int = 200) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM leads ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
            return [dict(r) for r in rows]

    def recent_questions(self, limit: int = 100) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM chat_logs ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
            return [dict(r) for r in rows]

    def stats(self) -> dict:
        with self._connect() as conn:
            total_leads = conn.execute("SELECT COUNT(*) c FROM leads").fetchone()["c"]
            total_questions = conn.execute("SELECT COUNT(*) c FROM chat_logs").fetchone()["c"]
            total_sessions = conn.execute(
                "SELECT COUNT(DISTINCT session_id) c FROM chat_logs WHERE session_id IS NOT NULL AND session_id != ''"
            ).fetchone()["c"]
            return {
                "total_leads": total_leads,
                "total_questions": total_questions,
                "total_sessions": total_sessions,
            }
