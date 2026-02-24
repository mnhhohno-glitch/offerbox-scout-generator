import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatJSTDateTimeForCSV, formatJSTDateTimeForFilename } from "@/lib/time-utils";

// 定数
const MAX_EXPORT_ROWS = 20000;
const CSV_BOM = "\uFEFF";

// ステータスラベル変換
function getStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "承認";
    case "on_hold":
      return "保留";
    case "cancelled":
      return "取消";
    default:
      return "未処理";
  }
}

// ステータスに応じた日付を取得
function getStatusDate(
  status: string,
  approvedAt: Date | null,
  onHoldAt: Date | null,
  cancelledAt: Date | null
): Date | null {
  switch (status) {
    case "approved":
      return approvedAt;
    case "on_hold":
      return onHoldAt;
    case "cancelled":
      return cancelledAt;
    default:
      return null;
  }
}

// RFC4180準拠のCSVフィールドエスケープ
function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // カンマ、ダブルクォート、改行を含む場合はクォートで囲む
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    // 内部の " は "" にエスケープ
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// CSV行を生成（CRLF）
function createCSVRow(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCSVField).join(",") + "\r\n";
}

// GET: 配信履歴CSVエクスポート
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // フィルタパラメータ
    const sendDateFrom = searchParams.get("sendDateFrom");
    const sendDateTo = searchParams.get("sendDateTo");
    const timeSlot = searchParams.get("timeSlot");
    const templateType = searchParams.get("templateType");
    const studentId7 = searchParams.get("studentId7");
    const lastLoginFrom = searchParams.get("lastLoginFrom");
    const lastLoginTo = searchParams.get("lastLoginTo");
    const offerStatus = searchParams.get("offerStatus");

    // WHERE条件を構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (sendDateFrom || sendDateTo) {
      where.sendDate = {};
      if (sendDateFrom) where.sendDate.gte = new Date(sendDateFrom);
      if (sendDateTo) where.sendDate.lte = new Date(sendDateTo);
    }

    if (timeSlot) {
      where.timeSlot = timeSlot;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    if (studentId7) {
      where.studentId7 = { contains: studentId7 };
    }

    if (lastLoginFrom || lastLoginTo) {
      where.lastLoginAt = {};
      if (lastLoginFrom) where.lastLoginAt.gte = new Date(lastLoginFrom);
      if (lastLoginTo) where.lastLoginAt.lte = new Date(lastLoginTo);
    }

    if (offerStatus) {
      where.offerStatus = offerStatus;
    }

    // 件数チェック
    const total = await prisma.delivery.count({ where });

    if (total > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          error: `エクスポート件数が上限（${MAX_EXPORT_ROWS.toLocaleString()}件）を超えています。検索条件を絞り込んでください。（現在: ${total.toLocaleString()}件）`,
        },
        { status: 400 }
      );
    }

    // データ取得（全件）
    const deliveries = await prisma.delivery.findMany({
      where,
      orderBy: { sentAt: "desc" },
    });

    // CSVヘッダー
    const headers = [
      "配信日時(JST)",
      "配信日",
      "時間帯",
      "テンプレ",
      "学生ID(7桁)",
      "最終ログイン日時(JST)",
      "オファー状態",
      "状態日付(JST)",
      "スカウト文",
    ];

    // CSV生成（BOM + ヘッダー + データ行）
    let csv = CSV_BOM;
    csv += createCSVRow(headers);

    for (const d of deliveries) {
      const statusDate = getStatusDate(d.offerStatus, d.approvedAt, d.onHoldAt, d.cancelledAt);
      const row = [
        formatJSTDateTimeForCSV(d.sentAt),
        d.sendDate.toISOString().slice(0, 10),
        d.timeSlot,
        d.templateType,
        d.studentId7,
        formatJSTDateTimeForCSV(d.lastLoginAt),
        getStatusLabel(d.offerStatus),
        formatJSTDateTimeForCSV(statusDate),
        d.finalMessage,
      ];
      csv += createCSVRow(row);
    }

    // ファイル名
    const filename = `deliveries_${formatJSTDateTimeForFilename()}.csv`;

    // レスポンス
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/deliveries/export.csv error:", error);
    return NextResponse.json(
      { error: "CSVエクスポートに失敗しました" },
      { status: 500 }
    );
  }
}
