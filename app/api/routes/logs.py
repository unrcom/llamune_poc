from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import ConversationLog, Session as SessionModel, Dataset, ConversationLogDataset, SystemPrompt
from app.schemas.log import LogUpdate, LogResponse
from app.core.auth import get_current_user
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/logs", tags=["logs"])


def _attach_dataset_ids(log: ConversationLog, db: Session) -> LogResponse:
    dataset_ids = [
        r.dataset_id for r in
        db.query(ConversationLogDataset).filter(ConversationLogDataset.log_id == log.id).all()
    ]
    resp = LogResponse.model_validate(log)
    resp.dataset_ids = dataset_ids

    # システムプロンプトバージョンを取得
    session = db.query(SessionModel).filter(SessionModel.id == log.session_id).first()
    if session and session.system_prompt_id:
        prompt = db.query(SystemPrompt).filter(SystemPrompt.id == session.system_prompt_id).first()
        if prompt:
            resp.system_prompt_version = prompt.version
            resp.system_prompt_content = prompt.content

    return resp


@router.get("", response_model=List[LogResponse])
def get_logs(
    poc_id: Optional[int] = Query(None),
    keyword: Optional[str] = Query(None),
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(ConversationLog)

    if poc_id is not None:
        query = query.join(SessionModel).filter(SessionModel.poc_id == poc_id)

    if keyword:
        query = query.filter(
            ConversationLog.question.ilike(f"%{keyword}%") |
            ConversationLog.answer.ilike(f"%{keyword}%")
        )

    if dataset_id is not None:
        query = query.join(
            ConversationLogDataset,
            ConversationLog.id == ConversationLogDataset.log_id
        ).filter(ConversationLogDataset.dataset_id == dataset_id)

    logs = query.order_by(ConversationLog.timestamp.desc()).all()
    return [_attach_dataset_ids(log, db) for log in logs]


@router.get("/{log_id}", response_model=LogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    log = db.query(ConversationLog).filter(ConversationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return _attach_dataset_ids(log, db)


@router.put("/{log_id}", status_code=status.HTTP_200_OK)
def update_log(
    log_id: int,
    log_in: LogUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    log = db.query(ConversationLog).filter(ConversationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")

    if log_in.evaluation not in [1, 2, 3]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="evaluation must be 1, 2 or 3")

    log.evaluation = log_in.evaluation
    log.reason = log_in.reason
    log.correct_answer = log_in.correct_answer
    log.priority = log_in.priority
    log.memo = log_in.memo

    if log_in.dataset_ids is not None:
        db.query(ConversationLogDataset).filter(ConversationLogDataset.log_id == log_id).delete()
        for did in log_in.dataset_ids:
            dataset = db.query(Dataset).filter(Dataset.id == did).first()
            if not dataset:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dataset {did} not found")
            db.add(ConversationLogDataset(log_id=log_id, dataset_id=did))

    db.commit()
    return {"log_id": log.id, "updated_at": datetime.now()}
