from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import User
from app.schemas.user import UserCreate, UserResponse
import secrets

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # ユーザー名の重複チェック
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    # APIキー生成
    api_key = secrets.token_hex(32)
    user = User(username=user_in.username, api_key=api_key)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
