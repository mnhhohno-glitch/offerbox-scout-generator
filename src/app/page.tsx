"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  extractStudentId7,
  extractUniversityName,
  extractFacultyName as extractFacultyFromUtils,
  extractDepartmentName,
  extractPrefecture,
  extractGender,
  getGenderLabel,
} from "@/lib/extraction-utils";

// 環境変数からアプリ環境を取得
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "production";
const IS_STAGING = APP_ENV === "staging";

// 履歴スキーマバージョン（互換性管理用）
const HISTORY_SCHEMA_VERSION = 4;

// オファーステータスの型定義
type OfferStatus = "offered" | "applied" | "on_hold" | "declined";

// オファーステータスのオプション
const OFFER_STATUS_OPTIONS: { value: OfferStatus; label: string; color: string }[] = [
  { value: "offered", label: "オファー済", color: "bg-blue-500 text-white" },
  { value: "applied", label: "応募", color: "bg-green-500 text-white" },
  { value: "on_hold", label: "保留", color: "bg-yellow-500 text-white" },
  { value: "declined", label: "辞退", color: "bg-red-500 text-white" },
];

// 送信履歴の型定義（v4: オファーステータスを含む）
interface HistoryRecord {
  id: string;
  timestamp: string;
  createdAt: string; // ISO形式の日時（重複チェック用）
  pattern: "A" | "B";
  pasteText: string;
  generatedMessage: string;
  prCharCount: number;
  // Gemini出力結果
  geminiOutputs?: {
    title?: string;           // Aパターン用
    openingMessage?: string;  // Aパターン用
    profileLine?: string;     // Bパターン用
  };
  // 学生情報
  studentId7?: string;        // 7桁ID
  universityName?: string;    // 大学名
  facultyName?: string;       // 学部
  departmentName?: string;    // 学科
  prefecture?: string;        // 都道府県
  gender?: string;            // 性別
  // オファーステータス
  offerStatus?: OfferStatus;  // デフォルト: offered
}

// export用のデータ構造
interface HistoryExportData {
  schemaVersion: number;
  exportedAt: string;
  recordCount: number;
  records: HistoryRecord[];
}

// ローカルストレージのキー
const HISTORY_STORAGE_KEY = "offerbox_scout_history";

// 履歴の重複チェック用キー生成
function generateDedupeKey(record: HistoryRecord): string {
  const textHash = record.generatedMessage.slice(0, 100);
  return `${record.createdAt}-${textHash}`;
}

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

◆当社の事業は一言で言うと…
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

◆働きやすさも整っています
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
const FIXED_TEXT = `◆当社の事業は一言で言うと…
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


◆働きやすさも整っています
---------------------------
・土日祝休み／年休120日以上
・残業20時間以下／ＷＬＢ◎
・ジョブローテーション制度有
※数年で本社勤務など実績多数あり
---------------------------

お話できるのを楽しみにしています！

株式会社スタートライン
新卒採用責任者　船戸`;

