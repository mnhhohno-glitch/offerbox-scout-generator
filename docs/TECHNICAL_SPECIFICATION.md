# OfferBox スカウト文生成ツール - 技術仕様書

**最終更新日**: 2026-02-02  
**バージョン**: 0.1.0

---

## 1. 技術スタック

### フロントエンド

| 項目 | 技術 | バージョン |
|------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.1.6 |
| UIライブラリ | React | 19.2.3 |
| 言語 | TypeScript | ^5 |
| CSSフレームワーク | Tailwind CSS | ^4 |
| フォント | Geist, Geist Mono (Google Fonts) | - |

### バックエンド

| 項目 | 技術 | 備考 |
|------|------|------|
| ランタイム | Next.js API Routes | サーバーレス関数 |
| 外部API | Google Gemini API | gemini-2.0-flash モデル |

### 状態管理

| 方式 | 用途 |
|------|------|
| React useState | UI状態（入力値、生成結果、ローディング等） |
| React useEffect | 初期化処理（履歴読み込み） |
| localStorage | 送信履歴の永続化（ブラウザ側） |

### 開発ツール

| 項目 | バージョン |
|------|-----------|
| ESLint | ^9 |
| eslint-config-next | 16.1.6 |
| @types/node | ^20 |
| @types/react | ^19 |
| @types/react-dom | ^19 |

---

## 2. ディレクトリ構成

```
offerbox-scout-generator/
├── .env.local                    # 環境変数（Git管理外）
├── .gitignore                    # Git除外設定
├── next.config.ts                # Next.js設定
├── package.json                  # 依存関係定義
├── tsconfig.json                 # TypeScript設定
├── docs/
│   ├── requirements.yaml         # 要件定義書
│   ├── tasks.md                  # タスク管理
│   └── TECHNICAL_SPECIFICATION.md # 本仕様書
└── src/
    └── app/
        ├── globals.css           # グローバルCSS
        ├── layout.tsx            # ルートレイアウト
        ├── page.tsx              # メイン画面（/）
        └── api/
            └── gemini/
                └── route.ts      # Gemini API Route
```

---

## 3. ルーティング構成

| URL | 対応コンポーネント | 種別 | 認証 |
|-----|-------------------|------|------|
| `/` | `src/app/page.tsx` | ページ | 不要 |
| `/api/gemini` | `src/app/api/gemini/route.ts` | API Route | 不要 |

### 認証・認可

本アプリケーションに認証機能は実装されていない。すべての機能は認証なしで利用可能。

---

## 4. 画面一覧と責務

### 4.1 メイン画面（`/`）

**ファイル**: `src/app/page.tsx`

#### 目的
OfferBoxからコピーした学生プロフィールを貼り付け、AIを活用してスカウト文を自動生成する。

#### 画面構成

| セクション | 責務 |
|-----------|------|
| タイトル | 「OfferBox スカウト文生成」を表示 |
| 貼り付け欄 | OfferBoxプロフィールの入力textarea |
| 文書作成ボタン | スカウト文生成処理を実行 |
| A/B判定結果 | パターン判定結果と文字数を表示 |
| プレビュー | 生成文のスマホ版/PC版プレビュー |
| コピーボタン | クリップボードへコピー＆履歴保存 |
| 送信履歴 | 過去の生成履歴一覧（折りたたみ） |

#### 使用API

| API | 用途 | 呼び出し条件 |
|-----|------|-------------|
| `POST /api/gemini` (mode: title) | 見出し生成 | Aパターン時のみ |
| `POST /api/gemini` (mode: opening) | 冒頭パート生成 | Aパターン時のみ |
| `POST /api/gemini` (mode: b_profile_line) | 学部紹介文生成 | Bパターン時のみ |

#### UI状態一覧

| state名 | 型 | 初期値 | 用途 |
|---------|---|--------|------|
| pasteText | string | "" | 貼り付けテキスト |
| pattern | "A" \| "B" \| null | null | A/B判定結果 |
| generatedMessage | string | "" | 生成されたスカウト文 |
| prCharCount | number \| null | null | 自己PR候補の文字数 |
| openingMessageCharCount | number \| null | null | opening_messageの文字数 |
| extractedFaculty | string \| null | null | 抽出された学部名 |
| copyStatus | string \| null | null | コピー状態メッセージ |
| loading | boolean | false | 生成中フラグ |
| error | string \| null | null | エラーメッセージ |
| selectedPreview | "mobile" \| "pc" | "mobile" | プレビュータブ選択 |
| history | HistoryRecord[] | [] | 送信履歴 |
| showHistory | boolean | false | 履歴表示フラグ |

#### バリデーション

| 項目 | ルール | エラー時の挙動 |
|------|--------|---------------|
| pasteText | 空文字チェック | ボタン非活性化 |
| API応答 | title/opening_messageの存在チェック | エラーメッセージ表示 |

---

## 5. API一覧

### 5.1 `POST /api/gemini`

**ファイル**: `src/app/api/gemini/route.ts`

#### 概要
Google Gemini APIを呼び出し、スカウト文の各パーツを生成する。

