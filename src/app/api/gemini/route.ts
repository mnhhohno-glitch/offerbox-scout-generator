import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const JSON_INSTRUCTION = `必ずJSON形式のみで返答してください。マークダウンのコードブロック（\`\`\`json）は使用しないでください。`;

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
${SYSTEM_INSTRUCTION_BASE}
${JSON_INSTRUCTION}`;

// opening_message生成用のsystemInstruction
const SYSTEM_INSTRUCTION_OPENING = `あなたは新卒スカウト文の「個別訴求パート」だけを作るライターです。
${SYSTEM_INSTRUCTION_BASE}

【最重要ルール】
「。」（句点）ごとに改行する。
1文＝1行として書く。
原則2文でまとめる。

【重要】
あなたが生成するのは「個別訴求パート（opening_message）」のみです。
この後ろに続く会社紹介文などの固定文はアプリ側で別途結合します。
${JSON_INSTRUCTION}`;

// Bパターン用1文生成のsystemInstruction
const SYSTEM_INSTRUCTION_B_PROFILE = `あなたは新卒スカウト文作成のプロです。
必ず日本語で出力してください。
事実不明の創作は禁止です。
半角スペースは禁止です。
「」や**などの装飾は禁止です。
「感銘しました」「非常に魅力的でした」「素晴らしいと思いました」は使用不可です。
「自己PRを拝見し」「ご経験を拝見し」は使用不可です。
過度な称賛（「素晴らしい」「圧倒的」「卓越した」など）は禁止です。
出力は必ずJSONのみで、指定キー以外は出力しません。
${JSON_INSTRUCTION}`;

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

// title生成用のプロンプト（Aパターン用トップ訴求）
const TITLE_INSTRUCTION_TEMPLATE = `【タスク】
以下のOfferBox貼り付けテキストを読み、スカウト文のトップ訴求（title）を作成してください。
※このtitleはアプリ側でパターン別プレフィックス（【一次面接確約】等）と結合されます。
　あなたが生成するのは訴求部分のみです。

【要件】
- 学生の入力情報全体（自己PR・活動歴・志向・資格・価値観など）を総合的に読み取る
- 人物像が伝わる一言にする
- 末尾は必ず「〇〇なあなたへ」の形式とする（「様」は不要・絶対に付けない）
- 15〜25文字程度
- 「自己PRを拝見し」「ご経験を拝見し」は使用不可
- 「感銘しました」「非常に魅力的でした」「素晴らしいと思いました」は使用不可
- 「」は禁止
- ** **は禁止
- 半角スペースは禁止
- 絵文字は禁止

【例】
- 周囲を見ながら主体的に動けるあなたへ
- 人の成長に寄り添えるあなたへ
- 粘り強く挑戦し続けるあなたへ
- チームの力を引き出せるあなたへ

【出力形式】
JSONで {"title":"..."} のみを返してください。
JSON以外の文字は一切出さないでください。

【入力テキスト】
<<<PASTE_TEXT>>>
{pasteText}`;

// opening_message生成用のプロンプト（原則2文構成）
const OPENING_INSTRUCTION_TEMPLATE = `【タスク】
以下のOfferBox貼り付けテキストを読み、学生の全情報を踏まえた個別訴求を作成してください。

【改行ルール（最重要・厳守）】
- 「。」（句点）ごとに改行する
- 1文＝1行として書く
- 「、」では改行しない

■ 情報の使い方
自己PRだけではなく、プロフィール、学生時代の取り組み、アルバイト、
部活動、研究、資格、志向、価値観など、入力された全情報をもとに総合的に作成する。

■ 構成ルール（原則2文）
・1文目：学生の行動・役割・取り組み内容を具体的に要約し、
         そこから読み取れる強みや人物像まで一文で書く
・2文目：その強みの具体的な中身を補足しながら、
         当社の仕事との接点につなげて締める
・「強みの具体化」と「当社との接点」は分断せず、
  必ず2文目の中で一つの流れとしてつなげること
・褒め言葉を並べるのではなく、「事実→強み→当社との接点」の流れで自然な文章にする

■ 文末ルール
・文末表現は必ず変化をつけること
・「〜ました」「〜思いました」「〜と拝見しました」を連続で繰り返さない
・推奨する文末の形：
  1文目：「〜と感じました」
  2文目：「〜と考え、ご連絡しました」

