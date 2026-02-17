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
| フロントエンド | Node.js 系フレームワーク（`web/` ディレクトリ） |
| バックエンド | Python 3.11 / FastAPI |
| LLM推論 | MLX（Apple Silicon）|
| データベース | PostgreSQL 16（ローカル） |
| 認証 | APIキー（X-API-Key ヘッダー） |
| マイグレーション | Alembic |

## 動作環境

- Apple Silicon Mac（M4 Mac mini 64GB で開発・検証済み）
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

レスポンスに含まれる `api_key` を控えておいてください。

### 6. サーバー起動

```bash
uvicorn app.main:app --reload
```

## ドキュメント

- [プロジェクト設計](docs/DESIGN.md)
- [データベース設計](docs/DATABASE.md)
- [API設計](docs/API.md)
- [フロントエンド設計](docs/FRONTEND.md)

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
│   │       ├── logs.py
│   │       └── pocs.py
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
│   │   ├── log.py
│   │   └── poc.py
│   └── main.py
├── docs/
│   ├── DESIGN.md
│   ├── DATABASE.md
│   ├── API.md
│   └── FRONTEND.md
├── migrations/
│   └── versions/
├── web/
├── .env
├── .gitignore
├── alembic.ini
├── requirements.txt
└── README.md
```
