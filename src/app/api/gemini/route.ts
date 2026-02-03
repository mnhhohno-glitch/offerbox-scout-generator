import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// 共通のsystemInstruction
const SYSTEM_INSTRUCTION_BASE = `必ず日本語で出力してください。
個人特定情報（氏名・住所・電話番号・メールアドレス・学籍番号・学生番号・SNS ID等）を出力に含めません。
事実不明の創作はしません（入力テキストにない経験・実績は書かない）。
誇張表現（例：必ず成功、トップレベル等）は避けます。
括弧（「」）や強調記号（**）などの装飾は一切使用しません。
出力は必ずJSONのみで、指定キー以外は出力しません。
半角スペース（ASCIIスペース）を一切出力しないでください。
文章中に不要な空白を入れないでください。
「〇〇さん」「○○さん」などの呼びかけ表現は絶対に使わないでください。名前は特定できないため不要です。`;

// title生成用のsystemInstruction
const SYSTEM_INSTRUCTION_TITLE = `あなたは新卒スカウト文の見出しを作るライターです。
${SYSTEM_INSTRUCTION_BASE}`;

// opening_message生成用のsystemInstruction
const SYSTEM_INSTRUCTION_OPENING = `あなたは新卒スカウト文の「冒頭パート」だけを作るライターです。
${SYSTEM_INSTRUCTION_BASE}

【最重要ルール】
「。」（句点）ごとに改行する。
1文＝1行として書く。
冒頭パート全体で100〜150文字程度にする。

【断定表現の禁止・言い換えルール】
- 断定が強すぎる表現は禁止（例：「確信しています」「間違いなく」「必ず」「絶対に」「100%」）
- 自然体で柔らかい表現に言い換えること
- 推測・印象表現を優先すること（例：「〜と感じました」「〜のように拝見しました」「〜と思いました」「〜かもしれません」）
- 過度な称賛は禁止（例：「素晴らしい」「感銘を受けました」「圧倒的」「卓越した」など）

【重要】
あなたが生成するのは「冒頭パート（opening_message）」のみです。
この後ろに続く会社紹介文などの固定文はアプリ側で別途結合します。`;

// Bパターン用1文生成のsystemInstruction
const SYSTEM_INSTRUCTION_B_PROFILE = `あなたは新卒スカウト文作成のプロです。
必ず日本語で出力してください。
事実不明の創作は禁止です。
半角スペースは禁止です。
「」や**などの装飾は禁止です。
出力は必ずJSONのみで、指定キー以外は出力しません。`;

// Bパターン用1文生成のプロンプト
const B_PROFILE_LINE_TEMPLATE = `以下のスカウト文の「プロフィールを拝見し〜」の1文を、学部名に合わせて具体化してください。

【ルール】
- 出力は1文のみ（差し替え用）
- 形式は必ず以下：
  「プロフィールを拝見し、【学部名】で【一言要約】について学ばれている点に興味を持ち、ご連絡しました。」
- 【一言要約】は学部名から一般的に推測できる範囲で、短く（例：◯◯や◯◯）
- 学生は自己PRがほぼ空欄の前提なので、研究内容・経験の断定は禁止
- 「すごい」「感銘」「素晴らしい」など過度な称賛は禁止
- トーンは協調型（寄り添い・押し付けない）

【学部名】
{facultyName}

【出力形式】
JSONで {"profile_line":"..."} のみを返してください。`;

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
以下のOfferBox貼り付けテキストを読み、スカウト文の「冒頭パート」を作成してください。

【改行ルール（最重要・厳守）】
- 「。」（句点）ごとに改行する
- 1文＝1行として書く
- 「、」では改行しない

【全体の文字数】
- 冒頭パート全体で100〜150文字程度
- 3〜4文程度

【構成ルール】
- 最終行は必ず「ぜひ一度お話したくご連絡しました！」で終える

【内容ルール】
- 具体エピソードを最低1つ含める（詳しく書く）
- 冒頭で強みを要約し、その後にエピソードを入れる
- 学生の良さを具体的に言語化する

