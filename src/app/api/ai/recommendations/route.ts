import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateRecommendations } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { caseId } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId is required" },
        { status: 400 }
      );
    }

    const familyCase = await prisma.familyCase.findUnique({
      where: { id: caseId },
      select: { id: true, parentAId: true, parentBId: true },
    });

    if (!familyCase) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const [recentAssessments, recentMessages, pendingAgreements, upcomingEvents] =
      await Promise.all([
        prisma.assessment.findMany({
          where: { familyCaseId: caseId, status: "completed" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { score: true, type: true, createdAt: true },
        }),
        prisma.message.findMany({
          where: { familyCaseId: caseId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { content: true, hasConflict: true, createdAt: true },
        }),
        prisma.agreement.findMany({
          where: { familyCaseId: caseId, status: { not: "accepted" } },
          select: { title: true, status: true },
        }),
        prisma.calendarEvent.findMany({
          where: {
            familyCaseId: caseId,
            startDate: { gte: new Date() },
          },
          orderBy: { startDate: "asc" },
          take: 10,
          select: { title: true, type: true, startDate: true },
        }),
      ]);

    const avgScore =
      recentAssessments.length > 0
        ? Math.round(
            recentAssessments.reduce((sum, a) => sum + (a.score || 0), 0) /
              recentAssessments.length
          )
        : undefined;

    const recommendations = await generateRecommendations({
      caseId,
      assessmentScore: avgScore,
      recentMessages: recentMessages.map((m) => ({
        content: m.content.substring(0, 200),
        hasConflict: m.hasConflict,
      })),
      pendingAgreements: pendingAgreements.map((a) => ({
        title: a.title,
        status: a.status,
      })),
      upcomingEvents: upcomingEvents.map((e) => ({
        title: e.title,
        type: e.type,
      })),
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("[AI_RECOMMENDATIONS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId query parameter is required" },
        { status: 400 }
      );
    }

    const recommendations = await prisma.aIRecommendation.findMany({
      where: { familyCaseId: caseId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("[AI_RECOMMENDATIONS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
