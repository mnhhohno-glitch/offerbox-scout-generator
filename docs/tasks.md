# OfferBox Scout Generator - Tasks

## Phase 0: Setup
- [ ] プロジェクト雛形作成（Next.js）
- [ ] ローカル起動できること確認

## Phase 1: Core UI（Geminiなし）
- [ ] 新規レコード画面：貼り付け欄（paste_text）
- [ ] 「文書作成」ボタン
- [ ] 生成文プレビュー表示欄

## Phase 2: A/B判定（アプリ側）
- [ ] 自己PR候補抽出（見出し優先・無ければ最長段落）
- [ ] 200文字以上→A / 未満→B 判定
- [ ] 判定結果を画面に表示（任意）

## Phase 3: Gemini要約（summaryのみ）
- [ ] Gemini API呼び出し（APIキーは環境変数）
- [ ] JSONで { summary } を受け取る
- [ ] summaryの文字数チェック（>100は再生成 or カット）

## Phase 4: テンプレ差し込み＆整形
- [ ] A/Bテンプレ固定で保持
- [ ] {summary}差し込み
- [ ] 改行整形（1行30文字以内なるべく）

## Phase 5: コピー＆履歴
- [ ] コピーボタン：クリップボードへコピー
- [ ] コピー押下で履歴レコード追加（コピー＝送信扱い）
- [ ] raw_paste_textを保存

## Phase 6: 履歴検索＆CSV
- [ ] 履歴一覧画面（表）
- [ ] 期間検索（from/toカレンダー）
- [ ] フリーワード検索（併用）
- [ ] CSV出力（表示中のみ）
