from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SystemPromptCreate(BaseModel):
    content: str

class SystemPromptResponse(BaseModel):
    id: int
    poc_id: int
    content: str
    version: int
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
