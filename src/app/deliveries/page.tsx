"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getGenderLabel,
  extractFacultyName,
  extractDepartmentName,
  extractPrefecture,
  extractGraduationYear,
  extractMajor,
} from "@/lib/extraction-utils";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "production";
const DB_ENABLED = process.env.NEXT_PUBLIC_DB_ENABLED === "true" || APP_ENV === "staging";

// URLでSTAGING環境かどうかを判定（環境変数に依存しない）
function useIsStaging(): boolean {
  const [isStaging, setIsStaging] = useState(false);
  
  useEffect(() => {
    const hostname = window.location.hostname;
    // "staging"がURL/ホスト名に含まれている場合のみSTAGINGと判定
    // 本番URL: offerbox-scout-generator-production.up.railway.app
    // ステージングURL: offerbox-scout-generator-staging.up.railway.app (例)
    const isStagingUrl = hostname.includes("staging");
    setIsStaging(isStagingUrl);
  }, []);
  
  return isStaging;
}

// CSV出力の警告閾値
const CSV_EXPORT_WARNING_THRESHOLD = 2000;

interface Delivery {
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
  approvedAt: string | null;
  onHoldAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
}

interface DeliveriesResponse {
  items: Delivery[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_OPTIONS = [
  { value: "none", label: "オファー済", color: "bg-blue-500 text-white" },
  { value: "approved", label: "承認", color: "bg-green-500 text-white" },
  { value: "on_hold", label: "保留", color: "bg-yellow-500 text-white" },
  { value: "cancelled", label: "辞退", color: "bg-red-500 text-white" },
];

const TIME_SLOTS = ["00-05", "06-11", "12-17", "18-23"];

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "-";
  const d = new Date(isoString);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} ${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
}

export default function DeliveriesPage() {
  const isStaging = useIsStaging();
  const [items, setItems] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フィルタ
  const [sendDateFrom, setSendDateFrom] = useState("");
  const [sendDateTo, setSendDateTo] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [studentId7, setStudentId7] = useState("");
  const [offerStatus, setOfferStatus] = useState("");

  // コピー状態
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // CSVエクスポート状態
  const [exporting, setExporting] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (sendDateFrom) params.set("sendDateFrom", sendDateFrom);
      if (sendDateTo) params.set("sendDateTo", sendDateTo);
      if (timeSlot) params.set("timeSlot", timeSlot);
      if (templateType) params.set("templateType", templateType);
      if (studentId7) params.set("studentId7", studentId7);
      if (offerStatus) params.set("offerStatus", offerStatus);

      const res = await fetch(`/api/deliveries?${params.toString()}`);
      if (!res.ok) throw new Error("データの取得に失敗しました");

      const data: DeliveriesResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [page, sendDateFrom, sendDateTo, timeSlot, templateType, studentId7, offerStatus]);

  useEffect(() => {
    if (DB_ENABLED) {
      fetchDeliveries();
    }
  }, [fetchDeliveries, page]);

  const handleSearch = () => {
    setPage(1);
    fetchDeliveries();
  };

  const handleClearFilters = () => {
    setSendDateFrom("");
    setSendDateTo("");
    setTimeSlot("");
    setTemplateType("");
    setStudentId7("");
    setOfferStatus("");
    setPage(1);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const normalized = newStatus;
    try {
      const res = await fetch(`/api/deliveries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: normalized }),
      });

      if (!res.ok) throw new Error("ステータス更新に失敗しました");

      // ローカル更新
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                offerStatus: normalized,
                approvedAt: newStatus === "approved" ? new Date().toISOString() : null,
                onHoldAt: newStatus === "on_hold" ? new Date().toISOString() : null,
                cancelledAt: newStatus === "cancelled" ? new Date().toISOString() : null,
              }
            : item
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  // CSVエクスポート
  const handleExportCSV = async () => {

    // 件数チェック（警告）
    if (total > CSV_EXPORT_WARNING_THRESHOLD && !showExportWarning) {
      setShowExportWarning(true);
      return;
    }

    setExporting(true);
    setShowExportWarning(false);

    try {
      const params = new URLSearchParams();
      if (sendDateFrom) params.set("sendDateFrom", sendDateFrom);
      if (sendDateTo) params.set("sendDateTo", sendDateTo);
      if (timeSlot) params.set("timeSlot", timeSlot);
      if (templateType) params.set("templateType", templateType);
      if (studentId7) params.set("studentId7", studentId7);
      if (offerStatus) params.set("offerStatus", offerStatus);

      const res = await fetch(`/api/deliveries/export.csv?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "CSVエクスポートに失敗しました");
      }

      // Blobとしてダウンロード
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "deliveries.csv";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "CSVエクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const handleCancelExport = () => {
    setShowExportWarning(false);
  };

