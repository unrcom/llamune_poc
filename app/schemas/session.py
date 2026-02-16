from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SessionCreate(BaseModel):
    poc_id: int
    model_id: int
    system_prompt: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: int
    poc_name: str
    model_name: str
    started_at: datetime

    class Config:
        from_attributes = True
