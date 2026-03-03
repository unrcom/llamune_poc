import os
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import users, models, sessions, chat, logs, pocs

MONKEY_URL = os.getenv("MONKEY_URL", "")
INSTANCE_ID = os.getenv("INSTANCE_ID", "unnamed")
INSTANCE_DESCRIPTION = os.getenv("INSTANCE_DESCRIPTION", INSTANCE_ID)
SELF_URL = os.getenv("SELF_URL", "http://localhost:8000")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")


def get_allowed_models() -> list:
    """DBのmodelsテーブル全件からallowed_modelsを組み立てる"""
    from app.db.database import get_db
    from app.models.base import Model as ModelRecord
    db = next(get_db())
    try:
        records = db.query(ModelRecord).all()
        return [{"model_name": r.model_name, "version": r.version} for r in records]
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時：monkey へ登録
    if MONKEY_URL:
        try:
            allowed_models = get_allowed_models()
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{MONKEY_URL}/api/registry/register",
                    json={
                        "instance_id": INSTANCE_ID,
                        "url": SELF_URL,
                        "description": INSTANCE_DESCRIPTION,
                        "allowed_models": allowed_models,
                    },
                    headers={"X-Internal-Token": INTERNAL_TOKEN},
                    timeout=5.0,
                )
            print(f"✅ Registered to monkey: {INSTANCE_ID} (allowed_models: {allowed_models})")
        except Exception as e:
            print(f"⚠️  Failed to register to monkey: {e}")

    yield

    # 終了時：monkey から登録解除
    if MONKEY_URL:
        try:
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{MONKEY_URL}/api/registry/{INSTANCE_ID}",
                    headers={"X-Internal-Token": INTERNAL_TOKEN},
                    timeout=5.0,
                )
            print(f"🗑️  Unregistered from monkey: {INSTANCE_ID}")
        except Exception as e:
            print(f"⚠️  Failed to unregister from monkey: {e}")


app = FastAPI(title="llamune_poc API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(models.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(logs.router)
app.include_router(pocs.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/instance-info")
def instance_info():
    return {
        "instance_id": INSTANCE_ID,
        "monkey_url": MONKEY_URL,
    }
