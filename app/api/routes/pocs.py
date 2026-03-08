from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Poc, Model
from app.schemas.poc import PocCreate, PocUpdate, PocResponse
from app.core.auth import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/pocs", tags=["pocs"])


def _with_model(poc: Poc, db: Session) -> PocResponse:
    model = db.query(Model).filter(Model.id == poc.model_id).first() if poc.model_id else None
    return PocResponse(
        id=poc.id,
        name=poc.name,
        domain=poc.domain,
        app_name=poc.app_name,
        model_id=poc.model_id,
        model_name=model.model_name if model else None,
        model_version=model.version if model else None,
        default_system_prompt=poc.default_system_prompt,
        created_at=poc.created_at,
    )


@router.get("", response_model=List[PocResponse])
def get_pocs(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    pocs = db.query(Poc).all()
    return [_with_model(p, db) for p in pocs]


@router.post("", response_model=PocResponse, status_code=status.HTTP_201_CREATED)
def create_poc(
    poc_in: PocCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    if poc_in.model_id:
        model = db.query(Model).filter(Model.id == poc_in.model_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    poc = Poc(
        name=poc_in.name,
        domain=poc_in.domain,
        app_name="pending",
        model_id=poc_in.model_id,
        default_system_prompt=poc_in.default_system_prompt,
    )
    db.add(poc)
    db.flush()  # id を確定させる

    # app_name を自動生成: p{poc.id}-m{poc.model_id}
    model_part = f"m{poc.model_id}" if poc.model_id else "m0"
    poc.app_name = f"p{poc.id}-{model_part}"

    db.commit()
    db.refresh(poc)
    return _with_model(poc, db)


@router.put("/{poc_id}", response_model=PocResponse)
def update_poc(
    poc_id: int,
    poc_in: PocUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")

    if poc_in.name is not None:
        poc.name = poc_in.name
    if poc_in.domain is not None:
        poc.domain = poc_in.domain
    if poc_in.model_id is not None:
        model = db.query(Model).filter(Model.id == poc_in.model_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        poc.model_id = poc_in.model_id
        # model_id が変わったら app_name も更新
        poc.app_name = f"p{poc.id}-m{poc.model_id}"

    if poc_in.default_system_prompt is not None:
        poc.default_system_prompt = poc_in.default_system_prompt

    db.commit()
    db.refresh(poc)
    return _with_model(poc, db)


@router.post("", response_model=PocResponse, status_code=status.HTTP_201_CREATED)
def create_poc(
    poc_in: PocCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    if poc_in.model_id:
        model = db.query(Model).filter(Model.id == poc_in.model_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    poc = Poc(
        name=poc_in.name,
        domain=poc_in.domain,
        app_name="pending",
        model_id=poc_in.model_id,
        default_system_prompt=poc_in.default_system_prompt,
    )
    db.add(poc)
    db.flush()  # id を確定させる

    # app_name を自動生成: p{poc.id}-m{poc.model_id}
    model_part = f"m{poc.model_id}" if poc.model_id else "m0"
    poc.app_name = f"p{poc.id}-{model_part}"

    db.commit()
    db.refresh(poc)
    return poc


@router.put("/{poc_id}", response_model=PocResponse)
def update_poc(
    poc_id: int,
    poc_in: PocUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")

    if poc_in.name is not None:
        poc.name = poc_in.name
    if poc_in.domain is not None:
        poc.domain = poc_in.domain
    if poc_in.model_id is not None:
        model = db.query(Model).filter(Model.id == poc_in.model_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        poc.model_id = poc_in.model_id
        # model_id が変わったら app_name も更新
        poc.app_name = f"p{poc.id}-m{poc.model_id}"

    if poc_in.default_system_prompt is not None:
        poc.default_system_prompt = poc_in.default_system_prompt

    db.commit()
    db.refresh(poc)
    return poc
