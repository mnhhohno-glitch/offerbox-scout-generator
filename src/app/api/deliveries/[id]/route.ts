import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: 単一配信レコード取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      return NextResponse.json({ error: "レコードが見つかりません" }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("GET /api/deliveries/:id error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// notesに格納する拡張フィールドの型
interface NotesData {
  facultyDepartment?: string;
  prefecture?: string;
  graduationYear?: string;
  major?: string;
}

// PATCH: 配信レコードの編集
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      finalMessage,
      studentId7,
      universityName,
      gender,
      templateType,
      facultyDepartment,
      prefecture,
      graduationYear,
      major,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, unknown> = {};
    if (finalMessage !== undefined) updateData.finalMessage = finalMessage;
    if (studentId7 !== undefined) updateData.studentId7 = studentId7 || null;
    if (universityName !== undefined) updateData.universityName = universityName || null;
    if (gender !== undefined) updateData.gender = (gender === "male" || gender === "female") ? gender : null;
    if (templateType !== undefined) updateData.templateType = templateType;

    if (facultyDepartment !== undefined || prefecture !== undefined || graduationYear !== undefined || major !== undefined) {
      const existing = await prisma.delivery.findUnique({ where: { id }, select: { notes: true } });
      let notesObj: NotesData = {};
      try {
        if (existing?.notes) notesObj = JSON.parse(existing.notes) as NotesData;
      } catch {
        /* ignore */
      }
      if (facultyDepartment !== undefined) notesObj.facultyDepartment = facultyDepartment || "";
      if (prefecture !== undefined) notesObj.prefecture = prefecture || "";
      if (graduationYear !== undefined) notesObj.graduationYear = graduationYear || "";
      if (major !== undefined) notesObj.major = major || "";
      updateData.notes = JSON.stringify(notesObj);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    const delivery = await prisma.delivery.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("PATCH /api/deliveries/:id error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// DELETE: 配信レコード削除
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.delivery.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deliveries/:id error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
