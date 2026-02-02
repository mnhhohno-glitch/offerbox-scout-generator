import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_INSTRUCTION = `あなたは新卒スカウト文作成の編集者です。
必ず日本語で出力してください。
個人特定情報（氏名・住所・電話番号・メールアドレス・学籍番号・SNS ID等）を出力に含めません。
事実不明の創作はしません（入力テキストにない経験・実績は書かない）。
誇張表現（例：必ず成功、トップレベル等）は避けます。
「」（かぎ括弧）は使わない。
**（アスタリスク装飾）は使わない。
出力は必ずJSONのみで、指定キー以外は出力しません。
生成対象は冒頭パート（opening_message）のみです。会社紹介などの固定文は生成しないでください。`;

const USER_INSTRUCTION_TEMPLATE = `【タスク】
以下のOfferBox貼り付けテキストから、スカウト文の冒頭メッセージ（opening_message）のみを生成してください。
会社紹介や福利厚生などの固定文は生成しないでください（アプリ側で追加します）。

【文章構成（この順番で書く）】
1. 冒頭で本人の強みを1文で要約する
2. その根拠となる具体エピソードを1〜2文で説明（入力テキストから拾う）
3. 学生の良い点を具体的に褒める
4. 当社（HR業界、人材支援）との親和性を示す接続文
5. 必ず「ぜひ一度お話したくご連絡しました！」で締める

【文章条件】
- 150〜200文字（最大200文字）。200文字を超えたら必ず短くする
- 具体エピソードを最低1つ含める
- 「」（かぎ括弧）は絶対に使わない
- **（アスタリスク装飾）は絶対に使わない
- 断定しすぎない自然な表現（例：〜の傾向がある方、〜な姿勢をお持ちの方 等）
- 個人特定情報は出さない
- 事実不明の創作はしない

【改行ルール（厳守）】
- 最大5行まで
- 1行あたり15〜20文字
- 読点「、」や句点「。」の直後で改行する
- 単語途中での不自然な改行は禁止

【出力例のイメージ】
周囲を巻き込みながら
主体的に行動できる方だと感じました。
サークルで新入生歓迎イベントを企画し、
例年の2倍の参加者を集めた経験からも、
目標に向けて周りを動かす力をお持ちだと拝見しました。人の可能性を広げる当社の仕事にも、その力が活かせると思い、ぜひ一度お話したくご連絡しました！

【出力】
JSONで {"opening_message":"..."} のみを返す（JSON以外の文字を出さない）。

【入力テキスト】
<<<PASTE_TEXT>>>
{pasteText}`;

// opening_messageをJSONまたはテキストから抽出
function extractOpeningMessage(text: string): string {
  // JSONとしてパース試行
  try {
    const parsed = JSON.parse(text);
    if (parsed.opening_message && typeof parsed.opening_message === "string") {
      return parsed.opening_message;
    }
  } catch {
    // JSONパース失敗時はフォールバック
  }

  // "opening_message": "..." パターンを正規表現で抽出
  const match = text.match(/"opening_message"\s*:\s*"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }

  // それでも取れない場合はテキスト全体を返す（200文字制限）
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return cleaned.slice(0, 200);
}

export async function POST(request: NextRequest) {
  try {
    const { pasteText } = await request.json();

    if (!pasteText || typeof pasteText !== "string") {
      return NextResponse.json(
        { error: "pasteText is required" },
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

    const userPrompt = USER_INSTRUCTION_TEMPLATE.replace(
      "{pasteText}",
      pasteText
    );

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
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
        responseSchema: {
          type: "object",
          properties: {
            opening_message: {
              type: "string",
            },
          },
          required: ["opening_message"],
        },
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

    // Geminiレスポンスからテキストを取得
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
    const openingMessage = extractOpeningMessage(rawText);

    // 文字数チェック（200文字超過時は切り詰め）
    const finalMessage =
      Array.from(openingMessage).length > 200
        ? Array.from(openingMessage).slice(0, 200).join("")
        : openingMessage;

    return NextResponse.json({ opening_message: finalMessage });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
