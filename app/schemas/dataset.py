from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class DatasetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system: bool
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