#### リクエスト形式

```typescript
// Content-Type: application/json

// mode: "title" の場合
{
  mode: "title",
  pasteText: string  // 貼り付けテキスト全文
}

// mode: "opening" の場合
{
  mode: "opening",
  pasteText: string  // 貼り付けテキスト全文
}

// mode: "b_profile_line" の場合
{
  mode: "b_profile_line",
  facultyName: string  // 学部名
}
```

#### レスポンス形式

```typescript
// mode: "title" の場合
{
  title: string  // 最大20文字の見出し
}

// mode: "opening" の場合
{
  opening_message: string  // 最大300文字の冒頭パート
}

// mode: "b_profile_line" の場合
{
  profile_line: string  // 学部紹介の1文
}
```

#### HTTPステータスコード

| コード | 条件 |
|--------|------|
| 200 | 成功 |
| 400 | リクエストバリデーションエラー（mode不正、必須パラメータ不足） |
| 500 | サーバーエラー（APIキー未設定、Gemini API応答エラー） |

#### エラーレスポンス形式

```typescript
{
  error: string  // エラーメッセージ
}
```

#### バリデーションルール

| パラメータ | 必須条件 | 型チェック |
|-----------|---------|-----------|
| mode | 常に必須 | "title" \| "opening" \| "b_profile_line" |
| pasteText | mode="title"/"opening"時必須 | string |
| facultyName | mode="b_profile_line"時必須 | string |

---

## 6. データ構造

### 6.1 型定義

#### HistoryRecord（送信履歴）

```typescript
interface HistoryRecord {
  id: string;           // crypto.randomUUID()で生成
  timestamp: string;    // 日本語形式の日時文字列
  pattern: "A" | "B";   // A/B判定結果
  pasteText: string;    // 入力テキスト
  generatedMessage: string;  // 生成されたスカウト文
  prCharCount: number;  // 自己PR候補の文字数
  facultyName?: string; // 学部名（Bパターンのみ）
}
```

### 6.2 永続化

| データ | 保存先 | キー名 | 保持件数 |
|--------|--------|--------|---------|
| 送信履歴 | localStorage | `offerbox_scout_history` | 最大100件 |

### 6.3 DBスキーマ

本アプリケーションにデータベースは存在しない。すべてのデータはクライアントサイドのlocalStorageに保存される。

---

## 7. 認証・認可方式

本アプリケーションに認証・認可機能は実装されていない。

---

## 8. 環境変数一覧

| 変数名 | 用途 | 必須 | 設定場所 |
|--------|------|------|---------|
| GEMINI_API_KEY | Google Gemini API認証キー | 必須 | `.env.local` |

### 設定例

```env
GEMINI_API_KEY=AIzaSy...（実際のAPIキー）
```

### 注意事項
- `.env.local`は`.gitignore`に含まれており、Gitにコミットされない
- 本番環境（Railway）では環境変数として別途設定が必要

---

## 9. 外部サービス連携

### 9.1 Google Gemini API

