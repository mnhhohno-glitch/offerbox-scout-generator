"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "production";
const IS_STAGING = APP_ENV === "staging";

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
  { value: "none", label: "未処理", color: "bg-gray-200 text-gray-700" },
  { value: "approved", label: "承認", color: "bg-green-500 text-white" },
  { value: "on_hold", label: "保留", color: "bg-yellow-500 text-white" },
  { value: "cancelled", label: "取消", color: "bg-red-500 text-white" },
];

const TIME_SLOTS = ["00-05", "06-11", "12-17", "18-23"];

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "-";
  const d = new Date(isoString);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} ${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
}

export default function DeliveriesPage() {
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
    if (IS_STAGING) {
      fetchDeliveries();
    }
  }, [fetchDeliveries]);

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
    try {
      const res = await fetch(`/api/deliveries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("ステータス更新に失敗しました");

      // ローカル更新
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                offerStatus: newStatus,
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

  if (!IS_STAGING) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">配信履歴</h1>
          <p className="text-gray-600">この機能はstaging環境でのみ利用可能です。</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            ← トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* STAGINGバナー */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-center py-2 shadow-md">
        <span className="font-bold text-black text-sm tracking-wider">
          STAGING 環境 - 本番ではありません
        </span>
      </div>

      <div className="mx-auto max-w-6xl pt-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">配信履歴</h1>
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
              <label className="block text-xs text-gray-600 mb-1">配信日（から）</label>
              <input
                type="date"
                value={sendDateFrom}
                onChange={(e) => setSendDateFrom(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">配信日（まで）</label>
              <input
                type="date"
                value={sendDateTo}
                onChange={(e) => setSendDateTo(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">時間帯</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
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
              <label className="block text-xs text-gray-600 mb-1">テンプレ</label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">すべて</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">学生ID</label>
              <input
                type="text"
                value={studentId7}
                onChange={(e) => setStudentId7(e.target.value)}
                placeholder="7桁ID"
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ステータス</label>
              <select
                value={offerStatus}
                onChange={(e) => setOfferStatus(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
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
            </div>
          </div>
        </div>

        {/* エラー */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* 件数・ページング */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            全{total}件中 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}件表示
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              前へ
            </button>
            <span className="text-sm">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>

        {/* テーブル */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">データがありません</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">配信日時</th>
                  <th className="px-3 py-2 text-left">時間帯</th>
                  <th className="px-3 py-2 text-center">テンプレ</th>
                  <th className="px-3 py-2 text-left">学生ID</th>
                  <th className="px-3 py-2 text-left">ログイン日時</th>
                  <th className="px-3 py-2 text-center">ステータス</th>
                  <th className="px-3 py-2 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{formatDateTime(item.sentAt)}</td>
                    <td className="px-3 py-2">{item.timeSlot}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                          item.templateType === "A" ? "bg-green-500" : "bg-orange-500"
                        }`}
                      >
                        {item.templateType}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{item.studentId7 || "-"}</td>
                    <td className="px-3 py-2">{formatDateTime(item.lastLoginAt)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={item.offerStatus}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          STATUS_OPTIONS.find((o) => o.value === item.offerStatus)?.color ||
                          "bg-gray-200"
                        }`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {item.offerStatus !== "none" && (
                        <div className="text-xs text-gray-400 mt-1">
                          {item.offerStatus === "approved" && formatDateTime(item.approvedAt)}
                          {item.offerStatus === "on_hold" && formatDateTime(item.onHoldAt)}
                          {item.offerStatus === "cancelled" && formatDateTime(item.cancelledAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleCopy(item.finalMessage, item.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          copiedId === item.id
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {copiedId === item.id ? "コピー済" : "コピー"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