  if (!DB_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">配信履歴</h1>
          <p className="text-gray-600 mb-4">データベースが設定されていません。</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            ← トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* STAGINGバナー（本番では非表示） */}
      {isStaging && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-center py-2 shadow-md">
          <span className="font-bold text-sm tracking-wider text-black">
            STAGING 環境 - 本番ではありません
          </span>
        </div>
      )}

      <div className={`mx-auto max-w-6xl ${isStaging ? "pt-10" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">配信履歴</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/analytics"
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              集計
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              トップ
            </Link>
          </div>
        </div>

        {/* フィルタ */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-900 mb-1">配信日（から）</label>
              <input
                type="date"
                value={sendDateFrom}
                onChange={(e) => setSendDateFrom(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">配信日（まで）</label>
              <input
                type="date"
                value={sendDateTo}
                onChange={(e) => setSendDateTo(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">時間帯</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm text-gray-900"
              >
                <option value="">すべて</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">テンプレ</label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm text-gray-900"
              >
                <option value="">すべて</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">学生ID</label>
              <input
                type="text"
                value={studentId7}
                onChange={(e) => setStudentId7(e.target.value)}
                placeholder="7桁ID"
                className="w-full border rounded px-2 py-1 text-sm text-gray-900 placeholder-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">選考</label>
              <select
                value={offerStatus}
                onChange={(e) => setOfferStatus(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm text-gray-900"
              >
                <option value="">すべて</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 col-span-2">
              <button
                onClick={handleSearch}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                検索
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                クリア
              </button>
              {/* CSV出力ボタン */}
              <button
                onClick={handleExportCSV}
                disabled={exporting || total === 0}
                className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? "出力中..." : "CSV出力（Excel）"}
              </button>
            </div>
          </div>
        </div>

        {/* CSVエクスポート警告 */}
        {showExportWarning && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-yellow-800 font-medium mb-2">
              件数が多いため、エクスポートに時間がかかる可能性があります
            </p>
            <p className="text-sm text-yellow-700 mb-3">
              対象: {total.toLocaleString()}件（警告閾値: {CSV_EXPORT_WARNING_THRESHOLD.toLocaleString()}件）
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                続行する
              </button>
              <button
                onClick={handleCancelExport}
                className="px-4 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* 件数・ページング */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-900">
            全{total}件中 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}件表示
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 text-gray-900"
            >
              前へ
            </button>
            <span className="text-sm text-gray-900">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 text-gray-900"
            >
              次へ
            </button>
          </div>
        </div>

        {/* テーブル */}
        {loading ? (
          <div className="text-center py-8 text-gray-900">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-900">データがありません</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">配信日時</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">ID(7桁)</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">大学</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">学部学科</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">専攻</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">選考中項目</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">居住地</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap text-gray-900">選考</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap text-gray-900">性別</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap text-gray-900">卒業年度</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap text-gray-900">パターン</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap text-gray-900">状態日付</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap text-gray-900">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const src = item.sourceText || "";
                  let notesObj: { facultyDepartment?: string; prefecture?: string; graduationYear?: string; major?: string; selectionItem?: string } = {};
                  try {
                    if (item.notes) notesObj = JSON.parse(item.notes);
                  } catch { /* ignore */ }
                  const faculty = extractFacultyName(src);
                  const dept = extractDepartmentName(src);
                  const facultyDept = (notesObj.facultyDepartment ?? [faculty, dept].filter(Boolean).join(" ")) || "-";
                  const rawMajor = notesObj.major ?? extractMajor(src);
                  const major = (rawMajor === "文系" || rawMajor === "理系") ? rawMajor : (rawMajor || "-");
                  const selectionItem = notesObj.selectionItem || "-";
                  const prefecture = (notesObj.prefecture ?? extractPrefecture(src)) || "-";
                  const graduation = (notesObj.graduationYear ?? extractGraduationYear(src)) || "-";
                  const statusDate = item.offerStatus === "approved" ? item.approvedAt
                    : item.offerStatus === "on_hold" ? item.onHoldAt
                    : ["cancelled", "declined"].includes(item.offerStatus) ? item.cancelledAt
                    : null;

                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50 align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{formatDateTime(item.sentAt)}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-blue-600">{item.studentId7 || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{item.universityName || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{facultyDept}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{major}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{selectionItem}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{prefecture}</td>
                      <td className="px-3 py-2">
                        <select
                          value={{ offered: "none", declined: "cancelled", applied: "approved" }[item.offerStatus] ?? item.offerStatus}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_OPTIONS.find((o) => o.value === ({ offered: "none", declined: "cancelled", applied: "approved" }[item.offerStatus] ?? item.offerStatus))?.color ||
                            "bg-gray-200"
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap text-gray-900">{getGenderLabel(item.gender) || "-"}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap text-gray-900">{graduation}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                            item.templateType === "A" ? "bg-green-500" : "bg-orange-500"
                          }`}
                        >
                          {item.templateType === "A" ? "A" : "B"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {statusDate ? formatDateTime(statusDate) : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleCopy(item.finalMessage, item.id)}
                          className={`px-2 py-1 text-xs rounded ${
                            copiedId === item.id
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                          }`}
                        >
                          {copiedId === item.id ? "コピー済" : "コピー"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
