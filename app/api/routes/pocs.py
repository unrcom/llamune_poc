from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Poc, User
from app.schemas.poc import PocCreate, PocUpdate, PocResponse
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

@router.post("", response_model=PocResponse, status_code=status.HTTP_201_CREATED)
def create_poc(
    poc_in: PocCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    poc = Poc(
        name=poc_in.name,
        domain=poc_in.domain,
        default_system_prompt=poc_in.default_system_prompt
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
    current_user: User = Depends(get_current_user)
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )

    if poc_in.name is not None:
        poc.name = poc_in.name
    if poc_in.domain is not None:
        poc.domain = poc_in.domain
    if poc_in.default_system_prompt is not None:
        poc.default_system_prompt = poc_in.default_system_prompt

    db.commit()
    db.refresh(poc)
    return poc
