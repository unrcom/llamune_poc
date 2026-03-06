from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Poc, Model
from app.schemas.poc import PocCreate, PocUpdate, PocResponse
from app.core.auth import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/pocs", tags=["pocs"])


@router.get("", response_model=List[PocResponse])
def get_pocs(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Poc).all()


@router.post("", response_model=PocResponse, status_code=status.HTTP_201_CREATED)
def create_poc(
    poc_in: PocCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    existing = db.query(Poc).filter(Poc.app_name == poc_in.app_name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="app_name already exists")

    if poc_in.model_id:
        model = db.query(Model).filter(Model.id == poc_in.model_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    poc = Poc(
        name=poc_in.name,
        domain=poc_in.domain,
        app_name=poc_in.app_name,
        model_id=poc_in.model_id,
        default_system_prompt=poc_in.default_system_prompt,
    )
    db.add(poc)
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
    if poc_in.app_name is not None:
        existing = db.query(Poc).filter(Poc.app_name == poc_in.app_name, Poc.id != poc_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="app_name already exists")
        poc.app_name = poc_in.app_name
    if poc_in.model_id is not None:
        model = db.query(Model).filter(Model.id == poc_in.model_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        poc.model_id = poc_in.model_id
    if poc_in.default_system_prompt is not None:
        poc.default_system_prompt = poc_in.default_system_prompt

    db.commit()
    db.refresh(poc)
    return poc
