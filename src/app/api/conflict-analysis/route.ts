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

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId query parameter is required" },
        { status: 400 }
      );
    }

    const analyses = await prisma.conflictAnalysis.findMany({
      where: { familyCaseId: caseId },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch answer comparisons between parents
    const familyCase = await prisma.familyCase.findUnique({
      where: { id: caseId },
      select: { parentAId: true, parentBId: true },
    });

    if (!familyCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get all assessments for both parents
    const assessments = await prisma.assessment.findMany({
      where: { familyCaseId: caseId },
      select: { id: true, userId: true },
    });

    const answerComparisons: {
      questionId: string;
      questionText: string;
      category: string;
      subcategory: string | null;
      type: string;
      parentA: { value: string; score: number | null } | null;
      parentB: { value: string; score: number | null } | null;
      gap: number | null;
      severity: string;
    }[] = [];

    if (assessments.length >= 2) {
      const parentAAssessment = assessments.find(
        (a) => a.userId === familyCase.parentAId
      );
      const parentBAssessment = assessments.find(
        (a) => a.userId === familyCase.parentBId
      );

      if (parentAAssessment && parentBAssessment) {
        const parentAAnswers = await prisma.answer.findMany({
          where: { assessmentId: parentAAssessment.id },
          include: { question: true },
        });
        const parentBAnswers = await prisma.answer.findMany({
          where: { assessmentId: parentBAssessment.id },
          include: { question: true },
        });

        const parentBMap = new Map(parentBAnswers.map((a) => [a.questionId, a]));

        for (const ansA of parentAAnswers) {
          const ansB = parentBMap.get(ansA.questionId);
          const gap =
            ansA.score !== null && ansB?.score !== null && ansB?.score !== undefined
              ? Math.abs(ansA.score - ansB.score)
              : null;

          answerComparisons.push({
            questionId: ansA.questionId,
            questionText: ansA.question.text,
            category: ansA.question.category,
            subcategory: ansA.question.subcategory,
            type: ansA.question.type,
            parentA: { value: ansA.value, score: ansA.score },
            parentB: ansB ? { value: ansB.value, score: ansB.score } : null,
            gap,
            severity:
              gap === null
                ? "unknown"
                : gap >= 5
                ? "high"
                : gap >= 3
                ? "medium"
                : "low",
          });
        }
      }
    }

    // Calculate category-level gaps
    const categoryGaps: Record<
      string,
      { parentAAvg: number; parentBAvg: number; gap: number; severity: string; questionCount: number }
    > = {};
    for (const comp of answerComparisons) {
      if (comp.parentA?.score !== null && comp.parentA?.score !== undefined && comp.parentB?.score !== null && comp.parentB?.score !== undefined) {
        if (!categoryGaps[comp.category]) {
          categoryGaps[comp.category] = {
            parentAAvg: 0,
            parentBAvg: 0,
            gap: 0,
            severity: "low",
            questionCount: 0,
          };
        }
        categoryGaps[comp.category].parentAAvg += comp.parentA!.score!;
        categoryGaps[comp.category].parentBAvg += comp.parentB!.score!;
        categoryGaps[comp.category].questionCount++;
      }
    }
    for (const key of Object.keys(categoryGaps)) {
      const g = categoryGaps[key];
      g.parentAAvg = Math.round((g.parentAAvg / g.questionCount) * 10) / 10;
      g.parentBAvg = Math.round((g.parentBAvg / g.questionCount) * 10) / 10;
      g.gap = Math.round(Math.abs(g.parentAAvg - g.parentBAvg) * 10) / 10;
      g.severity = g.gap >= 5 ? "high" : g.gap >= 3 ? "medium" : "low";
    }

    return NextResponse.json({
      analyses,
      answerComparisons,
      categoryGaps,
      comparativeScore:
        answerComparisons.length > 0
          ? Math.round(
              (answerComparisons.filter((a) => a.severity === "low").length /
                answerComparisons.length) *
                100
            )
          : null,
    });
  } catch (error) {
    console.error("[CONFLICT_ANALYSIS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { familyCaseId, category, score, details } = body;

    if (!familyCaseId || !category || score === undefined) {
      return NextResponse.json(
        { error: "familyCaseId, category, and score are required" },
        { status: 400 }
      );
    }

    const analysis = await prisma.conflictAnalysis.create({
      data: {
        familyCaseId,
        category,
        score: parseFloat(score),
        details: details || null,
      },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error("[CONFLICT_ANALYSIS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
