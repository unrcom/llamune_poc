from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import ConversationLog, Session as SessionModel, User
from app.schemas.log import LogUpdate, LogResponse
from app.core.auth import get_current_user
from typing import List
from datetime import datetime

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("", response_model=List[LogResponse])
def get_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 自分のセッションのログのみ取得
    logs = db.query(ConversationLog).join(SessionModel).filter(
        SessionModel.user_id == current_user.id
    ).all()
    return logs

@router.get("/{log_id}", response_model=LogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(ConversationLog).join(SessionModel).filter(
        ConversationLog.id == log_id,
        SessionModel.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    return log

@router.put("/{log_id}", status_code=status.HTTP_200_OK)
def update_log(
    log_id: int,
    log_in: LogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(ConversationLog).join(SessionModel).filter(
        ConversationLog.id == log_id,
        SessionModel.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )

    # evaluation のバリデーション
    if log_in.evaluation not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evaluation must be 1, 2 or 3"
        )

    log.evaluation = log_in.evaluation
    log.reason = log_in.reason
    log.correct_answer = log_in.correct_answer
    log.priority = log_in.priority
    log.memo = log_in.memo

    db.commit()

    return {"log_id": log.id, "updated_at": datetime.now()}
