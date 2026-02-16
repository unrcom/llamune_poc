from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Model
from app.schemas.model import ModelResponse
from app.core.auth import get_current_user
from app.models.base import User
from typing import List

router = APIRouter(prefix="/models", tags=["models"])

@router.get("", response_model=List[ModelResponse])
def get_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    models = db.query(Model).all()
    return models
