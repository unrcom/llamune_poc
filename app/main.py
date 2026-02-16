from fastapi import FastAPI
from app.api.routes import users

app = FastAPI(title="llamune_poc API", version="1.0.0")

app.include_router(users.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
