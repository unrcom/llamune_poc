from pydantic import BaseModel
from datetime import datetime

class PocResponse(BaseModel):
    id: int
    name: str
    domain: str
    created_at: datetime

    class Config:
        from_attributes = True
