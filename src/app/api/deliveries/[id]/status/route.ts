import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type StatusType = "none" | "approved" | "on_hold" | "cancelled";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH: 承認/保留/取消ステータス更新
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, setAt } = body;

    // ステータス検証
    const validStatuses: StatusType[] = ["none", "approved", "on_hold", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "status は none, approved, on_hold, cancelled のいずれかです" },
        { status: 400 }
      );
    }

    const timestamp = setAt ? new Date(setAt) : new Date();

    // 排他的に日時をセット
    const updateData: {
      offerStatus: StatusType;
      approvedAt: Date | null;
      onHoldAt: Date | null;
      cancelledAt: Date | null;
    } = {
      offerStatus: status,
      approvedAt: null,
      onHoldAt: null,
      cancelledAt: null,
    };

    switch (status) {
      case "approved":
        updateData.approvedAt = timestamp;
        break;
      case "on_hold":
        updateData.onHoldAt = timestamp;
        break;
      case "cancelled":
        updateData.cancelledAt = timestamp;
        break;
      // none の場合は全てnull
    }

    const delivery = await prisma.delivery.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, delivery });
  } catch (error) {
    console.error("PATCH /api/deliveries/:id/status error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
