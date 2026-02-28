from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Session as SessionModel, Model, ConversationLog, User
from app.schemas.chat import ChatRequest, ChatResponse
from app.core.auth import get_current_user
from app.core.llm import chat

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("", status_code=status.HTTP_201_CREATED)
def post_chat(
    chat_in: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # セッション確認
    session = db.query(SessionModel).filter(
        SessionModel.id == chat_in.session_id,
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

    # モデル取得
    model = db.query(Model).filter(Model.id == session.model_id).first()

    # LLM に問い合わせ
    answer = chat(
        model_name=model.model_name,
        system_prompt=session.system_prompt,
        question=chat_in.question,
        session_id=session.id
    )

    # ログ保存
    log = ConversationLog(
        session_id=session.id,
        question=chat_in.question,
        answer=answer,
        evaluation=1  # デフォルト：良い
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "log_id": log.id,
        "answer": answer,
        "timestamp": log.timestamp
    }
