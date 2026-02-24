"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// オファーステータスの型定義
type OfferStatus = "offered" | "applied" | "on_hold" | "declined";

// オファーステータスのオプション
const OFFER_STATUS_OPTIONS: { value: OfferStatus; label: string }[] = [
  { value: "offered", label: "オファー済" },
  { value: "applied", label: "応募" },
  { value: "on_hold", label: "保留" },
  { value: "declined", label: "辞退" },
];

// 性別オプション
const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "unknown", label: "不明" },
];

// 都道府県リスト
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
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

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<HistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // 編集用state
  const [editStudentId7, setEditStudentId7] = useState("");
  const [editUniversityName, setEditUniversityName] = useState("");
  const [editFacultyName, setEditFacultyName] = useState("");
  const [editDepartmentName, setEditDepartmentName] = useState("");
  const [editPrefecture, setEditPrefecture] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPattern, setEditPattern] = useState<"A" | "B">("A");

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
      
      // 編集用stateを初期化
      if (found) {
        setEditStudentId7(found.studentId7 || "");
        setEditUniversityName(found.universityName || "");
        setEditFacultyName(found.facultyName || "");
        setEditDepartmentName(found.departmentName || "");
        setEditPrefecture(found.prefecture || "");
        setEditGender(found.gender || "unknown");
        setEditPattern(found.pattern);
      }
      
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

  const handleSaveStudentInfo = () => {
    if (!record) return;

    // ID検証（7桁数字）
    if (editStudentId7 && !/^\d{7}$/.test(editStudentId7)) {
      alert("IDは7桁の数字で入力してください");
      return;
    }

    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const history: HistoryRecord[] = JSON.parse(stored);
        const updatedRecord = {
          ...record,
          studentId7: editStudentId7 || undefined,
          universityName: editUniversityName || undefined,
          facultyName: editFacultyName || undefined,
          departmentName: editDepartmentName || undefined,
          prefecture: editPrefecture || undefined,
          gender: editGender || undefined,
          pattern: editPattern,
        };
        const newHistory = history.map((h) =>
          h.id === record.id ? updatedRecord : h
        );
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
        setRecord(updatedRecord);
        setSaveStatus("保存しました");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-500 mb-4">履歴が見つかりませんでした</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = record.offerStatus || "offered";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="mx-auto max-w-6xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
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

        {/* 2カラムレイアウト */}
        <div className="flex gap-6" style={{ minHeight: "calc(100vh - 120px)" }}>
          {/* 左カラム: 学生情報 */}
          <div className="w-1/2 bg-white rounded-lg shadow p-5 flex flex-col">
            {/* タイトル行 */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  editPattern === "A" ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {editPattern}
              </span>
              <p className="text-sm text-gray-500">{record.timestamp}</p>
            </div>

            {/* オファーステータス */}
            <div className="mb-4">
              <h2 className="text-sm font-bold text-gray-800 mb-2">オファーステータス</h2>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as OfferStatus)}
                className={`px-3 py-2 text-sm rounded bg-white border border-gray-300 font-medium text-gray-900 ${
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

            {/* 学生情報（編集可能） */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-800">学生情報</h2>
                <button
                  onClick={handleSaveStudentInfo}
                  className={`px-4 py-1.5 text-sm rounded font-medium ${
                    saveStatus
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {saveStatus || "保存"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* ID（7桁数字） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">ID（7桁）</label>
                  <input
                    type="text"
                    value={editStudentId7}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                      setEditStudentId7(val);
                    }}
                    placeholder="1234567"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-blue-600 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* 大学名（テキスト） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">大学名</label>
                  <input
                    type="text"
                    value={editUniversityName}
                    onChange={(e) => setEditUniversityName(e.target.value)}
                    placeholder="○○大学"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* 学部（テキスト） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">学部</label>
                  <input
                    type="text"
                    value={editFacultyName}
                    onChange={(e) => setEditFacultyName(e.target.value)}
                    placeholder="○○学部"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* 学科（テキスト） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">学科</label>
                  <input
                    type="text"
                    value={editDepartmentName}
                    onChange={(e) => setEditDepartmentName(e.target.value)}
                    placeholder="○○学科"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* 都道府県（選択） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">都道府県</label>
                  <select
                    value={editPrefecture}
                    onChange={(e) => setEditPrefecture(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {PREFECTURES.map(pref => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                  </select>
                </div>
                
                {/* 性別（選択） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">性別</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* テンプレ（選択） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">テンプレ</label>
                  <select
                    value={editPattern}
                    onChange={(e) => setEditPattern(e.target.value as "A" | "B")}
                    className={`w-full px-2 py-1.5 border border-gray-300 rounded font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editPattern === "A" ? "text-green-600" : "text-orange-600"
                    }`}
                  >
                    <option value="A">Aパターン</option>
                    <option value="B">Bパターン</option>
                  </select>
                </div>
                
                {/* 文字数（表示のみ） */}
                <div>
                  <label className="block text-gray-500 text-xs mb-1">文字数</label>
                  <div className="px-2 py-1.5 bg-gray-100 rounded text-gray-800 text-sm">
                    {record.prCharCount}文字
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: スカウト文 */}
          <div className="w-1/2 bg-white rounded-lg shadow p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-800">スカウト文</h2>
              <button
                onClick={handleCopy}
                className={`px-4 py-1.5 text-sm rounded font-medium flex items-center gap-2 ${
                  copyStatus
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copyStatus || "コピー"}
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                {record.generatedMessage}
              </p>
            </div>
            <div className="mt-2 text-right text-xs text-gray-500">
              {record.generatedMessage.length}文字
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
