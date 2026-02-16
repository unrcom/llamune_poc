# llamune_poc 設計書

> llamune プロジェクト — 設計ドキュメント v1.1  
> 2026年2月16日

---

## 1. llamune プロジェクト概要

llamune は閉域LLMを業務活用するためのプロジェクトで、以下のアプリケーションで構成されます。

| アプリ名 | 状態 | 概要 |
|---|---|---|
| llamune_chat | 開発済み | 複数の閉域LLMを切り替えながらチャット（旧 llamune） |
| llamune_code | 開発済み | ローカルLLMを使ったコーディング支援 |
| llamune_poc | 開発中 | 閉域LLMの回答を評価・記録するテスト環境（llamune_test の PoC） |
| llamune_learning | 計画中 | 訓練データ生成・管理・ファインチューニング実行 |

---

## 2. llamune_poc 概要

ユーザーが特定の事業領域に関する会話を閉域LLMまたはトレーニング中のLLMと行い、回答を評価・記録するアプリケーションです。記録されたデータは llamune_learning でのファインチューニングに活用されます。

### 2.1 技術スタック

| コンポーネント | 技術 |
|---|---|
| フロントエンド | ブラウザ（Node.js 系フレームワーク） |
| バックエンド | Python / FastAPI |
| LLM推論 | MLX（Apple Silicon）|
| データベース | PostgreSQL（ローカル） |
| 認証 | APIキー（X-API-Key ヘッダー） |

### 2.2 利用フロー

1. ユーザーがAPIキーを使ってセッションを開始（モデル・ドメイン・システムプロンプトを設定）
2. ユーザーが質問を入力し、LLMが回答を返す（1問1答、マルチターンなし）
3. ユーザーが回答を評価（良い／不十分／間違い）
4. 不十分・間違いの場合は理由と正しい回答を入力
5. 記録されたデータが llamune_learning に引き渡される

---

## 3. データベース設計

データベースはローカルPostgreSQLを使用します。llamune_poc と llamune_learning で共有します。

### 3.1 poc テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| name | VARCHAR(100) | NOT NULL | PoC名 |
| domain | VARCHAR(100) | NOT NULL | 事業領域 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

### 3.2 users テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| username | VARCHAR(50) | NOT NULL, UNIQUE | ユーザー名 |
| api_key | VARCHAR(64) | NOT NULL, UNIQUE | APIキー |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

### 3.3 models テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| model_name | VARCHAR(100) | NOT NULL | MLX / Ollamaモデル文字列 |
| version | INTEGER | NOT NULL, DEFAULT 1 | 訓練バージョン |
| base_model | VARCHAR(100) | | ベースモデル名 |
| trained_at | TIMESTAMP | | 訓練日時 |
| description | TEXT | | メモ |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

### 3.4 sessions テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| user_id | INTEGER | NOT NULL, FK→users.id | ユーザーID |
| poc_id | INTEGER | NOT NULL, FK→poc.id | PoCのID |
| model_id | INTEGER | NOT NULL, FK→models.id | 使用モデルID |
| system_prompt | TEXT | | システムプロンプト全文（スナップショット） |
| started_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | セッション開始日時 |
| ended_at | TIMESTAMP | | セッション終了日時 |

### 3.5 conversation_logs テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| session_id | INTEGER | NOT NULL, FK→sessions.id | セッションID |
| question | TEXT | NOT NULL | ユーザーの質問 |
| answer | TEXT | NOT NULL | LLMの回答（自動記録） |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | 問い合わせ日時 |
| evaluation | SMALLINT | NOT NULL | 1:良い 2:不十分 3:間違い |
| reason | TEXT | | 評価の理由（evaluation 2,3 のみ） |
| correct_answer | TEXT | | 正しい回答（evaluation 2,3 のみ） |
| priority | SMALLINT | | 1:高 2:中 3:低（evaluation 2,3 のみ） |
| status | SMALLINT | NOT NULL, DEFAULT 1 | 1:未処理 2:訓練済み 3:検証済み |
| memo | TEXT | | 自由メモ |

