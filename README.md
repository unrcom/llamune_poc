# llamune_poc

llamune プロジェクトの PoC 用アプリケーションです。ユーザーが特定の事業領域に関する会話を閉域LLMと行い、回答を評価・記録します。記録されたデータは llamune_learn でのファインチューニングに活用されます。

## llamune プロジェクト構成

| アプリ名 | 状態 | 概要 |
|---|---|---|
| llamune_monkey | 開発済み | インスタンスレジストリ・ルーティング・監視 |
| llamune_poc | 開発済み | 閉域LLMの回答を評価・記録するテスト環境 |
| llamune_learn | 開発済み | 訓練データ管理・ファインチューニング実行 |

## 主な機能

- **チャット** — 閉域LLMとの対話・回答のストリーミング表示
- **ワークフロー** — 質問を事前登録してバッチ実行・回答収集
- **評価** — 回答の良否・優先度・training_role を設定
- **システムプロンプト管理** — バージョン管理付きシステムプロンプト
- **データセット管理** — ログをデータセットにタグ付け
- **セッション管理** — システムプロンプトバージョンごとにセッションを分離

## 技術スタック

| コンポーネント | 技術 |
|---|---|
| フロントエンド | React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Tanstack Query |
| バックエンド | Python 3.11 / FastAPI |
| LLM推論 | MLX（Apple Silicon）|
| データベース | PostgreSQL 16 |
| 認証 | JWT（Bearer トークン）/ 内部トークン（X-Internal-Token ヘッダー）|
| マイグレーション | Alembic |
| プロセス管理 | pm2 |

## 動作環境

- Apple Silicon Mac（M4 Mac mini 64GB で開発・検証済み）
- Python 3.11
- PostgreSQL 16
- Node.js 18+

## セットアップ

### 1. 仮想環境と依存ライブラリ
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 環境変数の設定
```bash
cp .env.example .env
```

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL 接続 URL |
| `MONKEY_URL` | llamune_monkey の URL |
| `INTERNAL_TOKEN` | monkey との内部通信用トークン |
| `HEARTBEAT_INTERVAL` | monkey へのハートビート間隔（秒）|
| `JWT_SECRET` | JWT 署名用シークレット |
| `JWT_EXPIRE_MINUTES` | JWT の有効期限（分）|

### 3. instances テーブルへのインスタンス登録

インスタンス情報は Primary DB（llamune_poc DB）の `instances` テーブルで管理します。
起動前に対象インスタンスのレコードを登録してください。
```sql
INSERT INTO instances (instance_id, component, display_name, self_url) VALUES
  ('poc-back-1', 'poc', 'p1', 'http://<host>:<port>');
```

| カラム | 説明 |
|--------|------|
| `instance_id` | インスタンスの識別子（起動時に `INSTANCE_ID_ARG` で指定）|
| `component` | コンポーネント種別（`poc` / `learn` / `monkey`）|
| `display_name` | 表示名 |
| `self_url` | monkey がこのインスタンスへ接続する URL（起動時に `SELF_URL_ARG` で上書き可）|

### 4. マイグレーションの実行
```bash
alembic upgrade head
```

### 5. フロントエンドのセットアップ
```bash
cd web && npm install && cd ..
```

フロントエンドの環境変数:
```bash
cp web/.env.example web/.env
```

| 変数名 | 説明 |
|--------|------|
| `VITE_MONKEY_URL` | llamune_monkey の HTTP URL |
| `VITE_MONKEY_WS_URL` | llamune_monkey の WebSocket URL |

## 起動方法

### pm2 で起動（推奨）

`ecosystem.config.cjs` の `env` に `INSTANCE_ID_ARG` と `PORT` を設定して起動します。
```js
// ecosystem.config.cjs の例（複数インスタンス）
{
  name: 'poc-back-1',
  env: { INSTANCE_ID_ARG: 'poc-back-1', PORT: '8000' }
},
{
  name: 'poc-back-2',
  env: { INSTANCE_ID_ARG: 'poc-back-2', PORT: '8001' }
}
```
```bash
pm2 start ecosystem.config.cjs
```

フロントエンドも同様に `web/ecosystem.config.cjs` で複数インスタンス起動できます。
```bash
cd web && pm2 start ecosystem.config.cjs
```

### 手動起動
```bash
# バックエンド
source .venv/bin/activate
INSTANCE_ID_ARG=poc-back-1 uvicorn app.main:app --host 0.0.0.0 --port 8000

# フロントエンド（別ターミナル）
cd web && npm run dev -- --port 5173 --host
```

### self_url の上書き（Docker等）

`SELF_URL_ARG` を指定すると `instances` テーブルの `self_url` を上書きできます。
```bash
INSTANCE_ID_ARG=poc-back-1 SELF_URL_ARG=http://192.168.1.10:8000 uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## llamune_monkey との連携
```
poc 起動        → POST /api/registry/register
定期ハートビート → PUT  /api/registry/{instance_id}/heartbeat
poc 終了        → DELETE /api/registry/{instance_id}
```

## training_role の定義

| 値 | 名称 | 説明 |
|----|------|------|
| 1 | correction（修正） | LLMの回答が誤り・不十分で正しい回答を学習させるデータ |
| 2 | reinforcement（強化） | 正しいが重要な概念でさらに強化するデータ |
| 3 | graduated（修了） | 学習済みで改善が確認されたデータ |
| 4 | negative（否定例） | こう答えてはいけない否定的な例 |
| 5 | synthetic（合成） | 人手で作成した理想的なQ&Aペア |
| 6 | boundary（境界） | 専門外の質問に「わかりません」と答えさせるデータ |

## ドキュメント

- [プロジェクト設計](docs/DESIGN.md)
- [データベース設計](docs/DATABASE.md)
- [API設計](docs/API.md)
- [PostgreSQLフェイルオーバー](docs/postgresql_failover.md)

## ライセンス

MIT
