"use client";

import { useState } from "react";

// テンプレートA（自己PR 200文字以上）
const TEMPLATE_A = `【人の強みを引き出せるあなたへ】
初めまして。
スタートライン新卒採用責任者の船戸です。

プロフィールを拝見し、
{opening_message}

＼当社を一言で言うと…／
人と企業をつなぐ
HRソリューション企業です。
（採用～定着～活躍までを支援）

この仕事の面白さは、
人の強みを見つけて、
活躍の場をつくれること。

---------------------------
✔成長をサポートしたい
✔ありがとうがやりがいに
✔誰かの可能性を広げたい
---------------------------

1つでも当てはまったら
当社の仕事、
向いているかもしれません！

是非、カジュアル面談で
ざっくばらんに
お話できれば嬉しいです！

承諾＝応募ではありませんので
就活相談だけでも大丈夫です。
※希望者には、
会社説明会（WEB）のご案内も◎

＼働きやすさも整っています／
・年休120日以上/残業少なめ
・手厚い研修制度が自慢◎
・ジョブローテーション制度あり
（本社勤務など実績多数あり）

お話できるのを
楽しみにしています！

株式会社スタートライン
新卒採用責任者　船戸`;

// テンプレートB（自己PR 200文字未満）
const TEMPLATE_B = `【就活相談OK｜カジュアル面談】
初めまして。
スタートライン新卒採用責任者の船戸です。

プロフィールを拝見し、
{opening_message}

就活のこの時期、
こんな気持ちになること
ありませんか？

---------------------------
・何が向いているのか分からない
・業界が絞れず、情報収集で疲れる
・納得感をもって就活を進めたい
---------------------------

今回のオファーは
いきなり選考のご案内ではありません。
まずは【20分のカジュアル面談（WEB）】で、
気軽にお話できればと思っています。

＼当社を一言で言うと…／
人と企業をつなぐ
HRソリューション企業です。

この仕事の面白さは、
人の強みを見つけて
活躍の場をつくれること。

---------------------------
✔成長をサポートしたい
✔ありがとうがやりがいに
✔誰かの可能性を広げたい
---------------------------

1つでも当てはまったら
当社の仕事、
向いているかもしれません！

【承諾＝選考ではありません】
話を聞いてから決めたい、
就活相談だけしたい、でもOKです。
※希望者には、
会社説明会（WEB）のご案内も可能です◎

承諾いただけたら、
こちらから日程候補をお送りします。

＼働きやすさも整っています／
・年休120日以上/残業少なめ
・手厚い研修制度が自慢◎
・ジョブローテーション制度あり
（本社勤務など実績多数あり）

お話できるのを
楽しみにしています！

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

// スマホ向け改行整形（1行30文字前後）
function formatForMobile(text: string): string {
  // 既存の改行を削除して1行にする
  const singleLine = text.replace(/\n/g, "");
  const chars = Array.from(singleLine);
  const lines: string[] = [];
  let currentLine = "";
  let currentLength = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    currentLine += char;
    currentLength++;

    // 「、」「。」の直後で改行を優先
    if ((char === "、" || char === "。") && currentLength >= 15) {
      lines.push(currentLine);
      currentLine = "";
      currentLength = 0;
      continue;
    }

    // 30文字を超えたら強制改行
    if (currentLength >= 30) {
      // 次の「、」「。」を探す（5文字以内）
      let breakPoint = -1;
      for (let j = i + 1; j < chars.length && j <= i + 5; j++) {
        if (chars[j] === "、" || chars[j] === "。") {
          breakPoint = j;
          break;
        }
      }

      if (breakPoint !== -1) {
        // 近くに句読点があればそこまで含める
        for (let j = i + 1; j <= breakPoint; j++) {
          currentLine += chars[j];
        }
        i = breakPoint;
      }

      lines.push(currentLine);
      currentLine = "";
      currentLength = 0;
    }
  }

  // 残りを追加
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

// 生成文を作成（opening_messageを差し込み）
function generateMessage(pattern: "A" | "B", openingMessage: string): string {
  const template = pattern === "A" ? TEMPLATE_A : TEMPLATE_B;
  // opening_messageをスマホ向け改行整形
  const formattedMessage = formatForMobile(openingMessage);
  return template.replace("{opening_message}", formattedMessage);
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

      // テンプレートにopening_messageを差し込み
      const message = generateMessage(judgedPattern, openingMessage);
      setGeneratedMessage(message);
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
                <p className="text-sm text-gray-500">
                  {pattern === "A"
                    ? "テンプレートA（人の強みを引き出せるあなたへ）を使用"
                    : "テンプレートB（就活相談OK｜カジュアル面談）を使用"}
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
