// 学生ID7桁、最終ログイン日時、大学名、性別の抽出ユーティリティ

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

// 大学名の抽出
export function extractUniversityName(text: string): string | null {
  if (!text) return null;

  // パターン1: "大学名: ○○大学" や "大学：○○大学"
  const pattern1 = /(大学名|学校名)\s*[:：]\s*([^\n\r]+)/;
  const match1 = text.match(pattern1);
  if (match1) {
    return match1[2].trim();
  }

  // パターン2: "○○大学" という形式（大学で終わる文字列）
  const pattern2 = /([^\s\n\r]+大学)/;
  const match2 = text.match(pattern2);
  if (match2) {
    return match2[1].trim();
  }

  return null;
}

// 性別の抽出
export type Gender = "male" | "female" | "other" | "unknown";

export function extractGender(text: string): Gender {
  if (!text) return "unknown";

  // パターン: "性別: 男性" や "性別：女性"
  const pattern = /(性別)\s*[:：]?\s*(男性|女性|その他|男|女)/;
  const match = text.match(pattern);
  
  if (match) {
    const value = match[2];
    if (value === "男性" || value === "男") return "male";
    if (value === "女性" || value === "女") return "female";
    if (value === "その他") return "other";
  }

  return "unknown";
}

// 性別ラベル変換
export function getGenderLabel(gender: string | null): string {
  switch (gender) {
    case "male":
      return "男性";
    case "female":
      return "女性";
    case "other":
      return "その他";
    case "unknown":
      return "不明";
    default:
      return gender ? String(gender) : "-";
  }
}

// 学部の抽出
export function extractFacultyName(text: string): string | null {
  if (!text) return null;

  // パターン1: "学部: ○○学部" や "学部：○○学部"
  const pattern1 = /学部\s*[:：]\s*([^\n\r]+)/;
  const match1 = text.match(pattern1);
  if (match1) {
    return match1[1].trim();
  }

  // パターン2: "○○学部" という形式（学部で終わる文字列、大学を含まない）
  const pattern2 = /([^\s\n\r大学]+学部)/;
  const match2 = text.match(pattern2);
  if (match2) {
    return match2[1].trim();
  }

  return null;
}

// 学科の抽出
export function extractDepartmentName(text: string): string | null {
  if (!text) return null;

  // パターン1: "学科: ○○学科" や "学科：○○学科"
  const pattern1 = /学科\s*[:：]\s*([^\n\r]+)/;
  const match1 = text.match(pattern1);
  if (match1) {
    return match1[1].trim();
  }

  // パターン2: "○○学科" という形式（学科で終わる文字列）
  const pattern2 = /([^\s\n\r]+学科)/;
  const match2 = text.match(pattern2);
  if (match2) {
    return match2[1].trim();
  }

  return null;
}

// 都道府県の抽出
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

export function extractPrefecture(text: string): string | null {
  if (!text) return null;

  // パターン1: "都道府県: ○○県" など
  const pattern1 = /(都道府県|出身地|居住地|住所)\s*[:：]\s*([^\n\r]+)/;
  const match1 = text.match(pattern1);
  if (match1) {
    const value = match1[2].trim();
    for (const pref of PREFECTURES) {
      if (value.includes(pref)) {
        return pref;
      }
    }
  }

  // パターン2: テキスト内の都道府県名を直接検索
  for (const pref of PREFECTURES) {
    if (text.includes(pref)) {
      return pref;
    }
  }

  return null;
}

// 卒業年度の抽出（例: 2026年卒, 26卒, 卒業予定: 2026年3月）
export function extractGraduationYear(text: string): string | null {
  if (!text) return null;

  // パターン1: "2026年卒" "2027年卒業"
  const pattern1 = /(\d{4})年卒(業)?/;
  const m1 = text.match(pattern1);
  if (m1) return `${m1[1]}卒`;

  // パターン2: "26卒" "27卒"（西暦下2桁）
  const pattern2 = /(\d{2})卒/;
  const m2 = text.match(pattern2);
  if (m2) {
    const yy = parseInt(m2[1], 10);
    const year = yy >= 0 && yy <= 50 ? 2000 + yy : 1900 + yy;
    return `${year}卒`;
  }

  // パターン3: "卒業予定: 2026年3月" "卒業：2027年"
  const pattern3 = /卒業(予定)?\s*[:：]?\s*(\d{4})年/;
  const m3 = text.match(pattern3);
  if (m3) return `${m3[2]}卒`;

  return null;
}
