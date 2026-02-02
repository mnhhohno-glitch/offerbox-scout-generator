"use client";

import { useState } from "react";

// Aパターン用あいさつ文を生成（titleはGemini生成）
function buildGreetingA(title: string): string {
  return `【${title}】

初めまして。
スタートライン新卒採用責任者の船戸です。`;
}

// Bパターン用テンプレート（{{B_PROFILE_LINE}}を1文だけGemini生成で差し替え）
const B_TEMPLATE_TEXT = `◆就活相談OK｜カジュアル面談

はじめまして。
株式会社スタートライン 新卒採用責任者の船戸です。

{{B_PROFILE_LINE}}
まずは選考ではなく、情報交換の場として気軽にお話できれば嬉しいです。

就活のこの時期こんな気持ちになることはありませんか？

---------------------------
・何が向いているのか分からない
・業界が絞れず、情報収集で疲れてしまう
・納得感をもって就活を進めたい
---------------------------

もし少しでも当てはまるようでしたら、
まずは【15分のカジュアル面談（WEB）】で、
就活相談のように気軽にお話できれば嬉しいです。

---

◆＼当社の事業は一言で言うと…／
「人と企業をつなぐHRソリューション企業」です。
（架け橋となり、採用～定着～活躍までを支援しています）

この仕事の面白さは、
一人ひとりの強みや個性を見つけ、
その人らしく活躍できる場を一緒につくっていけることです。

◆特に、こんな想いを大切にしています
---------------------------
・成長をサポートしたい
・「ありがとう」がやりがいになる
・誰かの可能性を広げたい
---------------------------

1つでも「自分も近いかも」と感じた方は、
当社の仕事を楽しめる可能性があると思います。

ぜひカジュアル面談で、
仕事内容や働き方も含めてざっくばらんにお話させてください！

※承諾＝応募ではありません
※就活相談だけでも大歓迎です
※ご希望の方には会社説明会（WEB）もご案内します

---

◆＼働きやすさも整っています／
---------------------------
・土日祝休み／年休120日以上
・残業20時間以下／WLB◎
・ジョブローテーション制度あり
　※数年で本社勤務などの実績もあります
---------------------------

お話できるのを楽しみにしています！

株式会社スタートライン
新卒採用責任者　船戸`;

// Aパターン用固定文（改行・記号・全角半角は1文字も変更しない）
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

  // 見出し行のインデックスを全て取得
  const headingIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasHeading = PR_HEADINGS.some((h) => line.includes(h));
    if (hasHeading) {
      headingIndices.push(i);
    }
  }

  // 自己PR/PR/アピール/強み などの見出しを優先的に探す
  const priorityHeadings = ["自己PR", "PR", "アピール", "強み"];
  
  for (const priorityHeading of priorityHeadings) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(priorityHeading)) {
        // この見出しの次の行から、次の見出しまたは末尾までを取得
        const prLines: string[] = [];
        let emptyLineCount = 0;
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          const nextLineTrimmed = nextLine.trim();
          
          // 次の見出しに到達したら終了
          const isNextHeading = PR_HEADINGS.some((h) => nextLine.includes(h)) ||
                                nextLine.match(/^[■◆●▼【]/) ||
                                nextLine.match(/^[A-Za-z0-9]{2,}[:：]/) ||
                                nextLine.match(/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}[:：]/);
          
          if (isNextHeading && j > i + 1) {
            break;
          }
          
          // 連続する空行が3つ以上あったらセクション終了とみなす
          if (nextLineTrimmed === "") {
            emptyLineCount++;
            if (emptyLineCount >= 3) {
              break;
            }
          } else {
            emptyLineCount = 0;
          }
          
          prLines.push(nextLine);
        }
        
        // 末尾の空行を除去
        while (prLines.length > 0 && prLines[prLines.length - 1].trim() === "") {
          prLines.pop();
        }
        
        if (prLines.length > 0) {
          const result = prLines.join("\n").trim();
          if (result.length > 0) {
            return result;
          }
        }
      }
    }
  }

  // 見出しが見つからない場合は、全テキストから最長の段落を返す
  // 空行区切りではなく、連続する2つ以上の空行で区切る
  const sections = text.split(/\n{3,}/).filter((p) => p.trim() !== "");
  if (sections.length === 0) {
    // それでもなければ全テキストを返す
    return text.trim();
  }

  let longestSection = sections[0];
  for (const s of sections) {
    if (Array.from(s.trim()).length > Array.from(longestSection.trim()).length) {
      longestSection = s;
    }
  }
  return longestSection.trim();
}

// A/B判定
function judgePattern(prCandidate: string): "A" | "B" {
  const charCount = Array.from(prCandidate).length;
  return charCount >= 200 ? "A" : "B";
}

// 半角スペースを除去
function removeAsciiSpaces(text: string): string {
  return text.replace(/ /g, "");
}

// 貼り付けテキストから学部名を抽出
function extractFacultyName(pasteText: string): string {
  if (!pasteText) return "";
  // よくある表記例: "経営経済学部  経済学科" / "経営経済学部 経済学科"
  const m = pasteText.match(/([^\n\r]{2,30}学部)/);
  return m?.[1]?.trim() ?? "";
}

// 「〇〇さん」などの呼びかけ表現を除去
function removeNameCalling(text: string): string {
  return text
    .replace(/[〇○◯]+さんの、/g, "")
    .replace(/[〇○◯]+さん、/g, "")
    .replace(/[〇○◯]+さん/g, "");
}

