import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: 配信集計（配信日×時間帯×テンプレ種別）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sendDateFrom = searchParams.get("sendDateFrom");
    const sendDateTo = searchParams.get("sendDateTo");
    const cohortYear = searchParams.get("cohortYear");

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      sendDate: { gte: fromDate, lte: toDate },
    };
    if (cohortYear === "27" || cohortYear === "28") {
      where.cohortYear = cohortYear;
    }

    // GROUP BY でカウント（cohortYear 別に集計するため by に含める）
    const rows = await prisma.delivery.groupBy({
      by: ["sendDate", "timeSlot", "templateType", "cohortYear"],
      where,
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
      cohortYear: row.cohortYear,
      count: row._count.id,
    }));

    // 卒年対比用の追加集計（承諾・開封）
    const cohortBreakdown = await prisma.delivery.groupBy({
      by: ["cohortYear", "templateType"],
      where: {
        sendDate: { gte: fromDate, lte: toDate },
      },
      _count: { id: true },
    });

    const approvedBreakdown = await prisma.delivery.groupBy({
      by: ["cohortYear", "templateType"],
      where: {
        sendDate: { gte: fromDate, lte: toDate },
        offerStatus: { in: ["approved", "applied"] },
      },
      _count: { id: true },
    });

    const openedBreakdown = await prisma.delivery.groupBy({
      by: ["cohortYear"],
      where: {
        sendDate: { gte: fromDate, lte: toDate },
        openStatus: "opened",
      },
      _count: { id: true },
    });

    const cohortSummary = {
      sent: cohortBreakdown.map((r) => ({
        cohortYear: r.cohortYear,
        templateType: r.templateType,
        count: r._count.id,
      })),
      approved: approvedBreakdown.map((r) => ({
        cohortYear: r.cohortYear,
        templateType: r.templateType,
        count: r._count.id,
      })),
      opened: openedBreakdown.map((r) => ({
        cohortYear: r.cohortYear,
        count: r._count.id,
      })),
    };

    return NextResponse.json({ rows: result, cohortSummary });
  } catch (error) {
    console.error("GET /api/analytics/deliveries error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
