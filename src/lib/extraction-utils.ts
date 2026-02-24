// 学生ID7桁と最終ログイン日時の抽出ユーティリティ

export function extractStudentId7(text: string): string | null {
  if (!text) return null;

  // パターン1: "ID: 1234567" や "ID：1234567"
  const pattern1 = /ID\s*[:：]?\s*(\d{7})/i;
  const match1 = text.match(pattern1);
  if (match1) return match1[1];

  // パターン2: 単独の7桁数字（最初の妥当な候補）
  const pattern2 = /\b(\d{7})\b/;
  const match2 = text.match(pattern2);
  if (match2) return match2[1];

  return null;
}

export function extractLastLoginAt(text: string): Date | null {
  if (!text) return null;

  // パターン1: "最終ログイン: 2026/02/24 15:30" などの形式
  const pattern1 =
    /(最終ログイン|ログイン日時|最終ログイン日時)\s*[:：]?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s*\d{1,2}:\d{2})/;
  const match1 = text.match(pattern1);
  if (match1) {
    const parsed = parseJSTDateTime(match1[2]);
    if (parsed) return parsed;
  }

  // パターン2: 単独の日時形式（最初の候補）
  const pattern2 = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s*\d{1,2}:\d{2})/;
  const match2 = text.match(pattern2);
  if (match2) {
    const parsed = parseJSTDateTime(match2[1]);
    if (parsed) return parsed;
  }

  return null;
}

function parseJSTDateTime(str: string): Date | null {
  try {
    // "2026/02/24 15:30" や "2026-02-24 15:30" を解析
    const normalized = str.replace(/\//g, "-").replace(/\s+/g, "T");
    // JST として解釈するため、+09:00 を付与
    const isoString = `${normalized}:00+09:00`;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
