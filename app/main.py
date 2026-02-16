from fastapi import FastAPI
from app.api.routes import users, models, sessions, chat

app = FastAPI(title="llamune_poc API", version="1.0.0")

app.include_router(users.router)
app.include_router(models.router)
app.include_router(sessions.router)
app.include_router(chat.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
