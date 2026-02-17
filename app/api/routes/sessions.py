from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Session as SessionModel, Poc, Model, User
from app.schemas.session import SessionCreate, SessionResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # poc の存在確認
    poc = db.query(Poc).filter(Poc.id == session_in.poc_id).first()
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )

    # model の存在確認
    model = db.query(Model).filter(Model.id == session_in.model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    session = SessionModel(
        user_id=current_user.id,
        poc_id=session_in.poc_id,
        model_id=session_in.model_id,
        system_prompt=session_in.system_prompt
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "poc_name": poc.name,
        "model_name": model.model_name,
        "started_at": session.started_at
    }


@router.put("/{session_id}/end", status_code=status.HTTP_200_OK)
def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    if session.ended_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already ended"
        )

    from datetime import datetime
    session.ended_at = datetime.now()
    db.commit()

    return {"session_id": session_id, "ended_at": session.ended_at}


@router.get("/{session_id}", status_code=status.HTTP_200_OK)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    poc = db.query(Poc).filter(Poc.id == session.poc_id).first()
    model = db.query(Model).filter(Model.id == session.model_id).first()

    return {
        "session_id": session.id,
        "poc_name": poc.name,
        "model_name": model.model_name,
        "system_prompt": session.system_prompt,
        "started_at": session.started_at,
        "ended_at": session.ended_at
    }
