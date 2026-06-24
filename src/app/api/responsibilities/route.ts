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
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId query parameter is required" },
        { status: 400 }
      );
    }

    const where: any = { familyCaseId: caseId };

    if (category) where.category = category;
    if (status) where.status = status;

    const items = await prisma.responsibilityItem.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { status: "asc" },
      ],
    });

    const summary = await prisma.responsibilityItem.groupBy({
      by: ["category", "status"],
      where: { familyCaseId: caseId },
      _count: { id: true },
    });

    return NextResponse.json({ items, summary });
  } catch (error) {
    console.error("[RESPONSIBILITIES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const { familyCaseId, title, category, parentAScore, parentBScore, recommended } = body;

    if (!familyCaseId || !title) {
      return NextResponse.json(
        { error: "familyCaseId and title are required" },
        { status: 400 }
      );
    }

    const item = await prisma.responsibilityItem.create({
      data: {
        familyCaseId,
        title,
        category: category || "other",
        parentAScore: parentAScore ?? 50,
        parentBScore: parentBScore ?? 50,
        recommended: recommended || "shared",
        status: "pending",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[RESPONSIBILITIES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const body = await request.json();
    const { id, status, parentAScore, parentBScore, recommended } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.responsibilityItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Responsibility item not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (parentAScore !== undefined) updateData.parentAScore = parentAScore;
    if (parentBScore !== undefined) updateData.parentBScore = parentBScore;
    if (recommended !== undefined) updateData.recommended = recommended;

    const item = await prisma.responsibilityItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("[RESPONSIBILITIES_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
