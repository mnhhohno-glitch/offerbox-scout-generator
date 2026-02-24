# OfferBox スカウト文生成ツール

OfferBoxからコピーした学生プロフィールを貼り付けると、スカウト文を自動生成するNext.jsアプリケーションです。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **AI**: Google Gemini API (`gemini-2.0-flash`)
- **データ保存**: localStorage（クライアント側、最大100件）
- **ホスティング**: Railway

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | はい | Google Gemini APIキー |
| `NEXT_PUBLIC_APP_ENV` | いいえ | `staging` に設定するとSTAGINGバナーを表示 |

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

## Railwayでstaging環境を作成する手順（固定ドメイン必須）

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

### 手順3: 環境変数を設定

1. 「**Variables**」タブを開く
2. 以下を追加：

| 変数名 | 値 |
|--------|-----|
| `GEMINI_API_KEY` | 本番と同じAPIキー（または別のキー） |
| `NEXT_PUBLIC_APP_ENV` | `staging` |

3. 追加後、自動で再デプロイが開始されます

---

### 手順4: 固定ドメインを設定（最重要）

1. 「**Settings**」タブ →「**Networking**」セクション
2. 「**Generate Domain**」をクリック
3. 自動生成されたドメイン（例: `offerbox-scout-staging-xxxx.up.railway.app`）をメモ

> **注意**: このドメインは変更しないでください。変更するとlocalStorageのデータにアクセスできなくなります。

---

### 手順5: 動作確認

1. 生成されたURLにアクセス
2. ページ上部に黄色い「**STAGING 環境 - 本番ではありません**」バナーが表示されることを確認
3. 「履歴を書き出し（JSON）」「履歴を読み込み（JSON）」ボタンが表示されることを確認

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

**含まれるデータ:**
- 入力テキスト
- 生成されたスカウト文
- Gemini出力（title, opening_message, profile_line）
- 作成日時
- スキーマバージョン

### 復旧手順

1. 「**履歴を読み込み（JSON）**」ボタンをクリック
2. バックアップしたJSONファイルを選択
3. インポート件数と最終日時が表示される → 確認
4. 「**インポート実行**」をクリック
5. 既存の履歴とマージされ、重複はスキップされる

> **注意**: 履歴は最大100件まで保持されます。100件を超えた古いデータは自動的に削除されます（最新優先）。

---

## 本番環境（Railway）

| 項目 | 値 |
|------|-----|
| ブランチ | `master` |
| 環境変数 | `GEMINI_API_KEY` のみ |
| STAGINGバナー | 表示されない |

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
