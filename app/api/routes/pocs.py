from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Poc, User
from app.schemas.poc import PocResponse
from app.core.auth import get_current_user
from typing import List

router = APIRouter(prefix="/pocs", tags=["pocs"])

@router.get("", response_model=List[PocResponse])
def get_pocs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pocs = db.query(Poc).all()
    return pocs
