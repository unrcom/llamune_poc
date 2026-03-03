import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import User
from app.schemas.user import UserCreate, UserResponse
from app.core.auth import get_current_user
from typing import List
import secrets

router = APIRouter(prefix="/users", tags=["users"])

MONKEY_URL = os.getenv("MONKEY_URL", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")


def _notify_monkey_add_key(api_key: str):
    if not MONKEY_URL:
        return
    try:
        httpx.post(
            f"{MONKEY_URL}/api/keys",
            json={"key": api_key},
            headers={"X-Internal-Token": INTERNAL_TOKEN},
            timeout=3.0,
        )
    except Exception:
        pass


def _notify_monkey_delete_key(api_key: str):
    if not MONKEY_URL:
        return
    try:
        httpx.delete(
            f"{MONKEY_URL}/api/keys",
            json={"key": api_key},
            headers={"X-Internal-Token": INTERNAL_TOKEN},
            timeout=3.0,
        )
    except Exception:
        pass


@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(User).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    api_key = secrets.token_hex(32)
    user = User(username=user_in.username, api_key=api_key)
    db.add(user)
    db.commit()
    db.refresh(user)
    _notify_monkey_add_key(api_key)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    _notify_monkey_delete_key(user.api_key)
    db.delete(user)
    db.commit()
    return {"message": f"{user.username} を削除しました"}
