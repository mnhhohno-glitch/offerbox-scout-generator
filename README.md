# OfferBox スカウト文生成ツール

OfferBoxからコピーした学生プロフィールを貼り付けると、スカウト文を自動生成するNext.jsアプリケーションです。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **AI**: Google Gemini API (`gemini-2.0-flash`)
- **データ保存**: 
  - 本番: localStorage（クライアント側、最大100件）
  - staging: PostgreSQL（Railway）+ localStorage
- **ORM**: Prisma 5
- **ホスティング**: Railway

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | はい | Google Gemini APIキー |
| `NEXT_PUBLIC_APP_ENV` | いいえ | `staging` に設定するとSTAGINGバナーを表示 |
| `DATABASE_URL` | staging必須 | PostgreSQL接続文字列（staging環境のみ） |

## ローカル開発

```bash
npm install
npm run dev
```

`.env.local` ファイルを作成：

```
GEMINI_API_KEY=your-gemini-api-key
```

ブラウザで http://localhost:3000 を開いてください。

---

## Railwayでstaging環境を作成する手順（DB付き）

> **重要**: staging環境では必ず**固定ドメイン**を設定してください。
> ドメインが変わるとlocalStorageのオリジンが変わり、履歴データが「消えた」状態になります。

### 推奨構成：本番とは別のRailway Projectを作成

本番Projectとstaging Projectを分離することで、設定ミス（環境変数・ドメイン・ログの混在）を防げます。

---

### 手順1: 新しいProjectを作成

1. [Railway](https://railway.app) にログイン
2. ダッシュボード右上の「**New Project**」をクリック
3. 「**Deploy from GitHub repo**」を選択
4. 本番と同じGitHubリポジトリ（`offerbox-scout-generator`）を選択
5. Project名を入力（例: `offerbox-scout-staging`）

---

### 手順2: デプロイ対象ブランチを`staging`に変更

1. 作成されたServiceをクリック
2. 「**Settings**」タブを開く
3. 「**Source**」セクションで「**Branch**」を `staging` に変更
4. 「**Deploy**」ボタンで再デプロイ

---

### 手順3: PostgreSQLを追加

1. Project画面で「**+ New**」→「**Database**」→「**PostgreSQL**」をクリック
2. PostgreSQLサービスが追加される
3. PostgreSQLサービスをクリック →「**Variables**」タブ →「**DATABASE_URL**」をコピー

---

### 手順4: 環境変数を設定

1. アプリのServiceに戻り「**Variables**」タブを開く
2. 以下を追加：

| 変数名 | 値 |
|--------|-----|
| `GEMINI_API_KEY` | 本番と同じAPIキー（または別のキー） |
| `NEXT_PUBLIC_APP_ENV` | `staging` |
| `DATABASE_URL` | PostgreSQLからコピーした接続文字列 |

3. 追加後、自動で再デプロイが開始されます

---

### 手順5: DBマイグレーションを実行

初回のみ、DBテーブルを作成する必要があります。

**方法1: Railway Shell（推奨）**

1. アプリのServiceをクリック →「**Settings**」→「**Shell**」
2. 以下を実行：

```bash
npx prisma migrate deploy
```

**方法2: ローカルから実行**

```bash
# .envにstaging用のDATABASE_URLを設定
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

### 手順6: 固定ドメインを設定（最重要）

1. 「**Settings**」タブ →「**Networking**」セクション
2. 「**Generate Domain**」をクリック
3. 自動生成されたドメイン（例: `offerbox-scout-staging-xxxx.up.railway.app`）をメモ

> **注意**: このドメインは変更しないでください。変更するとlocalStorageのデータにアクセスできなくなります。

---

### 手順7: 動作確認

1. 生成されたURLにアクセス
2. ページ上部に黄色い「**STAGING 環境 - 本番ではありません**」バナーが表示されることを確認
3. 「配信履歴」「集計」リンクが表示されることを確認
4. スカウト文を生成してコピー → DBに保存されることを確認
5. 「配信履歴」ページで一覧表示・ステータス変更が動作することを確認

---

## staging専用機能

### 配信履歴（/deliveries）

- 50件/ページのページング
- 検索フィルタ（配信日、時間帯、テンプレ種別、学生ID、ログイン日時、ステータス）
- ステータス管理（未処理/承認/保留/取消）
- 最終文コピー

### 配信集計（/analytics）

- 期間指定（必須）で配信日×時間帯×テンプレ種別のカウント
- サマリー表示（合計、Aパターン、Bパターン）

### 管理用インポート

- ローカルStorage履歴をDBに一括投入
- 重複チェック（sent_at + メッセージハッシュ）
- stagingでのみ有効

---

## 履歴のバックアップと復旧

### なぜバックアップが必要か

履歴データ（Gemini生成結果を含む）はブラウザのlocalStorageに保存されています。以下の場合にデータが消失します：

- ブラウザのキャッシュ/データをクリアした
- 別のブラウザやデバイスを使用した
- **ドメイン（URL）が変わった**（localStorageはオリジン単位で分離される）

### バックアップ手順

1. 画面下部の「**履歴を書き出し（JSON）**」ボタンをクリック
2. `offerbox-history-backup-YYYY-MM-DD.json` がダウンロードされる
3. 安全な場所に保管

### 復旧手順

1. 「**履歴を読み込み（JSON）**」ボタンをクリック
2. バックアップしたJSONファイルを選択
3. インポート件数と最終日時が表示される → 確認
4. 「**インポート実行**」をクリック

> **注意**: 履歴は最大100件まで保持されます。

---

## 本番環境（Railway）

| 項目 | 値 |
|------|-----|
| ブランチ | `master` |
| 環境変数 | `GEMINI_API_KEY` のみ |
| STAGINGバナー | 表示されない |
| DB | なし（localStorageのみ） |

`master`ブランチへのプッシュで自動デプロイされます。

---

## ブランチ運用

| ブランチ | 用途 | デプロイ先 |
|----------|------|-----------|
| `master` | 本番 | Railway本番Project |
| `staging` | ステージング | Railway staging Project |

### stagingの変更を本番に反映する

```bash
git checkout master
git merge staging
git push origin master
```

---

## 機能概要

- **A/B判定**: 自己PR文字数200文字以上でAパターン、未満でBパターン
- **Aパターン**: Geminiでタイトルと冒頭文を生成
- **Bパターン**: 学部名から1文のみ生成し、固定テンプレートに挿入
- **スマホ/PC切り替え**: 生成文のプレビューをスマホ幅・PC幅で確認可能
- **履歴管理**: 最大100件の送信履歴を保存、export/import対応
- **STAGINGバナー**: `NEXT_PUBLIC_APP_ENV=staging` で表示
- **[staging] DB永続化**: PostgreSQLで配信レコード全件保持
- **[staging] 配信履歴一覧**: 50件ページング、検索、ステータス管理
- **[staging] 配信集計**: 期間×時間帯×テンプレ別カウント
