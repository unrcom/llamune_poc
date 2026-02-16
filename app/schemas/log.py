from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LogUpdate(BaseModel):
    evaluation: int
    reason: Optional[str] = None
    correct_answer: Optional[str] = None
    priority: Optional[int] = None
    memo: Optional[str] = None

class LogResponse(BaseModel):
    id: int
    session_id: int
    question: str
    answer: str
    timestamp: datetime
    evaluation: int
    reason: Optional[str] = None
    correct_answer: Optional[str] = None
    priority: Optional[int] = None
    status: int
    memo: Optional[str] = None

    class Config:
        from_attributes = True
