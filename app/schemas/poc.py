from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PocCreate(BaseModel):
    name: str
    domain: str
    model_id: Optional[int] = None
    default_system_prompt: Optional[str] = None


class PocUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    model_id: Optional[int] = None
    default_system_prompt: Optional[str] = None


class PocResponse(BaseModel):
    id: int
    name: str
    domain: str
    app_name: str
    model_id: Optional[int] = None
    default_system_prompt: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
