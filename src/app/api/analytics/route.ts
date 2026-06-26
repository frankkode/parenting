import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };

    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ---------- statsCards ----------
    const [totalCases, activeCases, resolvedCases] = await Promise.all([
      prisma.familyCase.count(),
      prisma.familyCase.count({ where: { status: "ACTIVE" } }),
      prisma.familyCase.count({ where: { status: "RESOLVED" } }),
    ]);

    const closedCases = await prisma.familyCase.count({ where: { status: "CLOSED" } });

    const wishResponses = await prisma.wishResponse.findMany({
      select: { agreement: true },
    });
    const avgAgreement =
      wishResponses.length > 0
        ? Math.round(
            (wishResponses.reduce((sum, r) => sum + r.agreement, 0) /
              wishResponses.length) *
              10
          )
        : 0;

    const mediationSuccessRate =
      totalCases > 0
        ? Math.round((resolvedCases / totalCases) * 100)
        : 0;

    // ---------- monthlyCaseData (last 6 months) ----------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentCases = await prisma.familyCase.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap: Record<string, number> = {};
    for (const c of recentCases) {
      const key = monthNames[c.createdAt.getMonth()];
      monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    }

    // Build ordered list of last 6 months
    const monthlyCaseData: { month: string; cases: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthNames[d.getMonth()];
      monthlyCaseData.push({ month: key, cases: monthlyMap[key] || 0 });
    }

    // ---------- caseStatusDistribution ----------
    const statuses = await prisma.familyCase.groupBy({
      by: ["status"],
      _count: true,
    });

    const statusColorMap: Record<string, string> = {
      ACTIVE: "#3B82F6",
      UNDER_MEDIATION: "#F59E0B",
      RESOLVED: "#10B981",
      CLOSED: "#6B7280",
    };

    const caseStatusDistribution = statuses.map((s) => ({
      name: s.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: s._count,
      color: statusColorMap[s.status] || "#8B5CF6",
    }));

    // ---------- conflictByCategory (from ConflictAnalysis) ----------
    const conflictCategories = await prisma.conflictAnalysis.groupBy({
      by: ["category"],
      _count: true,
    });

    const conflictByCategory = conflictCategories.map((c) => ({
      category: c.category,
      count: c._count,
    }));

    // ---------- radarData (avg assessment scores by category, parent A vs B) ----------
    const answersWithCategoryAndCase = await prisma.answer.findMany({
      select: {
        score: true,
        question: { select: { category: true } },
        assessment: {
          select: {
            userId: true,
            familyCase: { select: { parentAId: true, parentBId: true } },
          },
        },
      },
      where: { score: { not: null } },
    });

    // Group by category and parent role
    const radarMap: Record<
      string,
      { parentA: number[]; parentB: number[] }
    > = {};

    for (const a of answersWithCategoryAndCase) {
      const cat = a.question.category;
      if (!radarMap[cat]) radarMap[cat] = { parentA: [], parentB: [] };
      if (a.assessment.userId === a.assessment.familyCase.parentAId) {
        radarMap[cat].parentA.push(a.score!);
      } else if (a.assessment.userId === a.assessment.familyCase.parentBId) {
        radarMap[cat].parentB.push(a.score!);
      }
    }

    const radarData = Object.entries(radarMap).map(([category, scores]) => {
      const avgA =
        scores.parentA.length > 0
          ? Math.round(
              scores.parentA.reduce((s, v) => s + v, 0) / scores.parentA.length
            )
          : 0;
      const avgB =
        scores.parentB.length > 0
          ? Math.round(
              scores.parentB.reduce((s, v) => s + v, 0) / scores.parentB.length
            )
          : 0;
      const avg =
        scores.parentA.length + scores.parentB.length > 0
          ? Math.round(
              (scores.parentA.reduce((s, v) => s + v, 0) +
                scores.parentB.reduce((s, v) => s + v, 0)) /
                (scores.parentA.length + scores.parentB.length)
            )
          : 0;
      return {
        category,
        "Parent A": avgA,
        "Parent B": avgB,
        Average: avg,
      };
    });

    // ---------- mediatorPerformance ----------
    const mediators = await prisma.user.findMany({
      where: { role: "MEDIATOR" },
      select: {
        id: true,
        name: true,
        _count: { select: { mediatedCases: true } },
        mediatedCases: { select: { status: true } },
      },
    });

    const mediatorPerformance = mediators.map((m) => {
      const total = m._count.mediatedCases;
      const resolved = m.mediatedCases.filter(
        (c) => c.status === "RESOLVED"
      ).length;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
      return {
        name: m.name || "Unknown",
        cases: total,
        resolved,
        rate,
        avgScore: 0,
        rating: 0,
      };
    });

    return NextResponse.json({
      totalCases,
      activeCases,
      resolvedCases,
      closedCases,
      avgAgreement,
      mediationSuccessRate,
      monthlyCaseData,
      caseStatusDistribution,
      conflictByCategory,
      radarData,
      mediatorPerformance,
    });
  } catch (error) {
    console.error("[ANALYTICS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
