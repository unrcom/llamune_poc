from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# status の定義
# 1: 準備中（質問作成中）
# 2: 入力待ち（質問確定・LLM投入待ち）
# 3: 回答済み（LLM出力あり）
# 4: 評価・分類中
# 5: 評価・分類済み
# 6: 連携済み（llamune_learn連携済み）

class LogUpdate(BaseModel):
    evaluation: Optional[int] = None
    reason: Optional[str] = None
    correct_answer: Optional[str] = None
    priority: Optional[int] = None
    memo: Optional[str] = None
    dataset_ids: Optional[List[int]] = None

class LogResponse(BaseModel):
    id: int
    session_id: int
    question: str
    answer: str
    timestamp: datetime
    evaluation: Optional[int] = None
    reason: Optional[str] = None
    correct_answer: Optional[str] = None
    priority: Optional[int] = None
    status: int
    memo: Optional[str] = None
    dataset_ids: List[int] = []

    class Config:
        from_attributes = True