// 自己PR候補を抽出
function extractPrCandidate(text: string): string {
  console.log("=== extractPrCandidate開始 ===");
  const lines = text.split(/\r?\n/);
  console.log("行数:", lines.length);

  // 自己PR/アピール/強み などの見出しを優先的に探す（PRは自己PRと重複するので除外）
  const priorityHeadings = ["自己PR", "アピール", "強み", "ガクチカ", "学生時代に力を入れたこと"];
  
  for (const priorityHeading of priorityHeadings) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(priorityHeading)) {
        console.log(`見出し「${priorityHeading}」を行${i}で発見:`, line);
        // この見出しの次の行から、次の見出しまたは末尾までを取得
        const prLines: string[] = [];
        let emptyLineCount = 0;
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          const nextLineTrimmed = nextLine.trim();
          
          // 次の見出しに到達したら終了（自己PR系以外の見出し）
          const isNextHeading = nextLine.match(/^[■◆●▼【]/) ||
                                nextLine.match(/^[A-Za-z0-9]{2,}[:：]/) ||
                                (nextLineTrimmed.length > 0 && nextLineTrimmed.length < 20 && 
                                 (nextLineTrimmed.includes("希望") || 
                                  nextLineTrimmed.includes("志望") ||
                                  nextLineTrimmed.includes("資格") ||
                                  nextLineTrimmed.includes("趣味") ||
                                  nextLineTrimmed.includes("特技")));
          
          if (isNextHeading && j > i + 1) {
            console.log(`次の見出しを行${j}で検出、終了:`, nextLine);
            break;
          }
          
          // 連続する空行が3つ以上あったらセクション終了とみなす
          if (nextLineTrimmed === "") {
            emptyLineCount++;
            if (emptyLineCount >= 3) {
              console.log(`連続空行3つで終了 (行${j})`);
              break;
            }
          } else {
            emptyLineCount = 0;
            prLines.push(nextLine);
          }
        }
        
        // 末尾の空行を除去
        while (prLines.length > 0 && prLines[prLines.length - 1].trim() === "") {
          prLines.pop();
        }
        
        if (prLines.length > 0) {
          const result = prLines.join("\n").trim();
          console.log("抽出結果:", result.length, "文字");
          if (result.length > 0) {
            return result;
          }
        }
      }
    }
  }

  console.log("見出しが見つからない、フォールバック処理");
  
  // 見出しが見つからない場合は、全テキストから最長の段落を返す
  const sections = text.split(/\n\n+/).filter((p) => p.trim() !== "");
  console.log("セクション数:", sections.length);
  
  if (sections.length === 0) {
    console.log("セクションなし、全テキストを返す");
    return text.trim();
  }

  let longestSection = sections[0];
  for (const s of sections) {
    if (Array.from(s.trim()).length > Array.from(longestSection.trim()).length) {
      longestSection = s;
    }
  }
  console.log("最長セクション:", longestSection.length, "文字");
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

// 貼り付けテキストから学部学科名を抽出
function extractFacultyName(pasteText: string): string {
  if (!pasteText) return "";
  
  // パターン1: 「◯◯学部」「◯◯学科」を探す
  // 学部名は通常2〜15文字程度（例：経済学部、経営経済学部、総合政策学部）
  const facultyMatch = pasteText.match(/([ぁ-んァ-ヶー一-龠]{2,15}学部)/);
  const departmentMatch = pasteText.match(/([ぁ-んァ-ヶー一-龠]{2,15}学科)/);
  
  let result = "";
  
  if (facultyMatch && facultyMatch[1]) {
    result = facultyMatch[1].trim();
  }
  
  if (departmentMatch && departmentMatch[1]) {
    if (result) {
      result += " " + departmentMatch[1].trim();
    } else {
      result = departmentMatch[1].trim();
    }
  }
  
  // パターン2: 学部が見つからない場合、「学部」を含む行全体を探す
  if (!result) {
    const lines = pasteText.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes("学部")) {
        // 行から学部名を抽出（空白区切りで学部を含む部分）
        const parts = line.split(/[\s　]+/);
        for (const part of parts) {
          if (part.includes("学部")) {
            result = part.trim();
            break;
          }
        }
        if (result) break;
      }
    }
  }
  
  return result;
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

// PC版プレビュー用に整形（改行を減らす）
function formatForPC(text: string): string {
  if (!text) return "";
  // 連続する改行を1つに整理
  const result = text.replace(/\n{3,}/g, "\n\n");
  return result;
}

