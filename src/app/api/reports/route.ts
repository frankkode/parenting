import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const type = searchParams.get("type");

    const where: any = {};

    if (caseId) where.familyCaseId = caseId;
    if (type) where.type = type;

    const reports = await prisma.report.findMany({
      where,
      include: {
        familyCase: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { familyCaseId, type, content } = body;

    if (!familyCaseId || !type) {
      return NextResponse.json(
        { error: "familyCaseId and type are required" },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        familyCaseId,
        generatedById: (user as any).id,
        type,
        content: content || null,
      },
      include: {
        familyCase: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("[REPORTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
