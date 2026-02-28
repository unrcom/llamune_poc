"""
自インスタンスの状態管理と llamune_monkey への通知
"""

import os
import httpx
from enum import Enum
from datetime import datetime, timezone
from typing import Optional

MONKEY_URL = os.getenv("MONKEY_URL", "")
INSTANCE_ID = os.getenv("INSTANCE_ID", "unnamed")
INSTANCE_DESCRIPTION = os.getenv("INSTANCE_DESCRIPTION", INSTANCE_ID)


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
        }

    def _notify(self):
        """monkey へ状態を PATCH する（失敗しても無視）"""
        if not MONKEY_URL:
            return
        try:
            httpx.patch(
                f"{MONKEY_URL}/api/registry/{INSTANCE_ID}",
                json=self.snapshot(),
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
