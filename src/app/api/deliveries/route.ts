import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getJSTDate, getTimeSlot } from "@/lib/time-utils";
import { extractStudentId7, extractLastLoginAt } from "@/lib/extraction-utils";

// POST: 配信レコード作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sentAt,
      templateType,
      finalMessage,
      sourceText,
      studentId7: providedStudentId7,
      lastLoginAt: providedLastLoginAt,
    } = body;

    // 必須チェック
    if (!sentAt || !templateType || !finalMessage) {
      return NextResponse.json(
        { error: "sentAt, templateType, finalMessage は必須です" },
        { status: 400 }
      );
    }

    const sentAtDate = new Date(sentAt);
    if (isNaN(sentAtDate.getTime())) {
      return NextResponse.json(
        { error: "sentAt の形式が不正です" },
        { status: 400 }
      );
    }

    // JST基準で send_date と time_slot を決定
    const sendDate = getJSTDate(sentAtDate);
    const timeSlot = getTimeSlot(sentAtDate);

    // 学生ID・ログイン日時を抽出（未提供なら sourceText から）
    let studentId7 = providedStudentId7;
    let lastLoginAt = providedLastLoginAt ? new Date(providedLastLoginAt) : null;

    if (!studentId7 && sourceText) {
      studentId7 = extractStudentId7(sourceText);
    }
    if (!lastLoginAt && sourceText) {
      lastLoginAt = extractLastLoginAt(sourceText);
    }

    const delivery = await prisma.delivery.create({
      data: {
        sentAt: sentAtDate,
        sendDate: new Date(sendDate),
        timeSlot,
        templateType,
        finalMessage,
        sourceText: sourceText || null,
        studentId7: studentId7 || null,
        lastLoginAt: lastLoginAt || null,
        offerStatus: "none",
      },
    });

    return NextResponse.json({ id: delivery.id, success: true });
  } catch (error) {
    console.error("POST /api/deliveries error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GET: 配信履歴一覧（ページング+検索）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "50", 10));
    const offset = (page - 1) * pageSize;

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

    // 総件数
    const total = await prisma.delivery.count({ where });

    // データ取得
    const items = await prisma.delivery.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: offset,
      take: pageSize,
    });

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET /api/deliveries error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
