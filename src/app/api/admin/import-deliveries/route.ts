import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getJSTDate, getTimeSlot } from "@/lib/time-utils";
import { extractStudentId7, extractLastLoginAt } from "@/lib/extraction-utils";
import crypto from "crypto";

// staging環境のみ有効
const IS_STAGING = process.env.NEXT_PUBLIC_APP_ENV === "staging";

interface ImportRecord {
  sentAt?: string;
  timestamp?: string;
  createdAt?: string;
  pattern?: string;
  templateType?: string;
  finalMessage?: string;
  generatedMessage?: string;
  sourceText?: string;
  pasteText?: string;
  studentId7?: string;
  lastLoginAt?: string;
  offerStatus?: string;
  notes?: string;
}

// 重複チェック用ハッシュ生成
function generateHash(text: string): string {
  return crypto.createHash("md5").update(text.slice(0, 200)).digest("hex").slice(0, 16);
}

// POST: staging DBへ一括投入（管理用）
export async function POST(request: NextRequest) {
  // staging環境のみ許可
  if (!IS_STAGING) {
    return NextResponse.json(
      { error: "この機能はstaging環境でのみ利用可能です" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { records } = body as { records: ImportRecord[] };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "records 配列は必須です" },
        { status: 400 }
      );
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // 既存レコードの重複チェック用キーを取得
    const existingDeliveries = await prisma.delivery.findMany({
      select: { sentAt: true, finalMessage: true },
    });
    const existingKeys = new Set(
      existingDeliveries.map((d) => `${d.sentAt.toISOString()}-${generateHash(d.finalMessage)}`)
    );

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // 日時を取得（優先度: sentAt > timestamp > createdAt）
        const sentAtStr = record.sentAt || record.timestamp || record.createdAt;
        if (!sentAtStr) {
          errors.push(`Record ${i}: 日時が見つかりません`);
          skipped++;
          continue;
        }

        const sentAt = new Date(sentAtStr);
        if (isNaN(sentAt.getTime())) {
          errors.push(`Record ${i}: 日時の形式が不正です`);
          skipped++;
          continue;
        }

        // テンプレート種別を取得
        const templateType = record.templateType || record.pattern;
        if (!templateType || !["A", "B"].includes(templateType)) {
          errors.push(`Record ${i}: templateType が不正です`);
          skipped++;
          continue;
        }

        // 最終文を取得
        const finalMessage = record.finalMessage || record.generatedMessage;
        if (!finalMessage) {
          errors.push(`Record ${i}: finalMessage が見つかりません`);
          skipped++;
          continue;
        }

        // 重複チェック
        const dedupeKey = `${sentAt.toISOString()}-${generateHash(finalMessage)}`;
        if (existingKeys.has(dedupeKey)) {
          skipped++;
          continue;
        }

        // sourceText を取得
        const sourceText = record.sourceText || record.pasteText || null;

        // 学生ID・ログイン日時を抽出
        let studentId7 = record.studentId7 || null;
        let lastLoginAt: Date | null = record.lastLoginAt ? new Date(record.lastLoginAt) : null;

        if (!studentId7 && sourceText) {
          studentId7 = extractStudentId7(sourceText);
        }
        if (!lastLoginAt && sourceText) {
          lastLoginAt = extractLastLoginAt(sourceText);
        }

        // JST基準で send_date と time_slot を決定
        const sendDate = getJSTDate(sentAt);
        const timeSlot = getTimeSlot(sentAt);

        // DB挿入
        await prisma.delivery.create({
          data: {
            sentAt,
            sendDate: new Date(sendDate),
            timeSlot,
            templateType,
            finalMessage,
            sourceText,
            studentId7,
            lastLoginAt,
            offerStatus: record.offerStatus || "none",
            notes: record.notes || null,
          },
        });

        existingKeys.add(dedupeKey);
        inserted++;
      } catch (err) {
        errors.push(`Record ${i}: ${err instanceof Error ? err.message : "不明なエラー"}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: records.length,
      errors: errors.slice(0, 10), // 最初の10件のみ
    });
  } catch (error) {
    console.error("POST /api/admin/import-deliveries error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
