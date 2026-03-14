from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# type の定義
# 1: チャット（インタラクティブ）
# 2: ワークフロー（バッチ）

# training_role の定義
# 1: train（学習用）
# 2: validation（検証用）
# 3: test（テスト用）

# status の定義
# 1: 準備中（質問作成中）
# 2: 入力待ち（質問確定・LLM投入待ち）
# 3: 回答済み（LLM出力あり）
# 4: 評価・分類中
# 5: 評価・分類済み
# 6: 連携済み（llamune_learn連携済み）


class LogUpdate(BaseModel):
    evaluation: Optional[int] = None
    correct_parts: Optional[str] = None
    incorrect_parts: Optional[str] = None
    missing_parts: Optional[str] = None
    priority: Optional[int] = None
    training_role: Optional[int] = None
    memo: Optional[str] = None
    dataset_ids: Optional[List[int]] = None


class LogResponse(BaseModel):
    id: int
    session_id: int
    type: int
    question: str
    answer: Optional[str] = None
    expected_answer: Optional[str] = None
    timestamp: datetime
    evaluation: Optional[int] = None
    correct_parts: Optional[str] = None
    incorrect_parts: Optional[str] = None
    missing_parts: Optional[str] = None
    priority: Optional[int] = None
    training_role: Optional[int] = None
    status: int
    memo: Optional[str] = None
    dataset_ids: List[int] = []
    system_prompt_version: Optional[int] = None
    system_prompt_content: Optional[str] = None

    class Config:
        from_attributes = True
