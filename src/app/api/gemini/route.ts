import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// 共通のsystemInstruction（半角スペース禁止を追加）
const SYSTEM_INSTRUCTION_BASE = `必ず日本語で出力してください。
個人特定情報（氏名・住所・電話番号・メールアドレス・学籍番号・学生番号・SNS ID等）を出力に含めません。
事実不明の創作はしません（入力テキストにない経験・実績は書かない）。
誇張表現（例：必ず成功、トップレベル等）は避けます。
括弧（「」）や強調記号（**）などの装飾は一切使用しません。
出力は必ずJSONのみで、指定キー以外は出力しません。
半角スペース（ASCIIスペース）を一切出力しないでください。
文章中に不要な空白を入れないでください。`;

// title生成用のsystemInstruction
const SYSTEM_INSTRUCTION_TITLE = `あなたは新卒スカウト文の見出しを作るライターです。
${SYSTEM_INSTRUCTION_BASE}`;

// opening_message生成用のsystemInstruction
const SYSTEM_INSTRUCTION_OPENING = `あなたは新卒スカウト文の「冒頭パート」だけを作るライターです。
${SYSTEM_INSTRUCTION_BASE}

【重要】
あなたが生成するのは「冒頭パート（opening_message）」のみです。
この後ろに続く会社紹介文などの固定文はアプリ側で別途結合します。
固定文の改行や表記を変更することは一切ありません（あなたは固定文を生成しません）。`;

// title生成用のプロンプト（Aパターン用、20文字厳守）
const TITLE_INSTRUCTION_TEMPLATE = `【タスク】
以下のOfferBox貼り付けテキストを読み、スカウト文の見出し（title）を作成してください。

【要件】
- ちょうど20文字（厳守）
- 末尾は必ず「あなたへ」で終わる
- 学生の特徴を褒める（刺さる）見出しにする
- 「」は禁止
- ** **は禁止
- 半角スペースは禁止
- 絵文字は禁止

【例】
- 支える力が強みのあなたへ
- 周囲を巻き込めるあなたへ
- 挑戦を続ける姿勢のあなたへ

【出力形式】
JSONで {"title":"..."} のみを返してください。
JSON以外の文字は一切出さないでください。

【入力テキスト】
<<<PASTE_TEXT>>>
{pasteText}`;

// opening_message生成用のプロンプト
const OPENING_INSTRUCTION_TEMPLATE = `【タスク】
以下のOfferBox貼り付けテキストを読み、スカウト文の「冒頭パート」だけを作成してください。
※この後ろに続く会社紹介文などは固定で別に付けるため、あなたは冒頭パートのみ作ります。

【内容要件】
- 文字数：200〜300文字（最大300文字）
- 具体エピソードを最低1つ含める（例：アルバイト/ゼミ/部活など）
- 冒頭で強みを要約し、その後に根拠となるエピソードを入れる
- 学生の良い点が刺さるように、良さを具体的に言語化する
- 断定しすぎない自然な表現にする
- 最終行は必ず「ぜひ一度お話したくご連絡しました！」で終える（必須）
- 個人特定情報（氏名/番号/住所/連絡先/SNS等）を出さない
- 事実不明の創作はしない

【表記ルール（禁止事項）】
- 「」は禁止
- ** **は禁止
- 絵文字は禁止
- 過剰な記号装飾は禁止
- 学生番号などのIDは入れない
- 半角スペースは禁止

【改行ルール（最重要：校正を意識して自然に改行）】
- 最大6行
- 1行は30文字前後（20文字強制改行は禁止）
- 改行は必ず「、」「。」の直後を優先（文章として自然な位置）
- 文節や単語の途中で改行しない
- 不自然な空白を入れない
- 文字数の都合で文章が不自然になる場合は、言い換えて自然な日本語を維持する

【出力形式】
JSONで {"opening_message":"..."} のみを返してください。
JSON以外の文字（説明、前置き、コードブロック等）は一切出さないでください。

【入力テキスト】
<<<PASTE_TEXT>>>
{pasteText}`;

// titleをJSONまたはテキストから抽出
function extractTitle(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed.title && typeof parsed.title === "string") {
      return parsed.title;
    }
  } catch {
    // JSONパース失敗時はフォールバック
  }

  const match = text.match(/"title"\s*:\s*"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }

  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return cleaned.slice(0, 20);
}

// opening_messageをJSONまたはテキストから抽出
function extractOpeningMessage(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed.opening_message && typeof parsed.opening_message === "string") {
      return parsed.opening_message;
    }
  } catch {
    // JSONパース失敗時はフォールバック
  }

  const match = text.match(/"opening_message"\s*:\s*"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }

  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return cleaned.slice(0, 300);
}

export async function POST(request: NextRequest) {
  try {
    const { mode, pasteText } = await request.json();

    if (!pasteText || typeof pasteText !== "string") {
      return NextResponse.json(
        { error: "pasteText is required" },
        { status: 400 }
      );
    }

    if (!mode || (mode !== "title" && mode !== "opening")) {
      return NextResponse.json(
        { error: "mode must be 'title' or 'opening'" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "ここにあなたのAPIキー") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const isTitle = mode === "title";
    const systemInstruction = isTitle
      ? SYSTEM_INSTRUCTION_TITLE
      : SYSTEM_INSTRUCTION_OPENING;
    const userPromptTemplate = isTitle
      ? TITLE_INSTRUCTION_TEMPLATE
      : OPENING_INSTRUCTION_TEMPLATE;
    const userPrompt = userPromptTemplate.replace("{pasteText}", pasteText);

    const responseSchema = isTitle
      ? {
          type: "object",
          properties: { title: { type: "string" } },
          required: ["title"],
        }
      : {
          type: "object",
          properties: { opening_message: { type: "string" } },
          required: ["opening_message"],
        };

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
        responseSchema,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: "No response from Gemini" },
        { status: 500 }
      );
    }

    const content = candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      return NextResponse.json(
        { error: "Invalid response structure from Gemini" },
        { status: 500 }
      );
    }

    const rawText = content.parts[0].text;

    if (isTitle) {
      const title = extractTitle(rawText);
      // 20文字に切り詰め（保険）
      const finalTitle = Array.from(title).slice(0, 20).join("");
      return NextResponse.json({ title: finalTitle });
    } else {
      const openingMessage = extractOpeningMessage(rawText);
      // 300文字に切り詰め（保険）
      const finalMessage =
        Array.from(openingMessage).length > 300
          ? Array.from(openingMessage).slice(0, 300).join("")
          : openingMessage;
      return NextResponse.json({ opening_message: finalMessage });
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
