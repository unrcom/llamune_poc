from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import SystemPrompt, Poc, User
from app.schemas.system_prompt import SystemPromptCreate, SystemPromptResponse
from app.core.auth import get_current_user
from typing import List

router = APIRouter(prefix="/system-prompts", tags=["system_prompts"])


@router.get("/poc/{poc_id}", response_model=List[SystemPromptResponse])
def get_system_prompts(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    prompts = db.query(SystemPrompt).filter(
        SystemPrompt.poc_id == poc_id
    ).order_by(SystemPrompt.version.desc()).all()
    return prompts


@router.post("/poc/{poc_id}", response_model=SystemPromptResponse, status_code=status.HTTP_201_CREATED)
def create_system_prompt(
    poc_id: int,
    data: SystemPromptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")

    # 最新バージョン番号を取得
    latest = db.query(SystemPrompt).filter(
        SystemPrompt.poc_id == poc_id
    ).order_by(SystemPrompt.version.desc()).first()
    next_version = (latest.version + 1) if latest else 1

    prompt = SystemPrompt(
        poc_id=poc_id,
        content=data.content,
        version=next_version,
        created_by=current_user.id,
    )
    db.add(prompt)

    # poc のデフォルトシステムプロンプトも更新
    poc.default_system_prompt = data.content
    db.commit()
    db.refresh(prompt)
    return prompt
