# llamune_poc

llamune プロジェクトの PoC 用アプリケーションです。ユーザーが特定の事業領域に関する会話を閉域LLMと行い、回答を評価・記録します。記録されたデータは llamune_learning でのファインチューニングに活用されます。

## llamune プロジェクト構成

| アプリ名 | 状態 | 概要 |
|---|---|---|
| llamune_chat | 開発済み | 複数の閉域LLMを切り替えながらチャット |
| llamune_code | 開発済み | ローカルLLMを使ったコーディング支援 |
| llamune_poc | 開発中 | 閉域LLMの回答を評価・記録するテスト環境 |
| llamune_learning | 計画中 | 訓練データ生成・管理・ファインチューニング実行 |

## 技術スタック

| コンポーネント | 技術 |
|---|---|
| フロントエンド | Node.js 系フレームワーク（未実装） |
| バックエンド | Python 3.11 / FastAPI |
| LLM推論 | MLX（Apple Silicon）|
| データベース | PostgreSQL 16（ローカル） |
| 認証 | APIキー（X-API-Key ヘッダー） |
| マイグレーション | Alembic |

## 動作環境

- Apple Silicon Mac（M4 Mac mini 64GB で開発・検証済み）
- macOS
- Python 3.11
- PostgreSQL 16

## セットアップ

### 1. 依存ライブラリのインストール

```bash
pip3 install -r requirements.txt --break-system-packages
```

### 2. データベースの作成

```bash
createdb llamune_poc
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して設定を確認してください。

```
DATABASE_URL=postgresql://localhost/llamune_poc
```

### 4. マイグレーションの実行

```bash
alembic upgrade head
```

### 5. 初期データの登録

ユーザー作成：

```bash
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username"}'
```

レスポンスに含まれる `api_key` を控えておいてください。以降のリクエストで使用します。

モデル登録（Hugging Face のモデルIDを指定）：

```bash
psql llamune_poc -c "INSERT INTO models (model_name, version, base_model, description) VALUES ('mlx-community/Qwen2.5-14B-Instruct-4bit', 1, 'qwen2.5', 'ベースモデル（未訓練）');"
```

PoC登録：

```bash
psql llamune_poc -c "INSERT INTO poc (name, domain) VALUES ('会計システム向けPoC', '会計');"
```

### 6. サーバー起動

```bash
uvicorn app.main:app --reload
```

## API エンドポイント

認証が必要なエンドポイントは `X-API-Key` ヘッダーにAPIキーを付与してください。

| メソッド | エンドポイント | 認証 | 概要 |
|---|---|---|---|
| POST | /users | 不要 | ユーザー作成・APIキー発行 |
| GET | /models | 必要 | モデル一覧取得 |
| POST | /sessions | 必要 | セッション開始 |
| PUT | /sessions/:id/end | 必要 | セッション終了 |
| POST | /chat | 必要 | 質問してLLM回答を取得 |
| GET | /logs | 必要 | ログ一覧取得 |
| GET | /logs/:id | 必要 | ログ詳細取得 |
| PUT | /logs/:id | 必要 | ログ評価の更新 |
| GET | /health | 不要 | ヘルスチェック |

### 使用例

セッション開始：

```bash
curl -X POST http://localhost:8000/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"poc_id": 1, "model_id": 1, "system_prompt": "あなたは会計の専門家です。日本語で回答してください。"}'
```

チャット：

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"session_id": 1, "question": "減価償却とは何ですか？"}'
```

評価の更新：

```bash
curl -X PUT http://localhost:8000/logs/1 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"evaluation": 2, "reason": "説明が不正確", "correct_answer": "正しい回答", "priority": 1}'
```

## コード定義

### evaluation（評価）

| 値 | 意味 |
|---|---|
| 1 | 良い |
| 2 | 不十分 |
| 3 | 間違い |

### priority（優先度）

| 値 | 意味 |
|---|---|
| 1 | 高 |
| 2 | 中 |
| 3 | 低 |

### status（状態）

| 値 | 意味 |
|---|---|
| 1 | 未処理 |
| 2 | 訓練済み |
| 3 | 検証済み |

## プロジェクト構成

```
llamune_poc/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── users.py
│   │       ├── models.py
│   │       ├── sessions.py
│   │       ├── chat.py
│   │       └── logs.py
│   ├── core/
│   │   ├── auth.py
│   │   └── llm.py
│   ├── db/
│   │   └── database.py
│   ├── models/
│   │   └── base.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── model.py
│   │   ├── session.py
│   │   ├── chat.py
│   │   └── log.py
│   └── main.py
├── docs/
│   └── DESIGN.md
├── migrations/
│   └── versions/
├── .env
├── .gitignore
├── alembic.ini
├── requirements.txt
└── README.md
```

## llamune_learning との連携

1. llamune_poc でユーザーが会話・評価を記録（status = 1: 未処理）
2. llamune_learning が status = 1 のレコードを取得して訓練データを生成
3. 訓練データ生成後に status = 2（訓練済み）に更新
4. ファインチューニング済みモデルを models テーブルに登録（version を更新）
5. llamune_poc に戻って新バージョンのモデルで再テスト
