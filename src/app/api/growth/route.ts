import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const caseId = searchParams.get("caseId");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (caseId) where.familyCaseId = caseId;
    if (category) where.category = category;

    const records = await prisma.growthRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { recordedAt: "asc" },
    });

    // Group by category and user for chart-friendly format
    const grouped: Record<string, { name: string; data: { date: string; score: number }[] }[]> = {};
    for (const record of records) {
      const key = record.category;
      if (!grouped[key]) grouped[key] = [];
      const userName = record.user?.name || "Unknown";
      let userGroup = grouped[key].find((g) => g.name === userName);
      if (!userGroup) {
        userGroup = { name: userName, data: [] };
        grouped[key].push(userGroup);
      }
      userGroup.data.push({
        date: record.recordedAt.toISOString().split("T")[0],
        score: record.score,
      });
    }

    return NextResponse.json({ records, grouped });
  } catch (error) {
    console.error("[GROWTH_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const body = await request.json();
    const { familyCaseId, category, metric, score, notes, recordedAt } = body;

    if (!familyCaseId || !category || !metric || score === undefined) {
      return NextResponse.json(
        { error: "familyCaseId, category, metric, and score are required" },
        { status: 400 }
      );
    }

    const record = await prisma.growthRecord.create({
      data: {
        userId: (user as any).id,
        familyCaseId,
        category,
        metric,
        score: parseFloat(score),
        notes: notes || null,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[GROWTH_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
