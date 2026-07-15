"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "production";
const DB_ENABLED = process.env.NEXT_PUBLIC_DB_ENABLED === "true" || APP_ENV === "staging";

const COHORT_STORAGE_KEY = "selected_cohort_year";
type CohortFilter = "" | "27" | "28";

function getStoredCohortFilter(): CohortFilter {
  if (typeof window === "undefined") return "28";
  const v = window.localStorage.getItem(COHORT_STORAGE_KEY);
  return v === "27" || v === "28" ? v : "28";
}

// URLでSTAGING環境かどうかを判定（環境変数に依存しない）
function useIsStaging(): boolean {
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isStagingUrl = hostname.includes("staging");
    setIsStaging(isStagingUrl);
  }, []);

  return isStaging;
}

interface AnalyticsRow {
  sendDate: string;
  timeSlot: string;
  templateType: string;
  cohortYear: string;
  count: number;
}

interface CohortBreakdownItem {
  cohortYear: string;
  templateType: string;
  count: number;
}

interface CohortOpenedItem {
  cohortYear: string;
  count: number;
}

interface CohortSummaryPayload {
  sent: CohortBreakdownItem[];
  approved: CohortBreakdownItem[];
  opened: CohortOpenedItem[];
}

const TIME_SLOTS = ["00-05", "06-11", "12-17", "18-23"];

