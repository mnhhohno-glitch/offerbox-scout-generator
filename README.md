# OfferBox スカウト文生成ツール

OfferBoxからコピーした学生プロフィールを貼り付けると、スカウト文を自動生成するNext.jsアプリケーションです。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **AI**: Google Gemini API (`gemini-2.0-flash`)
- **データ保存**: localStorage（クライアント側）

## 環境変数

`.env.local` ファイルを作成し、以下を設定してください：

```
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_APP_ENV=production  # または staging
```

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | はい | Google Gemini APIキー |
| `NEXT_PUBLIC_APP_ENV` | いいえ | `staging` に設定するとSTAGINGバナーを表示 |

## ローカル開発

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

---

## ステージング環境（固定URL）を作る方法

> **注意**: VercelのPreviewデプロイはコミットごとにURLが変わるため、localStorageのデータが分断されます。固定URLのステージング環境を作ることを推奨します。

### 手順（超初心者向け）

#### 1. Vercelで新しいプロジェクトを作成

1. [Vercel](https://vercel.com) にログイン
2. 「New Project」をクリック
3. **同じGitHubリポジトリ**を選択（本番と同じリポジトリ）
4. プロジェクト名を入力（例: `offerbox-scout-staging`）

#### 2. デプロイブランチを設定

1. 作成したプロジェクトの「Settings」→「Git」を開く
2. 「Production Branch」を `staging` に変更
3. 「Save」をクリック

#### 3. 環境変数を設定

1. 「Settings」→「Environment Variables」を開く
2. 以下を追加：
   - `GEMINI_API_KEY`: 本番と同じAPIキー
   - `NEXT_PUBLIC_APP_ENV`: `staging`
3. 両方とも Environment は「Production, Preview, Development」すべてにチェック

#### 4. stagingブランチをプッシュ

```bash
git checkout staging
git push -u origin staging
```

#### 5. 確認方法

- ページ上部に黄色い「STAGING 環境 - 本番ではありません」バナーが表示される
- 履歴データはそのステージング環境内で保持される
- 「履歴を書き出し（JSON）」「履歴を読み込み（JSON）」ボタンが機能する

---

## 履歴のバックアップと復旧

### データが消えた場合に備えて

履歴データはブラウザのlocalStorageに保存されています。以下の場合にデータが消失する可能性があります：

- ブラウザのキャッシュ/データをクリアした
- 別のブラウザやデバイスを使用した
- Vercelの別のPreview URLにアクセスした（URLごとにlocalStorageは独立）

### バックアップ手順

1. 画面下部の「履歴を書き出し（JSON）」ボタンをクリック
2. `offerbox-history-backup-YYYY-MM-DD.json` がダウンロードされる
3. 安全な場所に保管

### 復旧手順

1. 「履歴を読み込み（JSON）」ボタンをクリック
2. バックアップしたJSONファイルを選択
3. インポート件数と最終日時が表示される
4. 「インポート実行」をクリック
5. 既存の履歴とマージされ、重複はスキップされる

> **注意**: 履歴は最大100件まで保持されます。100件を超えた古いデータは自動的に削除されます。

---

## Railwayへのデプロイ（本番）

現在の本番環境はRailwayでホストされています。

1. [Railway](https://railway.app) にログイン
2. GitHubリポジトリを連携
3. 環境変数 `GEMINI_API_KEY` を設定
4. `main` ブランチへのプッシュで自動デプロイ

---

## 機能概要

- **A/B判定**: 自己PR文字数200文字以上でAパターン、未満でBパターン
- **Aパターン**: Geminiでタイトルと冒頭文を生成
- **Bパターン**: 学部名から1文のみ生成し、固定テンプレートに挿入
- **スマホ/PC切り替え**: 生成文のプレビューをスマホ幅・PC幅で確認可能
- **履歴管理**: 最大100件の送信履歴を保存、export/import対応