// opening_messageを「。」単位で改行に正規化（最終整形）
function normalizeOpeningByPeriod(text: string): string {
  const END = "ぜひ一度お話したくご連絡しました！";
  if (!text) return END;

  // 半角スペース除去（ユーザーの手間削減）
  let t = text.replace(/ /g, "").replace(/\r\n/g, "\n").trim();

  // 既存の改行は一旦潰す（後で「。」で作り直す）
  t = t.replace(/\n+/g, "");
  t = t.replace(/\s+/g, "");

  // ENDを必ず含め、重複は削る
  if (t.includes(END)) {
    const idx = t.lastIndexOf(END);
    t = t.slice(0, idx + END.length);
  } else {
    if (!t.endsWith("。") && !t.endsWith("！") && !t.endsWith("!")) t += "。";
    t += END;
  }

  // 「。」で改行を作る（句点が消えるので戻す）
  const chunks = t.split("。").filter(Boolean);
  const lines = chunks.map((c, i) => {
    const isLast = i === chunks.length - 1;
    if (isLast) return c;
    return c + "。";
  });

  let out = lines.join("\n");

  // 最終行がENDで終わることを再保証
  if (!out.endsWith(END)) out += "\n" + END;

  return out;
}

// opening_messageを整形（句点で改行）
function formatOpeningMessage(rawText: string): string {
  const END = "ぜひ一度お話したくご連絡しました！";
  if (!rawText) return END;

  // 1) 基本的なクリーンアップ
  let t = rawText.replace(/\r\n/g, "\n");
  t = t.replace(/ /g, ""); // 半角スペース除去
  t = removeNameCalling(t); // 「〇〇さん」を除去
  t = t.replace(/　+/g, ""); // 全角スペース除去
  t = t.replace(/\n+/g, ""); // 一度改行を除去して再構成

  // 2) 末尾の文を保証
  if (t.includes(END)) {
    const idx = t.lastIndexOf(END);
    t = t.slice(0, idx + END.length);
  } else {
    if (!t.endsWith("。") && !t.endsWith("！") && !t.endsWith("!")) {
      t += "。";
    }
    t += END;
  }

  // 3) 句点（。）で改行する
  const lines: string[] = [];
  let current = "";
  
  for (const ch of Array.from(t)) {
    current += ch;
    if (ch === "。") {
      lines.push(current);
      current = "";
    }
  }
  
  // 残り（！で終わる最終行など）
  if (current) {
    lines.push(current);
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

      let greeting: string;
      let formattedOpening: string;

      if (judgedPattern === "A") {
        // Aパターン: Geminiでtitleとopening_messageを生成
        const titleResponse = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "title", pasteText }),
        });

        if (!titleResponse.ok) {
          const errorData = await titleResponse.json();
          throw new Error(errorData.error || "title生成に失敗しました");
        }

        const titleData = await titleResponse.json();
        const title = removeAsciiSpaces(titleData.title || "");

        if (!title) {
          throw new Error("titleが取得できませんでした");
        }

        greeting = buildGreetingA(title);

        // opening_message生成（Aパターンのみ）
        const openingResponse = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "opening", pasteText }),
        });

        if (!openingResponse.ok) {
          const errorData = await openingResponse.json();
          throw new Error(errorData.error || "opening_message生成に失敗しました");
        }

        const openingData = await openingResponse.json();
        const openingMessageRaw = openingData.opening_message || "";

        if (!openingMessageRaw) {
          throw new Error("opening_messageが取得できませんでした");
        }

        // 整形を適用
        formattedOpening = formatOpeningMessage(openingMessageRaw);
        // 最終的に「。」単位で改行を正規化
        formattedOpening = normalizeOpeningByPeriod(formattedOpening);
        setOpeningMessageCharCount(
          Array.from(formattedOpening.replace(/\n/g, "")).length
        );

        // greeting + opening_message + 固定文 を結合
        const finalMessage = `${greeting}\n\n${formattedOpening}\n\n${FIXED_TEXT}`;
        setGeneratedMessage(finalMessage);
      } else {
        // Bパターン: 学部名から1文だけGemini生成し、テンプレートに差し込む
        const facultyName = extractFacultyName(pasteText);
        
        let profileLine = "プロフィールを拝見し、ご連絡しました。"; // デフォルト
        
        if (facultyName) {
          // 学部名があればGeminiで1文生成
          const res = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "b_profile_line", facultyName }),
          });
          
          if (res.ok) {
            const data = await res.json();
            const generatedLine = (data.profile_line ?? "").replace(/ /g, "").trim();
            if (generatedLine) {
              profileLine = generatedLine;
            }
          }
        }
        
        // テンプレートの{{B_PROFILE_LINE}}を差し替え
        const finalB = B_TEMPLATE_TEXT.replace("{{B_PROFILE_LINE}}", profileLine);
        setOpeningMessageCharCount(null);
        setGeneratedMessage(finalB);
      }
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && pasteText.trim() && !loading) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="ここにプロフィール全文を貼り付けてください...（Enterで実行）"
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
                {pattern === "A" && openingMessageCharCount !== null && (
                  <p className="text-sm text-gray-500">
                    生成されたopening_message: {openingMessageCharCount}文字
                  </p>
                )}
                {pattern === "B" && (
                  <p className="text-sm text-orange-600">
                    AI生成なし（固定文）
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