export default function AnalyticsPage() {
  const isStaging = useIsStaging();
  const [sendDateFrom, setSendDateFrom] = useState("");
  const [sendDateTo, setSendDateTo] = useState("");
  const [cohortYear, setCohortYear] = useState<CohortFilter>("28");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [cohortSummary, setCohortSummary] = useState<CohortSummaryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // 卒年フィルタの初期値を localStorage から復元
  useEffect(() => {
    setCohortYear(getStoredCohortFilter());
  }, []);

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
      if (cohortYear) params.set("cohortYear", cohortYear);

      const res = await fetch(`/api/analytics/deliveries?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "データの取得に失敗しました");
      }

      const data = await res.json();
      setRows(data.rows);
      setCohortSummary(data.cohortSummary || null);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // フィルタ適用後の表示用集計データ
  const buildSummary = () => {
    const dateSet = new Set<string>();
    rows.forEach((r) => dateSet.add(r.sendDate));
    const dates = Array.from(dateSet).sort().reverse();

    // 日付×時間帯×テンプレごとのカウントマップ
    const countMap = new Map<string, number>();
    rows.forEach((r) => {
      const key = `${r.sendDate}-${r.timeSlot}-${r.templateType}`;
      countMap.set(key, (countMap.get(key) || 0) + r.count);
    });

    return { dates, countMap };
  };

  const { dates, countMap } = buildSummary();

  // 表示用テンプレ種別（卒年に応じて変更）
  const TEMPLATE_TYPES_27 = ["A1", "A2", "A3", "B"] as const;
  const TEMPLATE_TYPES_28 = ["28A", "28B", "28C", "28D", "28SP"] as const;
  const displayTemplates: readonly string[] =
    cohortYear === "28"
      ? TEMPLATE_TYPES_28
      : cohortYear === "27"
      ? TEMPLATE_TYPES_27
      : [...TEMPLATE_TYPES_27, ...TEMPLATE_TYPES_28];

  // 全体合計
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const isAPattern = (t: string) => t === "A" || t === "A1" || t === "A2" || t === "A3";
  const totalA = rows.filter((r) => isAPattern(r.templateType)).reduce((sum, r) => sum + r.count, 0);
  const totalA1 = rows.filter((r) => r.templateType === "A1").reduce((sum, r) => sum + r.count, 0);
  const totalA2 = rows.filter((r) => r.templateType === "A2").reduce((sum, r) => sum + r.count, 0);
  const totalA3 = rows.filter((r) => r.templateType === "A3").reduce((sum, r) => sum + r.count, 0);
  const totalB = rows.filter((r) => r.templateType === "B").reduce((sum, r) => sum + r.count, 0);
  const total28A = rows.filter((r) => r.templateType === "28A").reduce((sum, r) => sum + r.count, 0);
  const total28B = rows.filter((r) => r.templateType === "28B").reduce((sum, r) => sum + r.count, 0);
  const total28C = rows.filter((r) => r.templateType === "28C").reduce((sum, r) => sum + r.count, 0);
  const total28D = rows.filter((r) => r.templateType === "28D").reduce((sum, r) => sum + r.count, 0);
  const total28SP = rows.filter((r) => r.templateType === "28SP").reduce((sum, r) => sum + r.count, 0);
  const total27Cohort = rows.filter((r) => r.cohortYear === "27").reduce((sum, r) => sum + r.count, 0);
  const total28Cohort = rows.filter((r) => r.cohortYear === "28").reduce((sum, r) => sum + r.count, 0);

  // 卒年対比用の集計値
  const sumBy = (
    items: CohortBreakdownItem[] | undefined,
    cohort: "27" | "28",
    templateFilter?: (t: string) => boolean
  ) => {
    if (!items) return 0;
    return items
      .filter((it) => it.cohortYear === cohort && (!templateFilter || templateFilter(it.templateType)))
      .reduce((s, it) => s + it.count, 0);
  };

  const sent27 = sumBy(cohortSummary?.sent, "27");
  const sent28 = sumBy(cohortSummary?.sent, "28");
  const approved27 = sumBy(cohortSummary?.approved, "27");
  const approved28 = sumBy(cohortSummary?.approved, "28");
  const opened27 = cohortSummary?.opened.find((o) => o.cohortYear === "27")?.count ?? 0;
  const opened28 = cohortSummary?.opened.find((o) => o.cohortYear === "28")?.count ?? 0;

  const sent27A1 = sumBy(cohortSummary?.sent, "27", (t) => t === "A1");
  const sent27A2 = sumBy(cohortSummary?.sent, "27", (t) => t === "A2");
  const sent27A3 = sumBy(cohortSummary?.sent, "27", (t) => t === "A3");
  const sent27B = sumBy(cohortSummary?.sent, "27", (t) => t === "B");
  const sent28A = sumBy(cohortSummary?.sent, "28", (t) => t === "28A");
  const sent28B = sumBy(cohortSummary?.sent, "28", (t) => t === "28B");
  const sent28C = sumBy(cohortSummary?.sent, "28", (t) => t === "28C");
  const sent28D = sumBy(cohortSummary?.sent, "28", (t) => t === "28D");
  const sent28SP = sumBy(cohortSummary?.sent, "28", (t) => t === "28SP");
  const approved27A1 = sumBy(cohortSummary?.approved, "27", (t) => t === "A1");
  const approved27A2 = sumBy(cohortSummary?.approved, "27", (t) => t === "A2");
  const approved27A3 = sumBy(cohortSummary?.approved, "27", (t) => t === "A3");
  const approved27B = sumBy(cohortSummary?.approved, "27", (t) => t === "B");
  const approved28A = sumBy(cohortSummary?.approved, "28", (t) => t === "28A");
  const approved28B = sumBy(cohortSummary?.approved, "28", (t) => t === "28B");
  const approved28C = sumBy(cohortSummary?.approved, "28", (t) => t === "28C");
  const approved28D = sumBy(cohortSummary?.approved, "28", (t) => t === "28D");
  const approved28SP = sumBy(cohortSummary?.approved, "28", (t) => t === "28SP");

  const rate = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  const formatPct = (v: number) => `${v.toFixed(1)}%`;
  const diffPct = (a27: number, a28: number) => {
    if (a27 === 0) return a28 === 0 ? "0%" : "-";
    const d = ((a28 - a27) / a27) * 100;
    return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
  };
  const diffPt = (p27: number, p28: number) => {
    const d = p28 - p27;
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}pt`;
  };

  if (!DB_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">配信集計</h1>
          <p className="text-gray-600">データベースが設定されていません。</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            ← トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {isStaging && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-center py-2 shadow-md">
          <span className="font-bold text-black text-sm tracking-wider">
            STAGING 環境 - 本番ではありません
          </span>
        </div>
      )}

      <div className={`mx-auto max-w-6xl ${isStaging ? "pt-10" : ""}`}>
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

        {/* 期間指定 + 卒年フィルタ */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-900 mb-1">配信日（から）*</label>
              <input
                type="date"
                value={sendDateFrom}
                onChange={(e) => setSendDateFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">配信日（まで）*</label>
              <input
                type="date"
                value={sendDateTo}
                onChange={(e) => setSendDateTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">卒年</label>
              <select
                value={cohortYear}
                onChange={(e) => setCohortYear(e.target.value as CohortFilter)}
                className="border rounded px-2 py-1 text-sm text-gray-900"
              >
                <option value="">全て</option>
                <option value="27">27卒</option>
                <option value="28">28卒</option>
              </select>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "読み込み中..." : "集計"}
            </button>
          </div>
          <p className="text-xs text-gray-900 mt-2">
            * 期間指定は必須です（パフォーマンス対策）
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {searched && !loading && (
          <>
            {/* サマリー（卒年フィルタの値で表示を切替） */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-900">集計サマリー</h2>
              {cohortYear === "" && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-2xl font-bold text-green-700">{total27Cohort}</p>
                    <p className="text-xs text-gray-900">27卒合計</p>
                  </div>
                  <div className="bg-indigo-100 rounded p-3">
                    <p className="text-2xl font-bold text-indigo-700">{total28Cohort}</p>
                    <p className="text-xs text-gray-900">28卒合計</p>
                  </div>
                  <div className="bg-gray-200 rounded p-3">
                    <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                    <p className="text-xs text-gray-900">全体合計</p>
                  </div>
                </div>
              )}
              {cohortYear === "27" && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                  <div className="bg-gray-100 rounded p-3">
                    <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                    <p className="text-xs text-gray-900">合計</p>
                  </div>
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-2xl font-bold text-green-700">{totalA}</p>
                    <p className="text-xs text-gray-900">A計</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-2xl font-bold text-green-600">{totalA1}</p>
                    <p className="text-xs text-gray-900">A1</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-2xl font-bold text-green-600">{totalA2}</p>
                    <p className="text-xs text-gray-900">A2</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-2xl font-bold text-green-600">{totalA3}</p>
                    <p className="text-xs text-gray-900">A3</p>
                  </div>
                  <div className="bg-orange-100 rounded p-3">
                    <p className="text-2xl font-bold text-orange-700">{totalB}</p>
                    <p className="text-xs text-gray-900">B</p>
                  </div>
                </div>
              )}
              {cohortYear === "28" && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                  <div className="bg-gray-100 rounded p-3">
                    <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                    <p className="text-xs text-gray-900">合計</p>
                  </div>
                  <div className="bg-indigo-100 rounded p-3">
                    <p className="text-2xl font-bold text-indigo-700">{total28A}</p>
                    <p className="text-xs text-gray-900">28A</p>
                  </div>
                  <div className="bg-indigo-100 rounded p-3">
                    <p className="text-2xl font-bold text-indigo-700">{total28B}</p>
                    <p className="text-xs text-gray-900">28B</p>
                  </div>
                  <div className="bg-indigo-100 rounded p-3">
                    <p className="text-2xl font-bold text-indigo-700">{total28C}</p>
                    <p className="text-xs text-gray-900">28C</p>
                  </div>
                  <div className="bg-indigo-100 rounded p-3">
                    <p className="text-2xl font-bold text-indigo-700">{total28D}</p>
                    <p className="text-xs text-gray-900">28D</p>
                  </div>
                  <div className="bg-indigo-100 rounded p-3">
                    <p className="text-2xl font-bold text-indigo-700">{total28SP}</p>
                    <p className="text-xs text-gray-900">28SP</p>
                  </div>
                </div>
              )}
            </div>

            {/* 詳細テーブル */}
            {dates.length === 0 ? (
              <div className="text-center py-8 text-gray-900">
                指定期間にデータがありません
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-900">配信日</th>
                      {TIME_SLOTS.map((slot) => (
                        <th
                          key={slot}
                          colSpan={displayTemplates.length}
                          className="px-3 py-2 text-center border-l text-gray-900"
                        >
                          {slot}
                        </th>
                      ))}
                      <th
                        colSpan={displayTemplates.length}
                        className="px-3 py-2 text-center border-l bg-gray-200 text-gray-900"
                      >
                        日計
                      </th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-1"></th>
                      {TIME_SLOTS.map((slot) =>
                        displayTemplates.map((tt, i) => (
                          <th
                            key={`${slot}-${tt}`}
                            className={`px-1 py-1 text-center text-xs ${i === 0 ? "border-l" : ""}`}
                          >
                            <span className={tt === "B" ? "text-orange-600" : tt.startsWith("28") ? "text-indigo-600" : "text-green-600"}>{tt}</span>
                          </th>
                        ))
                      )}
                      {displayTemplates.map((tt, i) => (
                        <th
                          key={`total-${tt}`}
                          className={`px-1 py-1 text-center text-xs bg-gray-100 ${i === 0 ? "border-l" : ""}`}
                        >
                          <span className={tt === "B" ? "text-orange-600" : tt.startsWith("28") ? "text-indigo-600" : "text-green-600"}>{tt}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => {
                      const dayTotals: Record<string, number> = {};
                      displayTemplates.forEach((tt) => (dayTotals[tt] = 0));

                      return (
                        <tr key={date} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{date}</td>
                          {TIME_SLOTS.map((slot) =>
                            displayTemplates.map((tt, i) => {
                              const count = countMap.get(`${date}-${slot}-${tt}`) || 0;
                              dayTotals[tt] += count;
                              return (
                                <td
                                  key={`${date}-${slot}-${tt}`}
                                  className={`px-1 py-2 text-center ${i === 0 ? "border-l" : ""} ${tt === "B" ? "text-orange-700" : tt.startsWith("28") ? "text-indigo-700" : "text-green-700"}`}
                                >
                                  {count || "-"}
                                </td>
                              );
                            })
                          )}
                          {displayTemplates.map((tt, i) => (
                            <td
                              key={`${date}-total-${tt}`}
                              className={`px-1 py-2 text-center bg-gray-50 font-medium ${i === 0 ? "border-l" : ""} ${tt === "B" ? "text-orange-700" : tt.startsWith("28") ? "text-indigo-700" : "text-green-700"}`}
                            >
                              {dayTotals[tt]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 卒年対比セクション */}
            {cohortSummary && (
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <h2 className="text-lg font-semibold mb-3 text-gray-900">卒年対比（指定期間）</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mb-4">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-900">指標</th>
                        <th className="px-3 py-2 text-right text-gray-900">27卒</th>
                        <th className="px-3 py-2 text-right text-gray-900">28卒</th>
                        <th className="px-3 py-2 text-right text-gray-900">対比</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2 text-gray-900">送信件数</td>
                        <td className="px-3 py-2 text-right text-gray-900">{sent27.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{sent28.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{diffPct(sent27, sent28)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 text-gray-900">オファー承諾</td>
                        <td className="px-3 py-2 text-right text-gray-900">{approved27.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{approved28.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{diffPct(approved27, approved28)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 text-gray-900">承諾率</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatPct(rate(approved27, sent27))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatPct(rate(approved28, sent28))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {diffPt(rate(approved27, sent27), rate(approved28, sent28))}
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 text-gray-900">開封率</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatPct(rate(opened27, sent27))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatPct(rate(opened28, sent28))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {diffPt(rate(opened27, sent27), rate(opened28, sent28))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-sm font-semibold mt-4 mb-2 text-gray-900">パターン別内訳</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs font-bold text-green-800 mb-2">27卒</p>
                    <ul className="text-sm space-y-1 text-gray-900">
                      <li>A1: {sent27A1} <span className="text-gray-600">（承諾 {approved27A1}）</span></li>
                      <li>A2: {sent27A2} <span className="text-gray-600">（承諾 {approved27A2}）</span></li>
                      <li>A3: {sent27A3} <span className="text-gray-600">（承諾 {approved27A3}）</span></li>
                      <li>B : {sent27B} <span className="text-gray-600">（承諾 {approved27B}）</span></li>
                    </ul>
                  </div>
                  <div className="bg-indigo-50 rounded p-3">
                    <p className="text-xs font-bold text-indigo-800 mb-2">28卒</p>
                    <ul className="text-sm space-y-1 text-gray-900">
                      <li>28A: {sent28A} <span className="text-gray-600">（承諾 {approved28A}）</span></li>
                      <li>28B: {sent28B} <span className="text-gray-600">（承諾 {approved28B}）</span></li>
                      <li>28C: {sent28C} <span className="text-gray-600">（承諾 {approved28C}）</span></li>
                      <li>28D: {sent28D} <span className="text-gray-600">（承諾 {approved28D}）</span></li>
                      <li>28SP: {sent28SP} <span className="text-gray-600">（承諾 {approved28SP}）</span></li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  ※「対比」列は (28卒 - 27卒) / 27卒。pt は率の差分（百分率ポイント）。
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
