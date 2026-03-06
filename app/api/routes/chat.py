from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Session as SessionModel, Poc, Model, ConversationLog, User
from app.schemas.chat import ChatRequest
from app.core.auth import get_current_user
from app.core.llm import chat_stream

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", status_code=status.HTTP_200_OK)
def post_chat(
    chat_in: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(SessionModel).filter(
        SessionModel.id == chat_in.session_id,
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.ended_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session already ended")

    poc = db.query(Poc).filter(Poc.id == session.poc_id).first()
    model = db.query(Model).filter(Model.id == poc.model_id).first()

    def generate_and_save():
        tokens = []
        model_path = model.base_model or model.model_name
        for token in chat_stream(
            model_name=model_path,
            system_prompt=session.system_prompt,
            question=chat_in.question,
            session_id=session.id,
        ):
            tokens.append(token)
            yield token

        answer = "".join(tokens)
        log = ConversationLog(
            session_id=session.id,
            question=chat_in.question,
            answer=answer,
            evaluation=1,
        )
        db.add(log)
        db.commit()

    return StreamingResponse(generate_and_save(), media_type="text/plain")