■ 禁止事項
・3文すべてを独立した文章にすること
・2文目で評価を述べ、3文目で別途会社との接点を書くこと
・「〜ました」「〜思いました」「〜と拝見しました」を連続使用すること
・抽象的な称賛だけで終わること
・「感銘しました」「非常に魅力的でした」「素晴らしいと思いました」などAI感の強い表現を使用すること
・「自己PRを拝見し」「ご経験を拝見し」を使用すること
・「〇〇さん」などの呼びかけ
・「」** **、絵文字、半角スペース
・個人特定情報
・断定が強すぎる表現（例：「確信しています」「間違いなく」「必ず」「絶対に」）

■ 追加禁止事項
・学生の希望職種・希望業界・希望企業規模・志向（大企業志向・ベンチャー志向等）に言及しないこと
・「当社の〇〇職で」「マーケティング職として」など特定の職種名を含めないこと
・「最適なソリューションを提供する当社で」など、曖昧で実態と乖離したキャッチコピー的な表現を禁止する
・「組織や制度が出来上がった環境で」「既存の枠組みの中で」など、学生の企業規模志向を示す表現を禁止する
・当社の事業や仕事内容への接点は「人に向き合う仕事」「誰かの成長に関わる仕事」など
  業種・職種を限定しない表現にとどめること

■ 必須事項
・原則2文でまとめること
・1文目は学生理解（行動・強み・人物像）を書くこと
・2文目は強みの具体化と当社との接点を一文でつなげること

【良い例（2文構成・句点で改行・文末変化あり）】
塾講師として生徒一人ひとりに合わせた指導計画を策定し、相手の状況を丁寧に把握しながら最適な手段を考える力をお持ちの方だと感じました。
その向き合い方は、一人ひとりの強みを見つけて活躍環境を整えていく当社の仕事に通じるものがあると考え、ご連絡しました。

【悪い例】
- 3文に分離：〜と拝見しました。〜と感じました。〜と思いました。
- 文末が同じ：〜と感じました。〜と感じました。
- 抽象的な賞賛のみ：素晴らしい経験をお持ちですね。感銘を受けました。

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

async function callWithRetry(
  callFn: () => Promise<Anthropic.Message>,
  maxRetries = 3
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callFn();
    } catch (error: unknown) {
      const status =
        error instanceof Anthropic.APIError ? error.status : undefined;
      if ((status === 429 || status === 529) && attempt < maxRetries) {
        const waitMs = 3000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Unexpected retry loop exit");
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    let systemInstruction: string;
    let userPrompt: string;

    if (mode === "title") {
      systemInstruction = SYSTEM_INSTRUCTION_TITLE;
      userPrompt = TITLE_INSTRUCTION_TEMPLATE.replace("{pasteText}", pasteText);
    } else if (mode === "opening") {
      systemInstruction = SYSTEM_INSTRUCTION_OPENING;
      userPrompt = OPENING_INSTRUCTION_TEMPLATE.replace("{pasteText}", pasteText);
    } else {
      // b_profile_line
      systemInstruction = SYSTEM_INSTRUCTION_B_PROFILE;
      userPrompt = B_PROFILE_LINE_TEMPLATE.replace("{facultyName}", facultyName);
    }

    const message = await callWithRetry(() =>
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemInstruction,
        messages: [{ role: "user", content: userPrompt }],
      })
    );

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (!rawText) {
      return NextResponse.json(
        { error: "No response from Claude" },
        { status: 500 }
      );
    }

    if (mode === "title") {
      const title = extractTitle(rawText).replace(/\\n/g, "\n");
      const finalTitle = Array.from(title).slice(0, 30).join("");
      return NextResponse.json({ title: finalTitle });
    } else if (mode === "opening") {
      const openingMessage = extractOpeningMessage(rawText).replace(/\\n/g, "\n");
      const finalMessage =
        Array.from(openingMessage).length > 300
          ? Array.from(openingMessage).slice(0, 300).join("")
          : openingMessage;
      return NextResponse.json({ opening_message: finalMessage });
    } else {
      // b_profile_line
      const profileLine = extractProfileLine(rawText).replace(/\\n/g, "\n");
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
