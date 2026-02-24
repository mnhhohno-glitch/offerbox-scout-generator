// JST (UTC+9) への変換ユーティリティ

export function toJST(date: Date): Date {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

export function getJSTDate(date: Date): string {
  const jst = toJST(date);
  return jst.toISOString().slice(0, 10);
}

export function getJSTHour(date: Date): number {
  const jst = toJST(date);
  return jst.getUTCHours();
}

export function getTimeSlot(date: Date): string {
  const hour = getJSTHour(date);
  if (hour >= 0 && hour <= 5) return "00-05";
  if (hour >= 6 && hour <= 11) return "06-11";
  if (hour >= 12 && hour <= 17) return "12-17";
  return "18-23";
}

export function formatJSTDateTime(date: Date): string {
  const jst = toJST(date);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}`;
}

// CSV用フォーマット (YYYY-MM-DD HH:mm)
export function formatJSTDateTimeForCSV(date: Date | null): string {
  if (!date) return "";
  const jst = toJST(date);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

// ファイル名用フォーマット (YYYYMMDD_HHmm)
export function formatJSTDateTimeForFilename(): string {
  const jst = toJST(new Date());
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}`;
}
