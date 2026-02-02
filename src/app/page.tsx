"use client";

import { useState } from "react";

// 固定文（改行・記号・全角半角は1文字も変更しない）
const FIXED_TEXT = `◆＼当社の事業は一言で言うと…／
「人と企業のつなぐHRソリューション企業」
（架け橋となり、採用～定着～活躍を支援）

この仕事の面白さは、人の強みを見つけ、
個性を生かした、活躍の場をつくれること。

◆こんな気持ちが大切です。
---------------------------
・成長をサポートしたい
・「ありがとう」がやりがい
・誰かの可能性を広げたい
---------------------------

1つでも当てはまったら
当社の仕事は向いています！

是非、カジュアル面談にて
ざっくばらんにお話できれば嬉しいです！

承諾＝応募ではありません
就活相談だけでも歓迎です。
※希望する方には会社説明会をご案内(WEB)


◆＼働きやすさも整っています／
---------------------------
・土日祝休み／年休120日以上
・残業20時間以下／ＷＬＢ◎
・ジョブローテーション制度有
※数年で本社勤務など実績多数あり
---------------------------

お話できるのを楽しみにしています！

株式会社スタートライン
新卒採用責任者　船戸`;

// 見出し候補
const PR_HEADINGS = [
  "自己PR",
  "PR",
  "アピール",
  "強み",
  "学生時代に力を入れたこと",
  "ガクチカ",
  "経験",
  "実績",
  "活動",
];

// 自己PR候補を抽出
function extractPrCandidate(text: string): string {
  const lines = text.split(/\r?\n/);

  // 見出し行を探す
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasHeading = PR_HEADINGS.some((h) => line.includes(h));

    if (hasHeading) {
      // 見出しが見つかったら次行から空行までを自己PR候補
      const prLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine === "") {
          break;
        }
        prLines.push(lines[j]);
      }
      if (prLines.length > 0) {
        return prLines.join("\n");
      }
    }
  }

  // 見出しが見つからない場合は、空行区切り段落のうち最長段落を返す
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim() !== "");
  if (paragraphs.length === 0) {
    return "";
  }

  let longestParagraph = paragraphs[0];
  for (const p of paragraphs) {
    if (Array.from(p).length > Array.from(longestParagraph).length) {
      longestParagraph = p;
    }
  }
  return longestParagraph;
}

// A/B判定
function judgePattern(prCandidate: string): "A" | "B" {
  const charCount = Array.from(prCandidate).length;
  return charCount >= 200 ? "A" : "B";
}

// opening_message専用の厳格整形（1行15〜20文字、最大5行）
// 固定文には絶対に適用しない
function formatOpeningMessageStrict(text: string): string {
  const raw = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";

  // 既存改行は一旦スペースにして整形
  const normalized = raw.replace(/\n+/g, " ");

  const MIN = 15;
  const MAX = 20;
  const MAX_LINES = 5;

  const chars = Array.from(normalized);
  const lines: string[] = [];
  let current: string[] = [];

  const pushLine = () => {
    const line = current.join("").trim();
    if (line) lines.push(line);
    current = [];
  };

  const breakChars = new Set(["、", "。"]);

  for (let i = 0; i < chars.length; i++) {
    current.push(chars[i]);
    const len = current.length;

    // 5行目を確保するため、4行作ったら残りは最後に寄せる
    if (lines.length >= MAX_LINES - 1) {
      continue;
    }

    // 20文字に達したら改行
    if (len >= MAX) {
      pushLine();
      continue;
    }

    // 15文字以上で句読点なら改行優先
    if (len >= MIN && breakChars.has(chars[i])) {
      pushLine();
      continue;
    }
  }

  pushLine();

  // 5行を超えたら最後にまとめる
  if (lines.length > MAX_LINES) {
    const head = lines.slice(0, MAX_LINES - 1);
    const tail = lines.slice(MAX_LINES - 1).join("");
    lines.length = 0;
    lines.push(...head, tail);
  }

  return lines.join("\n");
}

export default function Home() {
  const [pasteText, setPasteText] = useState("");
  const [pattern, setPattern] = useState<"A" | "B" | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [prCharCount, setPrCharCount] = useState<number | null>(null);
  const [openingMessageCharCount, setOpeningMessageCharCount] = useState<
    number | null
  >(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!pasteText.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMessage("");
    setPattern(null);

    try {
      // 自己PR候補を抽出してA/B判定
      const prCandidate = extractPrCandidate(pasteText);
      const charCount = Array.from(prCandidate).length;
      setPrCharCount(charCount);

      const judgedPattern = judgePattern(prCandidate);
      setPattern(judgedPattern);

      // Gemini APIでopening_message生成
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pasteText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API呼び出しに失敗しました");
      }

      const data = await response.json();
      const openingMessage = data.opening_message;

      if (!openingMessage) {
        throw new Error("opening_messageが取得できませんでした");
      }

      setOpeningMessageCharCount(Array.from(openingMessage).length);

      // opening_messageのみ整形（固定文は触らない）
      const formattedOpening = formatOpeningMessageStrict(openingMessage);

      // opening_message + 空行 + 固定文 を結合
      const finalMessage = `${formattedOpening}\n\n${FIXED_TEXT}`;
      setGeneratedMessage(finalMessage);
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedMessage) return;

    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopyStatus("コピーしました");
      setTimeout(() => {
        setCopyStatus(null);
      }, 3000);
    } catch {
      setCopyStatus("コピーに失敗しました");
      setTimeout(() => {
        setCopyStatus(null);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          OfferBox スカウト文生成
        </h1>

        {/* 貼り付け欄 */}
        <div className="mb-6">
          <label
            htmlFor="paste-text"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            OfferBoxからコピーしたプロフィールを貼り付け
          </label>
          <textarea
            id="paste-text"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="ここにプロフィール全文を貼り付けてください..."
            className="h-64 w-full rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
        </div>

        {/* 文書作成ボタン */}
        <div className="mb-6">
          <button
            onClick={handleGenerate}
            disabled={!pasteText.trim() || loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "生成中…" : "文書作成"}
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* A/B判定結果 */}
        {pattern && (
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white ${
                  pattern === "A" ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {pattern}
              </span>
              <div>
                <p className="text-sm text-gray-600">
                  自己PR候補: {prCharCount}文字
                  {pattern === "A" ? "（200文字以上）" : "（200文字未満）"}
                </p>
                {openingMessageCharCount !== null && (
                  <p className="text-sm text-gray-500">
                    生成されたopening_message: {openingMessageCharCount}文字
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* プレビュー */}
        {generatedMessage && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                生成文プレビュー
              </h2>
              <div className="flex items-center gap-2">
                {copyStatus && (
                  <span className="text-sm text-green-600">{copyStatus}</span>
                )}
                <button
                  onClick={handleCopy}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-900"
                >
                  コピー
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                {generatedMessage}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
