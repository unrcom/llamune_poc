# API 設計

全エンドポイントは RESTful API として実装します。認証が必要なエンドポイントは `X-API-Key` ヘッダーにAPIキーを付与してください。

## エンドポイント一覧

| メソッド | エンドポイント | 認証 | 概要 |
|---|---|---|---|
| GET | /health | 不要 | ヘルスチェック |
| POST | /users | 不要 | ユーザー作成・APIキー発行 |
| GET | /pocs | 必要 | PoC一覧取得 |
| PUT | /pocs/:id | 必要 | PoC更新 |
| GET | /models | 必要 | モデル一覧取得 |
| POST | /sessions | 必要 | セッション開始 |
| GET | /sessions/:id | 必要 | セッション詳細取得 |
| PUT | /sessions/:id/end | 必要 | セッション終了 |
| POST | /chat | 必要 | 質問してLLM回答を取得 |
| GET | /logs | 必要 | ログ一覧取得 |
| GET | /logs/:id | 必要 | ログ詳細取得 |
| PUT | /logs/:id | 必要 | ログ評価の更新 |

---

## POST /users — ユーザー作成・APIキー発行

認証不要。APIキーは自動生成されます。

**リクエスト**
```json
{
  "username": "your_username"
}
```

**レスポンス**
```json
{
  "id": 1,
  "username": "your_username",
  "api_key": "1a4aee978b2d...",
  "created_at": "2026-02-16T10:00:00Z"
}
```

---

## GET /pocs — PoC一覧取得

**レスポンス**
```json
[
  {
    "id": 1,
    "name": "会計システム向けPoC",
    "domain": "会計",
    "default_system_prompt": "あなたは会計の専門家です。日本語で回答してください。",
    "created_at": "2026-02-16T10:00:00Z"
  }
]
```

---

## PUT /pocs/:id — PoC更新

更新したい項目のみ指定してください。省略した項目は変更されません。

**リクエスト**
```json
{
  "name": "会計システム向けPoC",
  "domain": "会計",
  "default_system_prompt": "あなたは会計の専門家です。日本語で回答してください。"
}
```

**レスポンス**
```json
{
  "id": 1,
  "name": "会計システム向けPoC",
  "domain": "会計",
  "default_system_prompt": "あなたは会計の専門家です。日本語で回答してください。",
  "created_at": "2026-02-16T10:00:00Z"
}
```

---

## GET /models — モデル一覧取得

**レスポンス**
```json
[
  {
    "id": 1,
    "model_name": "mlx-community/Qwen2.5-14B-Instruct-4bit",
    "version": 1,
    "base_model": "qwen2.5",
    "trained_at": null,
    "description": "ベースモデル（未訓練）",
    "created_at": "2026-02-16T10:00:00Z"
  }
]
```

---

## POST /sessions — セッション開始

**リクエスト**
```json
{
  "poc_id": 1,
  "model_id": 1,
  "system_prompt": "あなたは会計の専門家です。日本語で回答してください。"
}
```

**レスポンス**
```json
{
  "session_id": 1,
  "poc_name": "会計システム向けPoC",
  "model_name": "mlx-community/Qwen2.5-14B-Instruct-4bit",
  "started_at": "2026-02-16T10:00:00Z"
}
```

---

## GET /sessions/:id — セッション詳細取得

**レスポンス**
```json
{
  "session_id": 1,
  "poc_name": "会計システム向けPoC",
  "model_name": "mlx-community/Qwen2.5-14B-Instruct-4bit",
  "system_prompt": "あなたは会計の専門家です。日本語で回答してください。",
  "started_at": "2026-02-16T10:00:00Z",
  "ended_at": null
}
```

---

## PUT /sessions/:id/end — セッション終了

**レスポンス**
```json
{
  "session_id": 1,
  "ended_at": "2026-02-16T10:30:00Z"
}
```

---

## POST /chat — 質問してLLM回答を取得

セッション開始時に設定したモデル・システムプロンプトを使用して1問1答で回答します（マルチターンなし）。

**リクエスト**
```json
{
  "session_id": 1,
  "question": "減価償却とは何ですか？"
}
```

**レスポンス**
```json
{
  "log_id": 1,
  "answer": "減価償却とは...",
  "timestamp": "2026-02-16T10:05:00Z"
}
```

※ `log_id` を使って後から `PUT /logs/:id` で評価を登録します。

---

## GET /logs — ログ一覧取得

自分のセッションのログのみ取得されます。

**レスポンス**
```json
[
  {
    "id": 1,
    "session_id": 1,
    "question": "減価償却とは何ですか？",
    "answer": "減価償却とは...",
    "timestamp": "2026-02-16T10:05:00Z",
    "evaluation": 2,
    "reason": "説明が不正確",
    "correct_answer": "減価償却とは固定資産の...",
    "priority": 1,
    "status": 1,
    "memo": null
  }
]
```

---

## GET /logs/:id — ログ詳細取得

**レスポンス**

`GET /logs` の単一アイテムと同じ形式。

---

## PUT /logs/:id — ログ評価の更新

更新できる項目は評価関連フィールドのみです。`question`・`answer`・`timestamp` は変更不可とします。

**リクエスト**
```json
{
  "evaluation": 2,
  "reason": "説明が不正確",
  "correct_answer": "減価償却とは固定資産の取得原価を耐用年数にわたって費用配分する会計処理です。",
  "priority": 1,
  "memo": "会計基準の変更に注意"
}
```

**レスポンス**
```json
{
  "log_id": 1,
  "updated_at": "2026-02-16T10:10:00Z"
}
```
