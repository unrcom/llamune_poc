from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import User
from app.schemas.user import UserCreate, UserResponse
from app.core.auth import get_current_admin
from typing import List

import bcrypt

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    return db.query(User).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )
    password_hash = bcrypt.hashpw(user_in.password.encode(), bcrypt.gensalt()).decode()
    user = User(username=user_in.username, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/password", status_code=status.HTTP_200_OK)
def reset_password(
    user_id: int,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user.password_hash = pwd_context.hash(user_in.password)
    db.commit()
    return {"message": f"{user.username} のパスワードをリセットしました"}


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    db.delete(user)
    db.commit()
    return {"message": f"{user.username} を削除しました"}
