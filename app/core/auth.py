import os
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
INTERNAL_TOKEN_HEADER = APIKeyHeader(name="X-Internal-Token")


def get_current_user(
    token: str = Security(INTERNAL_TOKEN_HEADER),
):
    if not INTERNAL_TOKEN or token != INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token",
        )
