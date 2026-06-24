import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const userIdParam = searchParams.get("userId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: any = {};

    if (caseId) where.familyCaseId = caseId;
    if (userIdParam) where.userId = userIdParam;
    if (type) where.type = type;
    if (status) where.status = status;

    const currentUser = user as { id: string; role: string };
    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";

    // Parents can only see their own assessments
    if (!isStaff) {
      where.userId = currentUser.id;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        familyCase: {
          select: { id: true, title: true },
        },
        _count: {
          select: { answers: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("[ASSESSMENTS_GET]", error);
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
    const { familyCaseId, type, targetUserId } = body;

    if (!familyCaseId || !type) {
      return NextResponse.json(
        { error: "familyCaseId and type are required" },
        { status: 400 }
      );
    }

    const currentUser = user as { id: string; role: string };

    // Only admin and mediator can create assessments
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json(
        { error: "Only administrators and mediators can create assessments" },
        { status: 403 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 }
      );
    }

    // Verify the target user is part of the case
    const familyCase = await prisma.familyCase.findUnique({
      where: { id: familyCaseId },
      select: { parentAId: true, parentBId: true },
    });
    if (
      !familyCase ||
      (familyCase.parentAId !== targetUserId &&
        familyCase.parentBId !== targetUserId)
    ) {
      return NextResponse.json(
        { error: "Target user is not a parent in this case" },
        { status: 400 }
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        familyCaseId,
        userId: targetUserId,
        type,
        status: "PENDING",
        score: null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        familyCase: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error("[ASSESSMENTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