### 3.6 コード定義

| フィールド | コード値 | 説明 |
|---|---|---|
| evaluation | 1 | 良い |
| evaluation | 2 | 不十分 |
| evaluation | 3 | 間違い |
| priority | 1 | 高 |
| priority | 2 | 中 |
| priority | 3 | 低 |
| status | 1 | 未処理 |
| status | 2 | 訓練済み |
| status | 3 | 検証済み |

---

## 4. API 設計

全エンドポイントは RESTful API として実装します。認証が必要なエンドポイントは `X-API-Key` ヘッダーにAPIキーを付与してください。

### 4.1 エンドポイント一覧

| メソッド | エンドポイント | 認証 | 概要 |
|---|---|---|---|
| POST | /sessions | 必要 | セッション開始 |
| PUT | /sessions/:id/end | 必要 | セッション終了 |
| POST | /chat | 必要 | 質問してLLM回答を取得 |
| GET | /logs | 必要 | ログ一覧取得 |
| GET | /logs/:id | 必要 | ログ詳細取得 |
| PUT | /logs/:id | 必要 | ログ評価の更新 |
| GET | /models | 必要 | モデル一覧取得 |

### 4.2 POST /sessions — セッション開始

**リクエスト**
```json
{
  "poc_id": 1,
  "model_id": 1,
  "system_prompt": "あなたは会計の専門家です..."
}
```

**レスポンス**
```json
{
  "session_id": 1,
  "poc_name": "会計システム向けPoC",
  "model_name": "qwen2.5:14b",
  "started_at": "2026-02-16T10:00:00Z"
}
```

### 4.3 POST /chat — 質問してLLM回答を取得

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
  "log_id": 123,
  "answer": "減価償却とは...",
  "timestamp": "2026-02-16T10:00:00Z"
}
```

※ `log_id` を使って後から `PUT /logs/:id` で評価を登録します。

### 4.4 PUT /logs/:id — ログ評価の更新

更新できる項目は評価関連フィールドのみです。`question`・`answer`・`timestamp` は変更不可とします。

**リクエスト**
```json
{
  "evaluation": 2,
  "reason": "計算式の説明が不正確",
  "correct_answer": "減価償却とは固定資産の...",
  "priority": 1,
  "memo": "会計基準の変更に注意"
}
```

**レスポンス**
```json
{
  "log_id": 123,
  "updated_at": "2026-02-16T10:05:00Z"
}
```

### 4.5 GET /models — モデル一覧取得

**レスポンス**
```json
{
  "models": [
    {
      "id": 1,
      "model_name": "qwen2.5:14b",
      "version": 1,
      "base_model": "qwen2.5",
      "trained_at": null,
      "description": "ベースモデル（未訓練）"
    }
  ]
}
```

---

## 5. llamune_learning との連携

llamune_poc と llamune_learning は同じローカルPostgreSQLを共有します。連携の流れは以下のとおりです。

1. llamune_poc でユーザーが会話・評価を記録（status = 1: 未処理）
2. llamune_learning が status = 1 のレコードを取得して訓練データを生成
3. 訓練データ生成後に status = 2（訓練済み）に更新
4. ファインチューニング済みモデルを models テーブルに登録（version を更新）
5. llamune_poc に戻って新バージョンのモデルで再テスト

---

## 6. 今後の検討事項

| 項目 | 内容 |
|---|---|
| 訓練データ自動生成 | LLMによるたたき台生成（llamune_learning Phase 2） |
| 外部委託ワークフロー | 外部組織による訓練データレビュー・承認フロー |
| マルチドメイン対応 | PoCでは単一ドメイン、将来的に複数ドメイン対応 |
| 本番認証 | PoC後はJWT認証への移行を検討 |
