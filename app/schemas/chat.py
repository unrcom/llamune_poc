from pydantic import BaseModel
from datetime import datetime

class ChatRequest(BaseModel):
    session_id: int
    question: str

class ChatResponse(BaseModel):
    log_id: int
    answer: str
    timestamp: datetime
