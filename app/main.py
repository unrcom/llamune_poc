import asyncio
import os
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import users, models, sessions, chat, logs, pocs, auth, datasets, system_prompts, workflows
from app.core.config import INSTANCE_ID, DISPLAY_NAME, SELF_URL
INSTANCE_TYPE = os.getenv("INSTANCE_TYPE", "poc")

MONKEY_URL = os.getenv("MONKEY_URL", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "30"))


def get_allowed_apps() -> list:
    """DBのpocテーブル全件からallowed_appsを組み立てる"""
    from app.db.database import get_db
    from app.models.base import Poc, Model
    db = next(get_db())
    try:
        pocs = db.query(Poc).filter(Poc.model_id.isnot(None)).all()
        result = []
        for poc in pocs:
            model = db.query(Model).filter(Model.id == poc.model_id).first()
            if model:
                result.append({
                    "app_name": poc.app_name,
                    "version": model.version,
                })
        return result
    finally:
        db.close()


async def _register(client: httpx.AsyncClient) -> bool:
    """monkey へ登録する。成功したら True を返す。"""
    try:
        allowed_apps = get_allowed_apps()
        await client.post(
            f"{MONKEY_URL}/api/registry/register",
            json={
                "instance_id": INSTANCE_ID,
                "url": SELF_URL,
                "display_name": DISPLAY_NAME,
                "instance_type": INSTANCE_TYPE,
                "allowed_apps": allowed_apps,
            },
            headers={"X-Internal-Token": INTERNAL_TOKEN},
            timeout=5.0,
        )
        print(f"✅ Registered to monkey: {INSTANCE_ID} (allowed_apps: {allowed_apps})")
        return True
    except Exception as e:
        print(f"⚠️  Failed to register to monkey: {e}")
        return False


async def _heartbeat_loop():
    """定期的にハートビートを送信する。404 なら再登録する。"""
    await asyncio.sleep(HEARTBEAT_INTERVAL)
    async with httpx.AsyncClient() as client:
        while True:
            try:
                allowed_apps = get_allowed_apps()
                res = await client.put(
                    f"{MONKEY_URL}/api/registry/{INSTANCE_ID}/heartbeat",
                    json={"allowed_apps": allowed_apps},
                    headers={"X-Internal-Token": INTERNAL_TOKEN},
                    timeout=5.0,
                )
                if res.status_code == 404:
                    print(f"⚠️  Heartbeat 404 — re-registering: {INSTANCE_ID}")
                    await _register(client)
            except Exception as e:
                print(f"⚠️  Heartbeat failed: {e}")
            await asyncio.sleep(HEARTBEAT_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    heartbeat_task = None
    if MONKEY_URL:
        async with httpx.AsyncClient() as client:
            await _register(client)
        heartbeat_task = asyncio.create_task(_heartbeat_loop())

    yield

    if heartbeat_task:
        heartbeat_task.cancel()
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(models.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(logs.router)
app.include_router(pocs.router)
app.include_router(datasets.router)
app.include_router(system_prompts.router)
app.include_router(workflows.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
