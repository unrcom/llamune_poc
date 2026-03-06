# PostgreSQL Streaming Replication 手順書

## 構成

| 役割 | ホスト | IP | OS | PostgreSQL |
|---|---|---|---|---|
| Primary | MacBook | 192.168.114.104 | macOS | 17.9 |
| Standby | Mac mini #2 | 192.168.114.109 | macOS | 17.9 |

- DB名：`llamune_poc`
- レプリケーションユーザー：`replicator`
- llamune_poc バック接続先：Primary（192.168.114.104）

---

## 1. 通常運用の確認

### レプリケーション状態確認（Primary で実行）

```bash
psql -d llamune_poc -c "SELECT client_addr, state, sent_lsn, replay_lsn FROM pg_stat_replication;"
```

正常時の出力例：

```
   client_addr   |   state   | sent_lsn  | replay_lsn
-----------------+-----------+-----------+------------
 192.168.114.109 | streaming | 0/3000060 | 0/3000060
```

- `state` が `streaming` であることを確認
- `sent_lsn` と `replay_lsn` の差が小さいことを確認（遅延の目安）

### Standby の状態確認（Standby で実行）

```bash
psql -d llamune_poc -c "SELECT status, received_lsn, last_msg_receipt_time FROM pg_stat_wal_receiver;"
```

---

## 2. 手動フェイルオーバー手順

Primary（MacBook）がダウンした場合、以下の手順で Standby（Mac mini #2）を Primary に昇格させる。

**目標復旧時間：15分以内**

### Step 1：Primary の停止を確認

Mac mini #2 から疎通確認：

```bash
ping -c 3 192.168.114.104
nc -zv 192.168.114.104 5432
```

応答がない場合、Primary がダウンしていると判断する。

### Step 2：Standby を Primary に昇格（Mac mini #2 で実行）

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_ctl promote -D /opt/homebrew/var/postgresql@17
```

昇格確認：

```bash
psql -d llamune_poc -c "SELECT pg_is_in_recovery();"
```

`f`（false）が返れば昇格成功。

### Step 3：llamune_poc バックの接続先を変更

Mac mini #2 の `llamune_poc/.env` を編集：

```bash
# 変更前
DATABASE_URL=postgresql://localhost/llamune_poc

# 変更後（Mac mini #2 自身がPrimaryになったのでlocalhostのまま）
DATABASE_URL=postgresql://localhost/llamune_poc
```

※ llamune_poc バックが Mac mini #2 で動いている場合は変更不要。  
※ llamune_poc バックが別のホストで動いている場合は `192.168.114.109` に変更する。

### Step 4：llamune_poc バックを再起動

```bash
# llamune_poc バックが動いているホストで実行
cd /path/to/llamune_poc
# プロセスを再起動（uvicorn等）
```

### Step 5：動作確認

```bash
psql -h 192.168.114.109 -U replicator -d llamune_poc -c "SELECT now();"
```

---

## 3. 旧 Primary 復旧後の再統合手順

MacBook が復旧した場合、新たに Standby として再統合する。

### Step 1：MacBook の PostgreSQL を停止

```bash
brew services stop postgresql@17
```

### Step 2：データディレクトリを削除して pg_basebackup で再同期

```bash
rm -rf /opt/homebrew/var/postgresql@17
/opt/homebrew/opt/postgresql@17/bin/pg_basebackup \
  -h 192.168.114.109 \
  -U replicator \
  -D /opt/homebrew/var/postgresql@17 \
  -P -Xs -R
```

### Step 3：MacBook を Standby として起動

```bash
brew services start postgresql@17
```

### Step 4：レプリケーション確認（Mac mini #2 で実行）

```bash
psql -d llamune_poc -c "SELECT client_addr, state, sent_lsn, replay_lsn FROM pg_stat_replication;"
```

---

## 4. スリープ対策（MacBook Primary 運用時）

MacBook がスリープすると PostgreSQL への接続が切断される。以下で防止する。

### caffeinate の常駐起動

```bash
# 手動で実行（ターミナルを閉じると止まる）
caffeinate -i &

# ログイン時に自動起動する場合
brew services start caffeinate  # ※非推奨、launchd で設定推奨
```

### システム環境設定での設定

「システム設定」→「ロック画面」→「スリープおよびスクリーンセーバーの開始」を「しない」に設定する。

---

## 5. 初期セットアップ記録

| 項目 | 値 |
|---|---|
| セットアップ日 | 2026-03-06 |
| PostgreSQL バージョン | 17.9 (Homebrew) |
| レプリケーションユーザー | replicator |
| pg_hba.conf 許可範囲 | 192.168.114.0/24 |
| wal_keep_size | 256MB |
| wal_level | replica |
| max_wal_senders | 10 |
