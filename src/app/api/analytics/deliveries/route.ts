import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: 配信集計（配信日×時間帯×テンプレ種別）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sendDateFrom = searchParams.get("sendDateFrom");
    const sendDateTo = searchParams.get("sendDateTo");

    // 期間指定必須
    if (!sendDateFrom || !sendDateTo) {
      return NextResponse.json(
        { error: "sendDateFrom と sendDateTo は必須です" },
        { status: 400 }
      );
    }

    const fromDate = new Date(sendDateFrom);
    const toDate = new Date(sendDateTo);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "日付の形式が不正です" },
        { status: 400 }
      );
    }

    // GROUP BY でカウント
    const rows = await prisma.delivery.groupBy({
      by: ["sendDate", "timeSlot", "templateType"],
      where: {
        sendDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: [
        { sendDate: "desc" },
        { timeSlot: "asc" },
        { templateType: "asc" },
      ],
    });

    // レスポンス形式に変換
    const result = rows.map((row) => ({
      sendDate: row.sendDate.toISOString().slice(0, 10),
      timeSlot: row.timeSlot,
      templateType: row.templateType,
      count: row._count.id,
    }));

    return NextResponse.json({ rows: result });
  } catch (error) {
    console.error("GET /api/analytics/deliveries error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
