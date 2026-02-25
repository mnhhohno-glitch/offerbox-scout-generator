"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getGenderLabel,
  extractFacultyName,
  extractDepartmentName,
  extractPrefecture,
  extractGraduationYear,
} from "@/lib/extraction-utils";

// DBのofferStatus値（オファー済/承認/辞退/保留）
type OfferStatus = "none" | "offered" | "approved" | "applied" | "on_hold" | "cancelled" | "declined";

const OFFER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "オファー済" },
  { value: "offered", label: "オファー済" },
  { value: "approved", label: "承認" },
  { value: "applied", label: "承認" },
  { value: "on_hold", label: "保留" },
  { value: "cancelled", label: "辞退" },
  { value: "declined", label: "辞退" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "unknown", label: "不明" },
];

// DBのDelivery型
interface DeliveryRecord {
  id: string;
  createdAt: string;
  sentAt: string;
  sendDate: string;
  timeSlot: string;
  templateType: string;
  finalMessage: string;
  sourceText: string | null;
  studentId7: string | null;
  universityName: string | null;
  gender: string | null;
  lastLoginAt: string | null;
  offerStatus: string;
}

const CARD_HEIGHT = 600;

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("ja-JP");
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<DeliveryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [scoutSaveStatus, setScoutSaveStatus] = useState<string | null>(null);

  const [editStudentId7, setEditStudentId7] = useState("");
  const [editUniversityName, setEditUniversityName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPattern, setEditPattern] = useState<"A" | "B">("A");
  const [editScoutMessage, setEditScoutMessage] = useState("");

  useEffect(() => {
    const loadRecord = async () => {
      const id = params.id as string;
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/deliveries/${id}`);
        if (!res.ok) {
          setRecord(null);
          setLoading(false);
          return;
        }
        const data: DeliveryRecord = await res.json();
        setRecord(data);
        setEditStudentId7(data.studentId7 || "");
        setEditUniversityName(data.universityName || "");
        setEditGender(data.gender || "unknown");
        setEditPattern((data.templateType as "A" | "B") || "A");
        setEditScoutMessage(data.finalMessage || "");
      } catch (err) {
        console.error("履歴の読み込みエラー:", err);
        setRecord(null);
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, [params.id]);

  const handleCopy = async () => {
    if (!editScoutMessage) return;
    try {
      await navigator.clipboard.writeText(editScoutMessage);
      setCopyStatus("コピーしました");
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("コピーに失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    if (!confirm("この履歴を削除しますか？")) return;

    try {
      const res = await fetch(`/api/deliveries/${record.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/deliveries");
      } else {
        alert("削除に失敗しました");
      }
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!record) return;
    const normalized = { offered: "none", declined: "cancelled", applied: "approved" }[newStatus] ?? newStatus;

    try {
      const res = await fetch(`/api/deliveries/${record.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: normalized }),
      });
      if (res.ok) {
        setRecord({ ...record, offerStatus: normalized });
      } else {
        alert("ステータスの更新に失敗しました");
      }
    } catch (err) {
      console.error("ステータス更新エラー:", err);
      alert("ステータスの更新に失敗しました");
    }
  };

  const handleSaveStudentInfo = async () => {
    if (!record) return;

    if (editStudentId7 && !/^\d{7}$/.test(editStudentId7)) {
      alert("IDは7桁の数字で入力してください");
      return;
    }

    try {
      const res = await fetch(`/api/deliveries/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId7: editStudentId7 || null,
          universityName: editUniversityName || null,
          gender: editGender || null,
          templateType: editPattern,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecord(updated);
        setSaveStatus("保存しました");
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存に失敗しました");
    }
  };

  const handleSaveScoutMessage = async () => {
    if (!record) return;

    try {
      const res = await fetch(`/api/deliveries/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalMessage: editScoutMessage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecord(updated);
        setScoutSaveStatus("保存しました");
        setTimeout(() => setScoutSaveStatus(null), 2000);
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-gray-500 mb-4">履歴が見つかりませんでした</p>
          <Link href="/deliveries" className="text-blue-600 hover:underline">
            ← 配信履歴に戻る
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = record.offerStatus || "none";
  const src = record.sourceText || "";
  const faculty = extractFacultyName(src);
  const dept = extractDepartmentName(src);
  const facultyDept = [faculty, dept].filter(Boolean).join(" ") || "";
  const prefecture = extractPrefecture(src) || "";
  const graduation = extractGraduationYear(src) || "";

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6 px-1">
          <Link
            href="/deliveries"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            この履歴を削除
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col"
            style={{ height: `${CARD_HEIGHT}px` }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
                    editPattern === "A" ? "bg-green-500" : "bg-orange-500"
                  }`}
                >
                  {editPattern}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">学生情報</h2>
                  <p className="text-xs text-gray-500">{formatTimestamp(record.sentAt)}</p>
                </div>
              </div>
              <button
                onClick={handleSaveStudentInfo}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  saveStatus ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {saveStatus || "保存"}
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-2">選考</label>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as OfferStatus)}
                className={`px-3 py-2 text-sm rounded-lg bg-white border-2 font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentStatus === "none" ? "border-gray-400" :
                  currentStatus === "approved" ? "border-green-400" :
                  currentStatus === "on_hold" ? "border-yellow-400" :
                  currentStatus === "cancelled" ? "border-red-400" : "border-gray-300"
                }`}
              >
                {OFFER_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">ID（7桁）</label>
                  <input
                    type="text"
                    value={editStudentId7}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                      setEditStudentId7(val);
                    }}
                    placeholder="1234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-blue-600 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">大学</label>
                  <input
                    type="text"
                    value={editUniversityName}
                    onChange={(e) => setEditUniversityName(e.target.value)}
                    placeholder="○○大学"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">学部学科</label>
                  <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700">{facultyDept || "-"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">居住地（都道府県）</label>
                  <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700">{prefecture || "-"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">卒業年度（◯◯卒）</label>
                  <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700">{graduation || "-"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">性別</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">パターン</label>
                  <select
                    value={editPattern}
                    onChange={(e) => setEditPattern(e.target.value as "A" | "B")}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      editPattern === "A" ? "text-green-600" : "text-orange-600"
                    }`}
                  >
                    <option value="A">Aパターン</option>
                    <option value="B">Bパターン</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col"
            style={{ height: `${CARD_HEIGHT}px` }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">スカウト文</h2>
                <p className="text-xs text-gray-500">直接編集できます</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{editScoutMessage.length}文字</span>
                <button
                  onClick={handleSaveScoutMessage}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    scoutSaveStatus ? "bg-green-500 text-white" : "bg-gray-600 text-white hover:bg-gray-700"
                  }`}
                >
                  {scoutSaveStatus || "保存"}
                </button>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    copyStatus ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copyStatus || "コピー"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-lg bg-gray-700">
              <textarea
                value={editScoutMessage}
                onChange={(e) => setEditScoutMessage(e.target.value)}
                className="w-full h-full px-5 py-4 bg-transparent text-gray-100 text-sm leading-relaxed resize-none focus:outline-none"
                style={{ lineHeight: "1.75" }}
                placeholder="スカウト文を入力..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
