from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PocCreate(BaseModel):
    name: str
    domain: str
    default_system_prompt: Optional[str] = None

class PocUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    default_system_prompt: Optional[str] = None

class PocResponse(BaseModel):
    id: int
    name: str
    domain: str
    default_system_prompt: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
