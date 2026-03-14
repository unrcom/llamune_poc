from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.models.base import Session as SessionModel, Poc, Model, User, SystemPrompt
from app.schemas.session import SessionCreate, SessionResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == session_in.poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    if not poc.model_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PoC にモデルが設定されていません")

    model = db.query(Model).filter(Model.id == poc.model_id).first()

    # 最新のシステムプロンプトを取得
    latest_prompt = db.query(SystemPrompt).filter(
        SystemPrompt.poc_id == poc.id
    ).order_by(SystemPrompt.version.desc()).first()

    if not latest_prompt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="システムプロンプトが設定されていません。チューニング詳細画面から登録してください。")

    # 既存セッションがあればそれを使う（poc_idごとに1セッション）
    existing_session = db.query(SessionModel).filter(
        SessionModel.poc_id == poc.id
    ).first()
    if existing_session:
        session = existing_session
    else:
        session = SessionModel(
            user_id=current_user.id,
            poc_id=poc.id,
            system_prompt=session_in.system_prompt or poc.default_system_prompt,
            system_prompt_id=latest_prompt.id if latest_prompt else None,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    return {
        "session_id": session.id,
        "poc_name": poc.name,
        "app_name": poc.app_name,
        "model_name": model.model_name,
        "started_at": session.started_at,
    }


@router.put("/{session_id}/end", status_code=status.HTTP_200_OK)
def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.ended_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session already ended")

    session.ended_at = datetime.now()
    db.commit()
    return {"session_id": session_id, "ended_at": session.ended_at}


@router.get("/{session_id}", status_code=status.HTTP_200_OK)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    poc = db.query(Poc).filter(Poc.id == session.poc_id).first()
    model = db.query(Model).filter(Model.id == poc.model_id).first()

    return {
        "session_id": session.id,
        "poc_id": session.poc_id,
        "poc_name": poc.name,
        "app_name": poc.app_name,
        "model_name": model.model_name if model else None,
        "system_prompt": session.system_prompt,
        "system_prompt_id": session.system_prompt_id,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
    }