| 項目 | 値 |
|------|-----|
| エンドポイント | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` |
| 認証方式 | APIキー（URLパラメータ） |
| モデル | gemini-2.0-flash |

#### リクエスト設定

```typescript
{
  system_instruction: { parts: [{ text: string }] },
  contents: [{ parts: [{ text: string }] }],
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 512,
    responseMimeType: "application/json",
    responseSchema: object
  }
}
```

### 9.2 ホスティング

| 項目 | 値 |
|------|-----|
| プラットフォーム | Railway |
| デプロイ方式 | GitHub連携による自動デプロイ |
| リポジトリ | https://github.com/mnhhohno-glitch/offerbox-scout-generator |

---

## 10. 想定ユースケース

### UC-1: Aパターンスカウト文生成

**前提条件**: 自己PR候補が200文字以上のプロフィール

1. ユーザーがOfferBoxから学生プロフィールをコピー
2. 貼り付け欄にペースト
3. Enterキーまたは「文書作成」ボタンをクリック
4. システムが自己PRセクションを抽出（200文字以上でAパターン判定）
5. Gemini APIで見出し（title）を生成
6. Gemini APIで冒頭パート（opening_message）を生成
7. 見出し＋冒頭パート＋固定文を結合してプレビュー表示
8. ユーザーがスマホ版/PC版タブで確認
9. 「コピー」ボタンでクリップボードにコピー
10. 履歴に保存され、入力欄がクリアされて新規状態に

### UC-2: Bパターンスカウト文生成

**前提条件**: 自己PR候補が200文字未満のプロフィール

1. ユーザーがプロフィールを貼り付け
2. 文書作成を実行
3. システムが200文字未満でBパターン判定
4. 学部名を抽出
5. Gemini APIで学部に基づく1文を生成
6. Bテンプレートの`{{B_PROFILE_LINE}}`を置換
7. プレビュー表示
8. コピー＆履歴保存

### UC-3: 送信履歴の確認

1. 画面下部の「送信履歴」をクリック
2. 過去の生成履歴一覧が表示
3. 各履歴のパターン（A/B）、日時、文字数を確認可能

---

## 11. 制約事項・既知の課題

### 11.1 制約事項

| 項目 | 制約内容 |
|------|---------|
| 履歴保存 | ブラウザのlocalStorageに依存。ブラウザ/端末ごとに独立 |
| 履歴件数 | 最大100件まで保持 |
| API呼び出し | Gemini APIの利用制限に依存 |
| title文字数 | 20文字に強制切り詰め |
| opening_message文字数 | 300文字に強制切り詰め |

### 11.2 ビジネスロジック制約

| ルール | 閾値 |
|--------|------|
| A/B判定 | 自己PR候補200文字以上→A、未満→B |
| opening_message目標文字数 | 100〜150文字 |
| opening_message文数 | 3〜4文程度 |

### 11.3 禁止ルール（Gemini生成）

- 個人特定情報の出力禁止
- 事実不明の創作禁止
- 誇張表現禁止
- 装飾記号（「」、**）禁止
- 半角スペース禁止
- 「〇〇さん」等の呼びかけ禁止
- 断定表現禁止（「確信しています」「必ず」等）
- 過度な称賛禁止（「素晴らしい」「感銘」等）

### 11.4 既知の課題

| 課題 | 影響 | 備考 |
|------|------|------|
| 履歴のサーバー同期なし | 複数端末間で履歴共有不可 | 将来的にDB連携で解決可能 |
| 認証機能なし | 誰でもアクセス可能 | 内部ツールとして運用前提 |
| エラーリトライなし | API失敗時は手動再実行 | - |

---

## 12. 主要関数一覧

### 12.1 フロントエンド（`page.tsx`）

| 関数名 | 責務 |
|--------|------|
| `buildGreetingA(title)` | Aパターン用あいさつ文を生成 |
| `extractPrCandidate(text)` | 自己PR候補セクションを抽出 |
| `judgePattern(prCandidate)` | A/Bパターンを判定（200文字閾値） |
| `removeAsciiSpaces(text)` | 半角スペースを除去 |
| `extractFacultyName(pasteText)` | 学部学科名を抽出 |
| `removeNameCalling(text)` | 「〇〇さん」表現を除去 |
| `normalizeOpeningByPeriod(text)` | 句点「。」で改行を正規化 |
| `formatOpeningMessage(rawText)` | opening_messageを整形 |
| `formatForPC(text)` | PC版プレビュー用に整形 |
| `handleGenerate()` | スカウト文生成処理 |
| `handleCopy()` | クリップボードコピー＆履歴保存 |
| `clearAllState()` | 全状態をクリア |
| `saveHistory(newHistory)` | localStorageに履歴保存 |
| `addToHistory(record)` | 履歴に新規レコード追加 |

### 12.2 バックエンド（`route.ts`）

| 関数名 | 責務 |
|--------|------|
| `extractTitle(text)` | Gemini応答からtitleを抽出 |
| `extractOpeningMessage(text)` | Gemini応答からopening_messageを抽出 |
| `extractProfileLine(text)` | Gemini応答からprofile_lineを抽出 |
| `POST(request)` | APIエンドポイントハンドラー |

---

## 13. 定数一覧

### 13.1 テンプレート定数

| 定数名 | 用途 | 行数 |
|--------|------|------|
| `B_TEMPLATE_TEXT` | Bパターン用スカウト文テンプレート | 約60行 |
| `FIXED_TEXT` | Aパターン用会社紹介固定文 | 約37行 |
| `PR_HEADINGS` | 自己PR見出し候補配列 | 9項目 |

### 13.2 設定定数

| 定数名 | 値 | 用途 |
|--------|-----|------|
| `HISTORY_STORAGE_KEY` | `"offerbox_scout_history"` | localStorage用キー |
| `GEMINI_API_URL` | Gemini APIエンドポイント | API呼び出し先 |

---

## 14. 改修時の影響範囲ガイド

### テンプレート文言変更

| 変更対象 | 影響ファイル |
|---------|-------------|
| Aパターン固定文 | `page.tsx` の `FIXED_TEXT` |
| Bパターンテンプレート | `page.tsx` の `B_TEMPLATE_TEXT` |
| 見出し生成ルール | `route.ts` の `TITLE_INSTRUCTION_TEMPLATE` |
| 冒頭パート生成ルール | `route.ts` の `OPENING_INSTRUCTION_TEMPLATE` |

### A/B判定ロジック変更

| 変更対象 | 影響ファイル |
|---------|-------------|
| 閾値変更 | `page.tsx` の `judgePattern()` |
| 抽出ロジック変更 | `page.tsx` の `extractPrCandidate()` |

### UI変更

| 変更対象 | 影響ファイル |
|---------|-------------|
| レイアウト | `page.tsx` のJSX部分 |
| スタイル | `page.tsx` のTailwindクラス、`globals.css` |
| フォント | `layout.tsx` |

### API変更

| 変更対象 | 影響ファイル |
|---------|-------------|
| 新規mode追加 | `route.ts` のPOSTハンドラー |
| Geminiプロンプト変更 | `route.ts` の各INSTRUCTION定数 |