【文章トーン（重要）】
- トーンは協調型（寄り添い・押し付けない）
- 「上から目線」「評価っぽい表現」を避ける
- 人柄の断定を避ける（例：「〜な方です」より「〜な印象を受けました」）
- 推測・印象表現を使う（例：「〜と感じました」「〜のように拝見しました」）

【禁止事項】
- 「〇〇さん」などの呼びかけは禁止
- 「」** **、絵文字、半角スペースは禁止
- 個人特定情報は禁止
- 断定が強すぎる表現は禁止（例：「確信しています」「間違いなく」「必ず」「絶対に」）
- 過度な称賛は禁止（例：「素晴らしい」「感銘を受けました」「圧倒的」）

【良い例（句点で改行・柔らかい表現）】
周囲を支えながらチームを前に進める力があると感じました。
高校の球技大会でリーダーを務め、皆で成果を出した経験が印象的でした。
困難な状況でも諦めずに取り組む姿勢が伝わってきました。
人の成長を支援する当社の仕事に向いているのではと思いました。
ぜひ一度お話したくご連絡しました！

【悪い例】
- 句点で改行していない：周囲を支えながらチームを前に進める力があると感じました。高校の球技大会で...
- 断定が強い：あなたは間違いなくリーダーシップがあります。確信しています。
- 上から目線：素晴らしい経験をお持ちですね。感銘を受けました。

【出力形式】
JSONで {"opening_message":"..."} のみを返してください。
改行は \\n で表現してください。

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

// Bパターン用profile_lineをJSONまたはテキストから抽出
function extractProfileLine(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed.profile_line && typeof parsed.profile_line === "string") {
      return parsed.profile_line;
    }
  } catch {
    // JSONパース失敗時はフォールバック
  }

  const match = text.match(/"profile_line"\s*:\s*"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }

  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return cleaned.slice(0, 150);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, pasteText, facultyName } = body;

    // mode検証
    if (!mode || !["title", "opening", "b_profile_line"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be 'title', 'opening', or 'b_profile_line'" },
        { status: 400 }
      );
    }

    // b_profile_lineモードはfacultyNameのみ必要
    if (mode === "b_profile_line") {
      if (!facultyName || typeof facultyName !== "string") {
        return NextResponse.json(
          { error: "facultyName is required for b_profile_line mode" },
          { status: 400 }
        );
      }
    } else {
      // title/openingモードはpasteTextが必要
      if (!pasteText || typeof pasteText !== "string") {
        return NextResponse.json(
          { error: "pasteText is required" },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "ここにあなたのAPIキー") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    let systemInstruction: string;
    let userPrompt: string;
    let responseSchema: object;

    if (mode === "title") {
      systemInstruction = SYSTEM_INSTRUCTION_TITLE;
      userPrompt = TITLE_INSTRUCTION_TEMPLATE.replace("{pasteText}", pasteText);
      responseSchema = {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      };
    } else if (mode === "opening") {
      systemInstruction = SYSTEM_INSTRUCTION_OPENING;
      userPrompt = OPENING_INSTRUCTION_TEMPLATE.replace("{pasteText}", pasteText);
      responseSchema = {
        type: "object",
        properties: { opening_message: { type: "string" } },
        required: ["opening_message"],
      };
    } else {
      // b_profile_line
      systemInstruction = SYSTEM_INSTRUCTION_B_PROFILE;
      userPrompt = B_PROFILE_LINE_TEMPLATE.replace("{facultyName}", facultyName);
      responseSchema = {
        type: "object",
        properties: { profile_line: { type: "string" } },
        required: ["profile_line"],
      };
    }

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

    if (mode === "title") {
      const title = extractTitle(rawText);
      const finalTitle = Array.from(title).slice(0, 20).join("");
      return NextResponse.json({ title: finalTitle });
    } else if (mode === "opening") {
      const openingMessage = extractOpeningMessage(rawText);
      const finalMessage =
        Array.from(openingMessage).length > 300
          ? Array.from(openingMessage).slice(0, 300).join("")
          : openingMessage;
      return NextResponse.json({ opening_message: finalMessage });
    } else {
      // b_profile_line
      const profileLine = extractProfileLine(rawText);
      // 半角スペース除去
      const cleanedLine = profileLine.replace(/ /g, "").trim();
      return NextResponse.json({ profile_line: cleanedLine });
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
