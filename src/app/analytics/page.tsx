"use client";

import { useState } from "react";
import Link from "next/link";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "production";
const IS_STAGING = APP_ENV === "staging";

interface AnalyticsRow {
  sendDate: string;
  timeSlot: string;
  templateType: string;
  count: number;
}

const TIME_SLOTS = ["00-05", "06-11", "12-17", "18-23"];

export default function AnalyticsPage() {
  const [sendDateFrom, setSendDateFrom] = useState("");
  const [sendDateTo, setSendDateTo] = useState("");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!sendDateFrom || !sendDateTo) {
      setError("期間を指定してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("sendDateFrom", sendDateFrom);
      params.set("sendDateTo", sendDateTo);

      const res = await fetch(`/api/analytics/deliveries?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "データの取得に失敗しました");
      }

      const data = await res.json();
      setRows(data.rows);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 集計データをテーブル形式に変換
  const buildSummary = () => {
    const dateSet = new Set<string>();
    rows.forEach((r) => dateSet.add(r.sendDate));
    const dates = Array.from(dateSet).sort().reverse();

    // 日付×時間帯×テンプレごとのカウントマップ
    const countMap = new Map<string, number>();
    rows.forEach((r) => {
      const key = `${r.sendDate}-${r.timeSlot}-${r.templateType}`;
      countMap.set(key, r.count);
    });

    return { dates, countMap };
  };

  const { dates, countMap } = buildSummary();

  // 全体合計
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const totalA = rows.filter((r) => r.templateType === "A").reduce((sum, r) => sum + r.count, 0);
  const totalB = rows.filter((r) => r.templateType === "B").reduce((sum, r) => sum + r.count, 0);

  if (!IS_STAGING) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">配信集計</h1>
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
          <h1 className="text-2xl font-bold text-gray-800">配信集計</h1>
          <div className="flex gap-2">
            <Link
              href="/deliveries"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              履歴
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              トップ
            </Link>
          </div>
        </div>

        {/* 期間指定 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">配信日（から）*</label>
              <input
                type="date"
                value={sendDateFrom}
                onChange={(e) => setSendDateFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">配信日（まで）*</label>
              <input
                type="date"
                value={sendDateTo}
                onChange={(e) => setSendDateTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "読み込み中..." : "集計"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * 期間指定は必須です（パフォーマンス対策）
          </p>
        </div>

        {/* エラー */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* 結果 */}
        {searched && !loading && (
          <>
            {/* サマリー */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">集計サマリー</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-100 rounded p-3">
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-gray-600">合計</p>
                </div>
                <div className="bg-green-100 rounded p-3">
                  <p className="text-2xl font-bold text-green-700">{totalA}</p>
                  <p className="text-xs text-gray-600">Aパターン</p>
                </div>
                <div className="bg-orange-100 rounded p-3">
                  <p className="text-2xl font-bold text-orange-700">{totalB}</p>
                  <p className="text-xs text-gray-600">Bパターン</p>
                </div>
              </div>
            </div>

            {/* 詳細テーブル */}
            {dates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                指定期間にデータがありません
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">配信日</th>
                      {TIME_SLOTS.map((slot) => (
                        <th key={slot} colSpan={2} className="px-3 py-2 text-center border-l">
                          {slot}
                        </th>
                      ))}
                      <th colSpan={2} className="px-3 py-2 text-center border-l bg-gray-200">
                        日計
                      </th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-1"></th>
                      {TIME_SLOTS.map((slot) => (
                        <>
                          <th key={`${slot}-a`} className="px-2 py-1 text-center text-xs border-l">
                            <span className="text-green-600">A</span>
                          </th>
                          <th key={`${slot}-b`} className="px-2 py-1 text-center text-xs">
                            <span className="text-orange-600">B</span>
                          </th>
                        </>
                      ))}
                      <th className="px-2 py-1 text-center text-xs border-l bg-gray-100">
                        <span className="text-green-600">A</span>
                      </th>
                      <th className="px-2 py-1 text-center text-xs bg-gray-100">
                        <span className="text-orange-600">B</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => {
                      let dayTotalA = 0;
                      let dayTotalB = 0;

                      return (
                        <tr key={date} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{date}</td>
                          {TIME_SLOTS.map((slot) => {
                            const countA = countMap.get(`${date}-${slot}-A`) || 0;
                            const countB = countMap.get(`${date}-${slot}-B`) || 0;
                            dayTotalA += countA;
                            dayTotalB += countB;
                            return (
                              <>
                                <td
                                  key={`${date}-${slot}-A`}
                                  className="px-2 py-2 text-center border-l text-green-700"
                                >
                                  {countA || "-"}
                                </td>
                                <td
                                  key={`${date}-${slot}-B`}
                                  className="px-2 py-2 text-center text-orange-700"
                                >
                                  {countB || "-"}
                                </td>
                              </>
                            );
                          })}
                          <td className="px-2 py-2 text-center border-l bg-gray-50 font-medium text-green-700">
                            {dayTotalA}
                          </td>
                          <td className="px-2 py-2 text-center bg-gray-50 font-medium text-orange-700">
                            {dayTotalB}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