export default function Home() {
  const [pasteText, setPasteText] = useState("");
  const [pattern, setPattern] = useState<"A" | "B" | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [prCharCount, setPrCharCount] = useState<number | null>(null);
  const [openingMessageCharCount, setOpeningMessageCharCount] = useState<
    number | null
  >(null);
  const [extractedFaculty, setExtractedFaculty] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<"mobile" | "pc">("mobile");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  
  // 履歴の選択状態と検索
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [searchIdQuery, setSearchIdQuery] = useState("");
  const [searchFreeQuery, setSearchFreeQuery] = useState("");
  
  const router = useRouter();
  
  // Gemini出力を一時保存（履歴保存時に使用）
  const [currentGeminiOutputs, setCurrentGeminiOutputs] = useState<{
    title?: string;
    openingMessage?: string;
    profileLine?: string;
  }>({});
  
  // Import用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    count: number;
    lastDate: string;
  } | null>(null);
  const [pendingImportData, setPendingImportData] = useState<HistoryExportData | null>(null);

  // ローカルストレージから履歴を読み込み
  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // v1からv2へのマイグレーション（createdAtがない場合は追加）
        const migrated = parsed.map((r: HistoryRecord) => ({
          ...r,
          createdAt: r.createdAt || new Date(r.timestamp).toISOString(),
        }));
        setHistory(migrated);
      } catch (e) {
        console.error("履歴の読み込みに失敗:", e);
      }
    }
  }, []);

  // 履歴をローカルストレージに保存
  const saveHistory = (newHistory: HistoryRecord[]) => {
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };

  // 履歴に追加（Gemini出力含む）
  const addToHistory = (record: Omit<HistoryRecord, "id" | "timestamp" | "createdAt">) => {
    const now = new Date();
    const newRecord: HistoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: now.toLocaleString("ja-JP"),
      createdAt: now.toISOString(),
    };
    const newHistory = [newRecord, ...history].slice(0, 100);
    saveHistory(newHistory);
    return newRecord;
  };

  // 履歴をJSON形式でエクスポート
  const handleExportHistory = () => {
    if (history.length === 0) {
      setImportStatus("エクスポートする履歴がありません");
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    const exportData: HistoryExportData = {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      recordCount: history.length,
      records: history,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offerbox-history-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportStatus(`${history.length}件の履歴をエクスポートしました`);
    setTimeout(() => setImportStatus(null), 3000);
  };

  // ファイル選択時の処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as HistoryExportData;
        
        // スキーマチェック
        if (!data.schemaVersion || !data.records || !Array.isArray(data.records)) {
          setImportStatus("エラー: 無効なファイル形式です");
          setTimeout(() => setImportStatus(null), 5000);
          return;
        }

        // 必須フィールドチェック
        const validRecords = data.records.filter(
          (r) => r.id && r.pattern && r.generatedMessage
        );

        if (validRecords.length === 0) {
          setImportStatus("エラー: 有効な履歴データがありません");
          setTimeout(() => setImportStatus(null), 5000);
          return;
        }

        // プレビュー表示
        const lastRecord = validRecords[0];
        setImportPreview({
          count: validRecords.length,
          lastDate: lastRecord.timestamp || lastRecord.createdAt || "不明",
        });
        setPendingImportData({ ...data, records: validRecords });
      } catch {
        setImportStatus("エラー: JSONの解析に失敗しました");
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // インポート確定
  const handleConfirmImport = () => {
    if (!pendingImportData) return;

    const importRecords = pendingImportData.records;
    
    // 既存履歴のキーセットを作成
    const existingKeys = new Set(history.map(generateDedupeKey));
    
    // 重複を除外してマージ
    const newRecords = importRecords.filter((r) => {
      // createdAtがない場合は追加
      if (!r.createdAt) {
        r.createdAt = r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString();
      }
      return !existingKeys.has(generateDedupeKey(r));
    });

    // マージして100件にトリム
    const merged = [...newRecords, ...history]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    saveHistory(merged);
    
    setImportStatus(`${newRecords.length}件を追加しました（重複${importRecords.length - newRecords.length}件スキップ）`);
    setImportPreview(null);
    setPendingImportData(null);
    setTimeout(() => setImportStatus(null), 5000);
  };

  // インポートキャンセル
  const handleCancelImport = () => {
    setImportPreview(null);
    setPendingImportData(null);
  };

  // 全入力・出力をクリア（新規状態にリセット）
  const clearAllState = () => {
    setPasteText("");
    setPattern(null);
    setGeneratedMessage("");
    setPrCharCount(null);
    setOpeningMessageCharCount(null);
    setExtractedFaculty(null);
    setError(null);
    setSelectedPreview("mobile");
    setCurrentGeminiOutputs({});
  };

  const handleGenerate = async () => {
    if (!pasteText.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMessage("");
    setPattern(null);
    setExtractedFaculty(null);
    setCurrentGeminiOutputs({});

    try {
      // 自己PR候補を抽出してA/B判定
      const prCandidate = extractPrCandidate(pasteText);
      const charCount = Array.from(prCandidate).length;
      setPrCharCount(charCount);

      console.log("=== A/B判定デバッグ ===");
      console.log("貼り付けテキスト長:", Array.from(pasteText).length, "文字");
      console.log("抽出された自己PR候補:", prCandidate.slice(0, 100) + "...");
      console.log("自己PR候補の文字数:", charCount);
      
      const judgedPattern = judgePattern(prCandidate);
      console.log("判定結果:", judgedPattern, "(200文字以上でA)");
      setPattern(judgedPattern);

      let greeting: string;
      let formattedOpening: string;
      const geminiOutputs: typeof currentGeminiOutputs = {};

      if (judgedPattern === "A") {
        // Aパターン: Geminiでtitleとopening_messageを生成
        console.log("=== Aパターン処理開始 ===");
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

        geminiOutputs.title = title;
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

        geminiOutputs.openingMessage = openingMessageRaw;

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
        setExtractedFaculty(facultyName || null);
        console.log("Bパターン: 抽出された学部名 =", facultyName);
        
        let profileLine = "プロフィールを拝見し、ご連絡しました。"; // デフォルト
        
        if (facultyName) {
          // 学部名があればGeminiで1文生成
          try {
            const res = await fetch("/api/gemini", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "b_profile_line", facultyName }),
            });
            
            if (res.ok) {
              const data = await res.json();
              console.log("Gemini B応答:", data);
              const generatedLine = (data.profile_line ?? "").replace(/ /g, "").trim();
              if (generatedLine) {
                profileLine = generatedLine;
              }
            } else {
              console.error("Gemini B API error:", res.status);
            }
          } catch (e) {
            console.error("Gemini B fetch error:", e);
          }
        } else {
          console.log("学部名が抽出できなかったため、デフォルト文を使用");
        }
        
        geminiOutputs.profileLine = profileLine;
        console.log("最終profileLine:", profileLine);
        
        // テンプレートの{{B_PROFILE_LINE}}を差し替え
        const finalB = B_TEMPLATE_TEXT.replace("{{B_PROFILE_LINE}}", profileLine);
        setOpeningMessageCharCount(null);
        setGeneratedMessage(finalB);
      }

      // Gemini出力を保存（履歴保存時に使用）
      setCurrentGeminiOutputs(geminiOutputs);
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 現在選択中のプレビュー内容を取得
  const getCurrentPreviewText = () => {
    if (!generatedMessage) return "";
    if (selectedPreview === "pc") {
      return formatForPC(generatedMessage);
    }
    return generatedMessage;
  };

  const handleCopy = async () => {
    const textToCopy = getCurrentPreviewText();
    if (!textToCopy || !pattern) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // 学生情報を抽出
      const studentId7 = extractStudentId7(pasteText) ?? undefined;
      const universityName = extractUniversityName(pasteText) ?? undefined;
      const facultyName = extractFacultyFromUtils(pasteText) ?? extractedFaculty ?? undefined;
      const departmentName = extractDepartmentName(pasteText) ?? undefined;
      const prefecture = extractPrefecture(pasteText) ?? undefined;
      const gender = extractGender(pasteText);
      
      // 履歴に保存（Gemini出力 + 学生情報含む）
      const savedRecord = addToHistory({
        pattern,
        pasteText,
        generatedMessage,
        prCharCount: prCharCount ?? 0,
        geminiOutputs: Object.keys(currentGeminiOutputs).length > 0 ? currentGeminiOutputs : undefined,
        studentId7,
        universityName,
        facultyName,
        departmentName,
        prefecture,
        gender: gender !== "unknown" ? gender : undefined,
        offerStatus: "offered", // デフォルトは「オファー済」
      });
      
      console.log("履歴に保存しました:", savedRecord.id);

      // staging環境ではDBにも保存
      if (IS_STAGING) {
        try {
          const dbRes = await fetch("/api/deliveries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sentAt: new Date().toISOString(),
              templateType: pattern,
              finalMessage: generatedMessage,
              sourceText: pasteText,
            }),
          });
          if (dbRes.ok) {
            console.log("DBに保存しました");
            setCopyStatus("コピーしました - 履歴・DBに保存済み");
          } else {
            console.error("DB保存エラー:", await dbRes.text());
            setCopyStatus("コピーしました - 履歴に保存済み（DB保存エラー）");
          }
        } catch (dbErr) {
          console.error("DB保存エラー:", dbErr);
          setCopyStatus("コピーしました - 履歴に保存済み（DB接続エラー）");
        }
      } else {
        setCopyStatus("コピーしました - 履歴に保存済み");
      }
      
      // 1.5秒後に全てクリアして新規状態に
      setTimeout(() => {
        setCopyStatus(null);
        clearAllState();
      }, 1500);
    } catch {
      setCopyStatus("コピーに失敗しました");
      setTimeout(() => {
        setCopyStatus(null);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* STAGINGバナー */}
      {IS_STAGING && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-center py-2 shadow-md">
          <span className="font-bold text-black text-sm tracking-wider">
            STAGING 環境 - 本番ではありません
          </span>
        </div>
      )}
      
      <div className={`mx-auto max-w-3xl ${IS_STAGING ? "pt-10" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            OfferBox スカウト文生成
          </h1>
          {IS_STAGING && (
            <div className="flex gap-2">
              <a
                href="/deliveries"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                配信履歴
              </a>
              <a
                href="/analytics"
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                集計
              </a>
            </div>
          )}
        </div>

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
                  <>
                    <p className="text-sm text-orange-600">
                      1文のみAI生成（固定文ベース）
                    </p>
                    {extractedFaculty && (
                      <p className="text-sm text-gray-500">
                        抽出された学部: {extractedFaculty}
                      </p>
                    )}
                    {!extractedFaculty && (
                      <p className="text-sm text-gray-400">
                        学部名が抽出できませんでした
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* プレビュー */}
        {generatedMessage && (
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
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

            {/* タブUI */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setSelectedPreview("mobile")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedPreview === "mobile"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                スマホ版
              </button>
              <button
                onClick={() => setSelectedPreview("pc")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedPreview === "pc"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                PC版
              </button>
            </div>

            {/* スマホ版プレビュー */}
            {selectedPreview === "mobile" && (
              <div className="flex justify-center">
                <div
                  className="rounded-lg bg-white p-4 shadow"
                  style={{
                    width: "375px",
                    maxWidth: "100%",
                    fontSize: "16px",
                  }}
                >
                  <pre
                    className="font-sans leading-relaxed text-gray-800"
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {generatedMessage}
                  </pre>
                </div>
              </div>
            )}

            {/* PC版プレビュー */}
            {selectedPreview === "pc" && (
              <div className="rounded-lg bg-white p-4 shadow">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {formatForPC(generatedMessage)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 送信履歴セクション */}
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              送信履歴（{history.length}件）
            </span>
            {selectedRecordIds.size > 0 && (
              <button
                onClick={() => {
                  if (confirm(`選択した${selectedRecordIds.size}件の履歴を削除しますか？`)) {
                    const newHistory = history.filter(h => !selectedRecordIds.has(h.id));
                    saveHistory(newHistory);
                    setSelectedRecordIds(new Set());
                  }
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                選択した{selectedRecordIds.size}件を削除
              </button>
            )}
          </div>

          {/* 検索フィルタ */}
          {history.length > 0 && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ID検索</label>
                  <input
                    type="text"
                    value={searchIdQuery}
                    onChange={(e) => setSearchIdQuery(e.target.value)}
                    placeholder="7桁IDで検索"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">フリー検索</label>
                  <input
                    type="text"
                    value={searchFreeQuery}
                    onChange={(e) => setSearchFreeQuery(e.target.value)}
                    placeholder="大学名、学部など"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {(searchIdQuery || searchFreeQuery) && (
                <button
                  onClick={() => {
                    setSearchIdQuery("");
                    setSearchFreeQuery("");
                  }}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  検索をクリア
                </button>
              )}
            </div>
          )}

          {/* 
            JSON Export/Import機能は管理者用途として保持（UIからは非表示）
            機能自体はhandleExportHistory, handleFileSelect等で利用可能
          */}

          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">履歴がありません</p>
            ) : (
              (() => {
                // 検索フィルタ適用
                const filteredHistory = history.filter((record) => {
                  // ID検索
                  if (searchIdQuery && record.studentId7) {
                    if (!record.studentId7.includes(searchIdQuery)) {
                      return false;
                    }
                  } else if (searchIdQuery && !record.studentId7) {
                    return false;
                  }
                  
                  // フリー検索
                  if (searchFreeQuery) {
                    const searchText = searchFreeQuery.toLowerCase();
                    const searchableText = [
                      record.universityName,
                      record.facultyName,
                      record.departmentName,
                      record.prefecture,
                      record.pasteText,
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase();
                    if (!searchableText.includes(searchText)) {
                      return false;
                    }
                  }
                  
                  return true;
                });

                if (filteredHistory.length === 0) {
                  return <p className="text-sm text-gray-400">検索結果がありません</p>;
                }

                return filteredHistory.map((record) => {
                  const isSelected = selectedRecordIds.has(record.id);
                  const currentStatus = record.offerStatus || "offered";
                  const statusOption = OFFER_STATUS_OPTIONS.find(o => o.value === currentStatus);
                  
                  return (
                    <div
                      key={record.id}
                      className={`rounded-lg bg-white shadow-sm border ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-100"}`}
                    >
                      <div className="flex items-center p-3">
                        {/* チェックボックス */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const newSet = new Set(selectedRecordIds);
                            if (isSelected) {
                              newSet.delete(record.id);
                            } else {
                              newSet.add(record.id);
                            }
                            setSelectedRecordIds(newSet);
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3 flex-shrink-0"
                        />
                        
                        {/* クリックで詳細ページへ遷移 */}
                        <div
                          onClick={() => router.push(`/history/${record.id}`)}
                          className="flex-1 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            {/* パターン表示 */}
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                                record.pattern === "A" ? "bg-green-500" : "bg-orange-500"
                              }`}
                            >
                              {record.pattern}
                            </span>
                            {/* 日時 */}
                            <span className="text-xs text-gray-500">
                              {record.timestamp}
                            </span>
                          </div>
                          {/* 学生情報サマリー */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700 ml-9">
                            {record.studentId7 && (
                              <span className="font-mono text-blue-600">{record.studentId7}</span>
                            )}
                            {record.universityName && (
                              <span>{record.universityName}</span>
                            )}
                            {record.facultyName && (
                              <span>{record.facultyName}</span>
                            )}
                            {record.prefecture && (
                              <span>{record.prefecture}</span>
                            )}
                            {record.gender && (
                              <span>{getGenderLabel(record.gender)}</span>
                            )}
                            {!record.studentId7 && !record.universityName && !record.facultyName && (
                              <span className="text-gray-400">（学生情報なし）</span>
                            )}
                          </div>
                        </div>
                        
                        {/* ステータス選択 */}
                        <select
                          value={currentStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value as OfferStatus;
                            const newHistory = history.map(h => 
                              h.id === record.id ? { ...h, offerStatus: newStatus } : h
                            );
                            saveHistory(newHistory);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`ml-3 px-2 py-1 text-xs rounded font-medium ${statusOption?.color || "bg-gray-200"}`}
                        >
                          {OFFER_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        
                        {/* 削除ボタン */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("この履歴を削除しますか？")) {
                              const newHistory = history.filter(h => h.id !== record.id);
                              saveHistory(newHistory);
                            }
                          }}
                          className="ml-3 text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>

          {/* Staging: DBインポート機能 */}
          {IS_STAGING && history.length > 0 && (
            <div className="mt-6 pt-4 border-t border-dashed">
              <p className="text-xs text-gray-500 mb-2">
                [Staging専用] ローカル履歴をDBに一括投入
              </p>
              <button
                onClick={async () => {
                  if (!confirm(`${history.length}件の履歴をDBにインポートしますか？`)) return;
                  try {
                    const records = history.map((h) => ({
                      sentAt: h.createdAt,
                      templateType: h.pattern,
                      finalMessage: h.generatedMessage,
                      sourceText: h.pasteText,
                    }));
                    const res = await fetch("/api/admin/import-deliveries", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ records }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert(`完了: ${data.inserted}件追加, ${data.skipped}件スキップ`);
                    } else {
                      alert(`エラー: ${data.error}`);
                    }
                  } catch (err) {
                    alert(`エラー: ${err instanceof Error ? err.message : "不明"}`);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded border border-orange-300 hover:bg-orange-200"
              >
                ローカル履歴をDBに投入
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
