import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth();
    const { caseId } = await params;

    const familyCase = await prisma.familyCase.findUnique({
      where: { id: caseId },
      select: { id: true, parentAId: true, parentBId: true, mediatorId: true },
    });

    if (!familyCase) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const [
      assessments,
      messages,
      agreements,
      responsibilityItems,
      calendarEvents,
    ] = await Promise.all([
      prisma.assessment.findMany({
        where: { familyCaseId: caseId },
        select: {
          id: true,
          type: true,
          status: true,
          score: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.findMany({
        where: { familyCaseId: caseId },
        select: {
          id: true,
          hasConflict: true,
          conflictScore: true,
          createdAt: true,
          senderId: true,
          sender: { select: { id: true, name: true, role: true } },
          type: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agreement.findMany({
        where: { familyCaseId: caseId },
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          createdAt: true,
          acceptedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.responsibilityItem.findMany({
        where: { familyCaseId: caseId },
        select: {
          id: true,
          title: true,
          category: true,
          parentAScore: true,
          parentBScore: true,
          recommended: true,
          status: true,
        },
        orderBy: { category: "asc" },
      }),
      prisma.calendarEvent.findMany({
        where: { familyCaseId: caseId },
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          endDate: true,
          userId: true,
        },
        orderBy: { startDate: "asc" },
      }),
    ]);

    const totalMessages = messages.length;
    const conflictMessages = messages.filter((m) => m.hasConflict).length;
    const conflictRate = totalMessages > 0 ? conflictMessages / totalMessages : 0;

    const completedAgreements = agreements.filter(
      (a) => a.status === "accepted"
    ).length;
    const agreementRate =
      agreements.length > 0 ? completedAgreements / agreements.length : 0;

    const averageScore = assessments
      .filter((a) => a.score !== null)
      .reduce((acc, a) => acc + (a.score || 0), 0);
    const scoreCount = assessments.filter((a) => a.score !== null).length;
    const avgAssessmentScore = scoreCount > 0 ? averageScore / scoreCount : null;

    const pendingItems = responsibilityItems.filter(
      (i) => i.status === "pending"
    ).length;
    const completedItems = responsibilityItems.filter(
      (i) => i.status === "completed"
    ).length;

    const upcomingEvents = calendarEvents.filter(
      (e) => new Date(e.startDate) > new Date()
    ).length;

    return NextResponse.json({
      caseId,
      overview: {
        totalAssessments: assessments.length,
        totalMessages,
        totalAgreements: agreements.length,
        totalResponsibilityItems: responsibilityItems.length,
        totalCalendarEvents: calendarEvents.length,
        upcomingEvents,
      },
      communication: {
        totalMessages,
        conflictMessages,
        conflictRate: Math.round(conflictRate * 100),
        messagesBySender: messages.reduce(
          (acc: Record<string, number>, m) => {
            const name = m.sender?.name || "Unknown";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          },
          {}
        ),
      },
      assessments: {
        completed: assessments.filter((a) => a.status === "completed").length,
        pending: assessments.filter((a) => a.status === "pending").length,
        averageScore: avgAssessmentScore
          ? Math.round(avgAssessmentScore)
          : null,
        latestScores: assessments
          .filter((a) => a.score !== null)
          .slice(0, 10)
          .map((a) => ({
            date: a.createdAt,
            score: a.score,
            type: a.type,
          })),
      },
      agreements: {
        total: agreements.length,
        draft: agreements.filter((a) => a.status === "draft").length,
        accepted: completedAgreements,
        completionRate: Math.round(agreementRate * 100),
      },
      responsibilities: {
        total: responsibilityItems.length,
        pending: pendingItems,
        completed: completedItems,
        byCategory: responsibilityItems.reduce(
          (acc: Record<string, any>, item) => {
            if (!acc[item.category]) {
              acc[item.category] = { total: 0, pending: 0, completed: 0 };
            }
            acc[item.category].total++;
            if (item.status === "completed") acc[item.category].completed++;
            else acc[item.category].pending++;
            return acc;
          },
          {}
        ),
      },
    });
  } catch (error) {
    console.error("[ANALYSIS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
