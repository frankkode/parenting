import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";
    if (!isStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { caseId } = await params;

    const familyCase = await prisma.familyCase.findUnique({
      where: { id: caseId },
      select: { id: true, title: true, parentAId: true, parentBId: true, mediatorId: true },
    });

    if (!familyCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get all questions
    const questions = await prisma.question.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });

    // Get assessments for both parents
    const assessments = await prisma.assessment.findMany({
      where: { familyCaseId: caseId },
      include: {
        answers: true,
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group assessments by user
    const parentAAssessments = assessments.filter(
      (a) => a.userId === familyCase.parentAId
    );
    const parentBAssessments = assessments.filter(
      (a) => a.userId === familyCase.parentBId
    );

    // Get latest assessments
    const latestParentA = parentAAssessments[0] || null;
    const latestParentB = parentBAssessments[0] || null;

    // Build category-level comparison
    const categoryScores: Record<
      string,
      {
        parentA: number | null;
        parentB: number | null;
        questions: Array<{
          id: string;
          text: string;
          type: string;
          parentAAnswer: string | null;
          parentAScore: number | null;
          parentBAnswer: string | null;
          parentBScore: number | null;
        }>;
      }
    > = {};

    for (const q of questions) {
      if (!categoryScores[q.category]) {
        categoryScores[q.category] = { parentA: null, parentB: null, questions: [] };
      }

      const ansA = latestParentA?.answers.find((a) => a.questionId === q.id);
      const ansB = latestParentB?.answers.find((a) => a.questionId === q.id);

      categoryScores[q.category].questions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        parentAAnswer: ansA?.value || null,
        parentAScore: ansA?.score ?? null,
        parentBAnswer: ansB?.value || null,
        parentBScore: ansB?.score ?? null,
      });
    }

    // Calculate category-level averages
    for (const category of Object.keys(categoryScores)) {
      const qs = categoryScores[category].questions;

      const scoresA = qs
        .filter((q) => q.parentAScore !== null)
        .map((q) => q.parentAScore!);
      const scoresB = qs
        .filter((q) => q.parentBScore !== null)
        .map((q) => q.parentBScore!);

      categoryScores[category].parentA =
        scoresA.length > 0
          ? Math.round((scoresA.reduce((s, v) => s + v, 0) / scoresA.length) * 100) / 100
          : null;
      categoryScores[category].parentB =
        scoresB.length > 0
          ? Math.round((scoresB.reduce((s, v) => s + v, 0) / scoresB.length) * 100) / 100
          : null;
    }

    // Overall scores
    const parentAOverall = latestParentA?.score || null;
    const parentBOverall = latestParentB?.score || null;

    return NextResponse.json({
      caseId,
      caseTitle: familyCase.title,
      parentA: familyCase.parentAId,
      parentB: familyCase.parentBId,
      parentAOverall,
      parentBOverall,
      parentAAssessmentCount: parentAAssessments.length,
      parentBAssessmentCount: parentBAssessments.length,
      categories: categoryScores,
    });
  } catch (error) {
    console.error("[COMPARISON_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
