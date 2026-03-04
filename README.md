# llamune_poc

llamune プロジェクトの PoC 用アプリケーションです。ユーザーが特定の事業領域に関する会話を閉域LLMと行い、回答を評価・記録します。記録されたデータは llamune_learning でのファインチューニングに活用されます。

## llamune プロジェクト構成

| アプリ名 | 状態 | 概要 |
|---|---|---|
| llamune_monkey | 開発済み | インスタンスレジストリ・ルーティング・監視 |
| llamune_chat | 開発済み | 複数の閉域LLMを切り替えながらチャット |
| llamune_code | 開発済み | ローカルLLMを使ったコーディング支援 |
| llamune_poc | 開発中 | 閉域LLMの回答を評価・記録するテスト環境 |
| llamune_learning | 計画中 | 訓練データ生成・管理・ファインチューニング実行 |

## 技術スタック

| コンポーネント | 技術 |
|---|---|
| フロントエンド | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| バックエンド | Python 3.11 / FastAPI |
| LLM推論 | MLX（Apple Silicon）|
| データベース | PostgreSQL 16（ローカル） |
| 認証 | APIキー（X-API-Key ヘッダー） / 内部トークン（X-Internal-Token ヘッダー） |
| マイグレーション | Alembic |

## 動作環境

- Apple Silicon Mac（M4 Mac mini 64GB で開発・検証済み）
- Python 3.11
- PostgreSQL 16
- Node.js 18+

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

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `DATABASE_URL` | `` | PostgreSQL 接続 URL |
| `MONKEY_URL` | `` | llamune_monkey の URL |
| `INSTANCE_ID` | `unnamed` | このインスタンスの識別子 |
| `INSTANCE_DESCRIPTION` | `INSTANCE_ID` と同じ | このインスタンスの説明 |
| `SELF_URL` | `http://localhost:8000` | monkey がこのインスタンスへ接続する URL |
| `INTERNAL_TOKEN` | `` | monkey との内部通信用トークン（monkey と合わせる） |
| `HEARTBEAT_INTERVAL` | `30` | monkey へのハートビート間隔（秒）。monkey の `HEARTBEAT_INTERVAL_MS` ÷ 1000 と合わせる |

### 4. マイグレーションの実行
```bash
alembic upgrade head
```

### 5. フロントエンドのセットアップ
```bash
cd web
npm install
cd ..
```

## 起動方法

### バックエンド起動
```bash
uvicorn app.main:app
```

起動時に `MONKEY_URL` が設定されていれば自動的に monkey へ登録されます。  
以降は `HEARTBEAT_INTERVAL` 秒ごとにハートビートを送信します。monkey が再起動した場合は次のハートビートで自動再登録されます。

起動後、http://localhost:8000 でアクセス可能

> ⚠️ `--reload` オプションを使うとファイル変更時に自動再起動します。本番環境では使用しないでください。

### フロントエンド起動（別ターミナル）
```bash
cd web
npm run dev
```

起動後、http://localhost:5173 でアクセス可能

## 初回利用時の手順

1. フロントエンド（http://localhost:5173）にアクセス
2. 「設定」画面でユーザーを作成し、APIキーを取得
3. 取得したAPIキーを「APIキー」欄に保存
4. 「設定」画面でPoCを作成（名前・ドメイン・デフォルトシステムプロンプト）
5. 「ホーム」からセッションを開始してチャット

## llamune_monkey との連携

llamune_poc は起動時に llamune_monkey へ自動登録し、定期的にハートビートを送信します。

```
poc 起動      → POST /api/registry/register
定期ハートビート → PUT  /api/registry/{instance_id}/heartbeat
              → 404 が返った場合は自動再登録（monkey 再起動に対応）
poc 終了      → DELETE /api/registry/{instance_id}
```

## ドキュメント

- [プロジェクト設計](docs/DESIGN.md)
- [データベース設計](docs/DATABASE.md)
- [API設計](docs/API.md)

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
│   │   ├── llm.py
│   │   └── state.py
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
│   └── API.md
├── migrations/
│   └── versions/
├── web/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
├── .env.example
├── .gitignore
├── alembic.ini
├── requirements.txt
└── README.md
```

## ライセンス

MIT
