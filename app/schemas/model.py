from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ModelCreate(BaseModel):
    model_name: str
    base_model: Optional[str] = None
    trained_at: Optional[datetime] = None
    description: Optional[str] = None


class ModelResponse(BaseModel):
    id: int
    model_name: str
    version: int
    base_model: Optional[str] = None
    trained_at: Optional[datetime] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
