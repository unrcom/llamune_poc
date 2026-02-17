# データベース設計

データベースはローカルPostgreSQLを使用します。llamune_poc と llamune_learning で共有します。

## テーブル一覧

| テーブル名 | 概要 |
|---|---|
| poc | PoCの定義 |
| users | ユーザー情報・APIキー |
| models | LLMモデル情報 |
| sessions | チャットセッション |
| conversation_logs | 会話ログ・評価 |

## poc テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| name | VARCHAR(100) | NOT NULL | PoC名 |
| domain | VARCHAR(100) | NOT NULL | 事業領域 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

## users テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| username | VARCHAR(50) | NOT NULL, UNIQUE | ユーザー名 |
| api_key | VARCHAR(64) | NOT NULL, UNIQUE | APIキー |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

## models テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| model_name | VARCHAR(100) | NOT NULL | Hugging Face モデルID 例: mlx-community/Qwen2.5-14B-Instruct-4bit |
| version | INTEGER | NOT NULL, DEFAULT 1 | 訓練バージョン |
| base_model | VARCHAR(100) | | ベースモデル名 |
| trained_at | TIMESTAMP | | 訓練日時 |
| description | TEXT | | メモ |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

## sessions テーブル

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | 自動採番 |
| user_id | INTEGER | NOT NULL, FK→users.id | ユーザーID |
| poc_id | INTEGER | NOT NULL, FK→poc.id | PoCのID |
| model_id | INTEGER | NOT NULL, FK→models.id | 使用モデルID |
| system_prompt | TEXT | | システムプロンプト全文（スナップショット） |
| started_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | セッション開始日時 |
| ended_at | TIMESTAMP | | セッション終了日時 |

## conversation_logs テーブル

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
