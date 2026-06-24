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
    const caseId = searchParams.get("caseId");
    const childId = searchParams.get("childId");
    const category = searchParams.get("category");

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId query parameter is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { familyCaseId: caseId };
    if (childId) where.childId = childId;
    if (category) where.category = category;

    const impacts = await prisma.childImpact.findMany({
      where,
      include: {
        child: { select: { id: true, name: true, age: true } },
      },
      orderBy: [{ category: "asc" }, { assessedAt: "desc" }],
    });

    // Calculate summary by category
    const summary: Record<string, { avgScore: number; count: number; risk: string }> = {};
    for (const impact of impacts) {
      if (!summary[impact.category]) {
        summary[impact.category] = { avgScore: 0, count: 0, risk: "low" };
      }
      summary[impact.category].avgScore += impact.score;
      summary[impact.category].count++;
    }
    for (const key of Object.keys(summary)) {
      summary[key].avgScore = Math.round((summary[key].avgScore / summary[key].count) * 10) / 10;
      summary[key].risk =
        summary[key].avgScore < 4 ? "high" : summary[key].avgScore < 6.5 ? "medium" : "low";
    }

    return NextResponse.json({ impacts, summary });
  } catch (error) {
    console.error("[CHILD_IMPACT_GET]", error);
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
    const { familyCaseId, childId, category, score, notes } = body;

    if (!familyCaseId || !category || score === undefined) {
      return NextResponse.json(
        { error: "familyCaseId, category, and score are required" },
        { status: 400 }
      );
    }

    const impact = await prisma.childImpact.create({
      data: {
        familyCaseId,
        childId: childId || null,
        category,
        score: parseFloat(score),
        notes: notes || null,
      },
      include: {
        child: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(impact, { status: 201 });
  } catch (error) {
    console.error("[CHILD_IMPACT_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
