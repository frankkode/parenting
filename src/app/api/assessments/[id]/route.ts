import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        familyCase: {
          select: { id: true, title: true },
        },
        answers: {
          include: {
            question: {
              select: { id: true, text: true, category: true, type: true, options: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    const currentUser = user as { id: string; role: string };
    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";
    if (!isStaff && assessment.userId !== currentUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("[ASSESSMENT_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.assessment.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";

    // Authorization rules:
    // - Admin/mediator: can change status to anything (publish, etc.)
    // - Assessment owner: can only change to COMPLETED (when submitting answers)
    if (!isStaff) {
      if (existing.userId !== currentUser.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      // Parents can only mark their own assessment as COMPLETED
      if (body.status !== undefined && body.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "You can only mark your assessment as completed" },
          { status: 403 }
        );
      }
    }

    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.score !== undefined && { score: body.score }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("[ASSESSMENT_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    const { id } = await params;

    // Only admin/mediator can delete assessments
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const existing = await prisma.assessment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    await prisma.assessment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ASSESSMENT_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
