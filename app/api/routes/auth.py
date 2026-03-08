from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
from app.db.database import get_db
from app.models.base import User
from app.core.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(
    login_in: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == login_in.username).first()
    if not user or not bcrypt.checkpw(login_in.password.encode(), user.password_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが正しくありません",
        )
    token = create_access_token(
        user_id=user.id,
        username=user.username,
        is_admin=user.is_admin,
    )
    return LoginResponse(access_token=token)
