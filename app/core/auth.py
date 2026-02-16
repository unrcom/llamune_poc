from fastapi import Security, HTTPException, status, Depends
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import User

API_KEY_HEADER = APIKeyHeader(name="X-API-Key")

def get_current_user(
    api_key: str = Security(API_KEY_HEADER),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.api_key == api_key).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return user
