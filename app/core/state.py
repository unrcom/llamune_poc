"""
自インスタンスの状態管理と llamune_monkey への通知
"""

import os
import httpx
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from app.core.config import INSTANCE_ID

MONKEY_URL = os.getenv("MONKEY_URL", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")


def _get_allowed_apps() -> list:
    """DBのpocテーブル全件からallowed_appsを組み立てる"""
    try:
        from app.db.database import get_db
        from app.models.base import Poc, Model
        db = next(get_db())
        try:
            pocs = db.query(Poc).filter(Poc.model_id.isnot(None)).all()
            result = []
            for poc in pocs:
                model = db.query(Model).filter(Model.id == poc.model_id).first()
                if model:
                    result.append({
                        "app_name": poc.app_name,
                        "version": model.version,
                    })
            return result
        finally:
            db.close()
    except Exception:
        return []


class ModelStatus(str, Enum):
    IDLE = "idle"
    LOADING = "loading"
    INFERRING = "inferring"


class ServerState:
    def __init__(self):
        self.model_status: ModelStatus = ModelStatus.IDLE
        self.current_model: Optional[str] = None
        self.queue_size: int = 0
        self.active_request: Optional[dict] = None

    def snapshot(self) -> dict:
        return {
            "model_status": self.model_status,
            "current_model": self.current_model,
            "queue_size": self.queue_size,
            "active_request": self.active_request,
            "allowed_apps": _get_allowed_apps(),
        }

    def _notify(self):
        """monkey へ状態を PATCH する（失敗しても無視）"""
        if not MONKEY_URL:
            return
        try:
            httpx.patch(
                f"{MONKEY_URL}/api/registry/{INSTANCE_ID}",
                json=self.snapshot(),
                headers={"X-Internal-Token": INTERNAL_TOKEN},
                timeout=3.0,
            )
        except Exception:
            pass

    def set_loading(self, model_name: str):
        self.model_status = ModelStatus.LOADING
        self.current_model = model_name
        self._notify()

    def set_inferring(self, session_id: int, question_preview: str):
        self.model_status = ModelStatus.INFERRING
        self.active_request = {
            "session_id": session_id,
            "question_preview": question_preview[:40],
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        self._notify()

    def set_idle(self):
        self.model_status = ModelStatus.IDLE
        self.active_request = None
        self._notify()

    def increment_queue(self):
        self.queue_size += 1
        self._notify()

    def decrement_queue(self):
        self.queue_size = max(0, self.queue_size - 1)
        self._notify()


# シングルトン
server_state = ServerState()
