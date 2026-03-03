import os
import httpx
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Model
from app.schemas.model import ModelCreate, ModelResponse
from app.core.auth import get_current_user
from typing import List

MONKEY_URL = os.getenv("MONKEY_URL", "")
INSTANCE_ID = os.getenv("INSTANCE_ID", "unnamed")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=List[ModelResponse])
def get_models(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    models = db.query(Model).all()
    return models


@router.post("", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
def create_model(
    model_in: ModelCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    # 同じmodel_nameの最新versionを取得して+1
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

    # monkey へ allowed_models を通知
    if MONKEY_URL:
        try:
            all_models = db.query(Model).all()
            allowed_models = [
                {"model_name": r.model_name, "version": r.version} for r in all_models
            ]
            httpx.patch(
                f"{MONKEY_URL}/api/registry/{INSTANCE_ID}",
                json={"allowed_models": allowed_models},
                headers={"X-Internal-Token": INTERNAL_TOKEN},
                timeout=3.0,
            )
        except Exception:
            pass

    return model
