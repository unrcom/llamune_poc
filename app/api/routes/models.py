from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Model
from app.schemas.model import ModelCreate, ModelResponse, ModelUpdate
from app.core.auth import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=List[ModelResponse])
def get_models(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Model).all()


@router.post("", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
def create_model(
    model_in: ModelCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    latest = db.query(Model).filter(
        Model.model_name == model_in.model_name
    ).order_by(Model.version.desc()).first()
    next_version = (latest.version + 1) if latest else 1

    model = Model(
        model_name=model_in.model_name,
        version=next_version,
        base_model=model_in.base_model,
        trained_at=model_in.trained_at,
        description=model_in.description,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.patch("/{model_id}", response_model=ModelResponse)
def update_model(
    model_id: int,
    model_in: ModelUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    from app.schemas.model import ModelUpdate
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Model not found")
    for field, value in model_in.model_dump(exclude_unset=True).items():
        setattr(model, field, value)
    db.commit()
    db.refresh(model)
    return model
