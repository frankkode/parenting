import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };

    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: caseId } = await params;

    // Verify case exists
    const familyCase = await prisma.familyCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!familyCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get all assessments for this case
    const assessments = await prisma.assessment.findMany({
      where: { familyCaseId: caseId },
      select: { id: true },
    });

    const assessmentIds = assessments.map((a) => a.id);

    // Delete all answers for all assessments in this case
    const deletedAnswers = await prisma.answer.deleteMany({
      where: { assessmentId: { in: assessmentIds } },
    });

    // Reset all assessments to IN_PROGRESS with null score
    await prisma.assessment.updateMany({
      where: { familyCaseId: caseId },
      data: { status: "IN_PROGRESS", score: null },
    });

    return NextResponse.json({
      success: true,
      deletedAnswers: deletedAnswers.count,
      resetAssessments: assessmentIds.length,
    });
  } catch (error) {
    console.error("[RESET_ANSWERS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
