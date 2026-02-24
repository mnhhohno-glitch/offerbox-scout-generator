"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// オファーステータスの型定義
type OfferStatus = "offered" | "applied" | "on_hold" | "declined";

// オファーステータスのオプション
const OFFER_STATUS_OPTIONS: { value: OfferStatus; label: string; color: string }[] = [
  { value: "offered", label: "オファー済", color: "bg-blue-500 text-white" },
  { value: "applied", label: "応募", color: "bg-green-500 text-white" },
  { value: "on_hold", label: "保留", color: "bg-yellow-500 text-white" },
  { value: "declined", label: "辞退", color: "bg-red-500 text-white" },
];

// 履歴レコードの型定義
interface HistoryRecord {
  id: string;
  timestamp: string;
  createdAt: string;
  pattern: "A" | "B";
  pasteText: string;
  generatedMessage: string;
  prCharCount: number;
  geminiOutputs?: {
    title?: string;
    openingMessage?: string;
    profileLine?: string;
  };
  studentId7?: string;
  universityName?: string;
  facultyName?: string;
  departmentName?: string;
  prefecture?: string;
  gender?: string;
  offerStatus?: OfferStatus;
}

const HISTORY_STORAGE_KEY = "offerbox_scout_history";

function getGenderLabel(gender: string | null | undefined): string {
  switch (gender) {
    case "male":
      return "男性";
    case "female":
      return "女性";
    case "other":
      return "その他";
    default:
      return "-";
  }
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<HistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadRecord = () => {
      const id = params.id as string;
      if (!id) {
        setLoading(false);
        return;
      }

      let found: HistoryRecord | null = null;
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const history: HistoryRecord[] = JSON.parse(stored);
          found = history.find((h) => h.id === id) || null;
        }
      } catch (err) {
        console.error("履歴の読み込みエラー:", err);
      }
      setRecord(found);
      setLoading(false);
    };
    
    loadRecord();
  }, [params.id]);

  const handleCopy = async () => {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.generatedMessage);
      setCopyStatus("コピーしました");
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("コピーに失敗しました");
    }
  };

  const handleDelete = () => {
    if (!record) return;
    if (!confirm("この履歴を削除しますか？")) return;

    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const history: HistoryRecord[] = JSON.parse(stored);
        const newHistory = history.filter((h) => h.id !== record.id);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
        router.push("/");
      }
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました");
    }
  };

  const handleStatusChange = (newStatus: OfferStatus) => {
    if (!record) return;

    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const history: HistoryRecord[] = JSON.parse(stored);
        const newHistory = history.map((h) =>
          h.id === record.id ? { ...h, offerStatus: newStatus } : h
        );
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
        setRecord({ ...record, offerStatus: newStatus });
      }
    } catch (err) {
      console.error("ステータス更新エラー:", err);
      alert("ステータスの更新に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-2xl">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-2xl">
          <p className="text-gray-500 mb-4">履歴が見つかりませんでした</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = record.offerStatus || "offered";
  const statusOption = OFFER_STATUS_OPTIONS.find(o => o.value === currentStatus);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← 戻る
          </Link>
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-700"
          >
            この履歴を削除
          </button>
        </div>

        {/* メイン情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* タイトル行 */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  record.pattern === "A" ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {record.pattern}
              </span>
              <p className="text-sm text-gray-500">{record.timestamp}</p>
            </div>
          </div>

          {/* オファーステータス */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-800 mb-3">オファーステータス</h2>
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value as OfferStatus)}
              className={`px-4 py-2 text-sm rounded bg-white border border-gray-300 font-medium text-gray-700 ${
                currentStatus === "offered" ? "border-b-2 border-b-blue-500" :
                currentStatus === "applied" ? "border-b-2 border-b-green-500" :
                currentStatus === "on_hold" ? "border-b-2 border-b-yellow-500" :
                currentStatus === "declined" ? "border-b-2 border-b-red-500" : ""
              }`}
            >
              {OFFER_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 学生情報 */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-800 mb-3">学生情報</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">ID:</span>{" "}
                <span className="text-blue-600 font-mono font-bold">{record.studentId7 || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">大学名:</span>{" "}
                <span className="text-gray-800">{record.universityName || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">学部:</span>{" "}
                <span className="text-gray-800">{record.facultyName || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">学科:</span>{" "}
                <span className="text-gray-800">{record.departmentName || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">都道府県:</span>{" "}
                <span className="text-gray-800">{record.prefecture || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">性別:</span>{" "}
                <span className="text-gray-800">{getGenderLabel(record.gender)}</span>
              </div>
              <div>
                <span className="text-gray-500">テンプレ:</span>{" "}
                <span className={record.pattern === "A" ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                  {record.pattern}パターン
                </span>
              </div>
              <div>
                <span className="text-gray-500">文字数:</span>{" "}
                <span className="text-gray-800">{record.prCharCount}文字</span>
              </div>
            </div>
          </div>

          {/* スカウト文 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-800">スカウト文</h2>
              <button
                onClick={handleCopy}
                className={`px-4 py-2 text-sm rounded font-medium ${
                  copyStatus
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {copyStatus || "コピー"}
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {record.generatedMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
