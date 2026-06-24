import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  Scale,
  CheckCircle2,
  Search,
  AlertTriangle,
  ArrowRight,
  Users,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Shield,
  Activity,
} from "lucide-react";
import {
  cn,
  formatDate,
  formatRelativeTime,
  getRiskLevel,
  getStatusColor,
  getScoreColor,
} from "@/lib/utils";

// ---------- Types ----------
interface CaseMetrics {
  id: string;
  title: string;
  status: string;
  parentA: { id: string; name: string | null; email: string };
  parentB: { id: string; name: string | null; email: string };
  children: { id: string; name: string }[];
  // Assessment
  avgScore: number | null;
  agreementScore: number | null;
  // Risk (multi-dimensional)
  riskLevel: { label: string; color: string; bgColor: string };
  compositeRiskScore: number | null; // 0-100, lower = higher risk
  riskFactors: string[];
  // Conflict
  conflictRatio: number;
  conflictGap: number | null; // from conflict analysis
  // Child wellbeing
  childWellbeingScore: number | null;
  childWellbeingRisk: string;
  // Growth trend
  growthTrend: "improving" | "declining" | "stable" | "unknown";
  growthChange: number | null; // percentage change
  // Responsibility balance
  responsibilityBalance: number | null; // 0-100, 100 = perfectly balanced
  // Agreements
  resolvedAgreements: number;
  totalAgreements: number;
  // Help requests
  openHelpRequests: number;
  totalHelpRequests: number;
  // Meta
  totalMessages: number;
  needsAttention: boolean;
  updatedAt: Date;
  createdAt: Date;
}

// ---------- Risk Scoring ----------

/** Compute composite risk score (0-100, higher = better/safer) from multiple dimensions */
function computeCompositeRiskScore(metrics: {
  agreementScore: number | null;
  childWellbeingScore: number | null;
  conflictGap: number | null;
  responsibilityBalance: number | null;
  growthTrend: "improving" | "declining" | "stable" | "unknown";
  growthChange: number | null;
  conflictRatio: number;
  openHelpRequests: number;
  totalHelpRequests: number;
}): { score: number | null; factors: string[] } {
  const factors: string[] = [];
  const scores: number[] = [];
  const weights: number[] = [];

  // 1. Assessment agreement (weight: 30%)
  if (metrics.agreementScore !== null) {
    scores.push(metrics.agreementScore);
    weights.push(0.3);
    if (metrics.agreementScore < 40) factors.push("Low agreement between parents");
    else if (metrics.agreementScore < 60) factors.push("Moderate parental agreement");
  }

  // 2. Child wellbeing (weight: 25%)
  if (metrics.childWellbeingScore !== null) {
    // childWellbeingScore is 1-10, normalize to 0-100
    const normalizedChild = metrics.childWellbeingScore * 10;
    scores.push(normalizedChild);
    weights.push(0.25);
    if (metrics.childWellbeingScore < 4) factors.push("Low child wellbeing score");
    else if (metrics.childWellbeingScore < 6) factors.push("Moderate child wellbeing concern");
  }

  // 3. Conflict gap (weight: 20%) - inverted, lower gap = better
  if (metrics.conflictGap !== null) {
    // Gap is 0-10, invert: 0 gap = 100 score, 10 gap = 0 score
    const gapScore = Math.max(0, 100 - metrics.conflictGap * 10);
    scores.push(gapScore);
    weights.push(0.2);
    if (metrics.conflictGap >= 5) factors.push("High conflict gap between parents");
    else if (metrics.conflictGap >= 3) factors.push("Moderate conflict gap");
  }

  // 4. Responsibility balance (weight: 15%)
  if (metrics.responsibilityBalance !== null) {
    scores.push(metrics.responsibilityBalance);
    weights.push(0.15);
    if (metrics.responsibilityBalance < 50) factors.push("Uneven responsibility distribution");
  }

  // 5. Growth trend (weight: 10%)
  if (metrics.growthTrend !== "unknown") {
    const trendScore =
      metrics.growthTrend === "improving" ? 80 :
      metrics.growthTrend === "stable" ? 60 : 35;
    scores.push(trendScore);
    weights.push(0.1);
    if (metrics.growthTrend === "declining") factors.push("Declining growth trend");
  }

  // No data at all
  if (scores.length === 0) return { score: null, factors: ["Insufficient data for risk assessment"] };

  // Normalize weights
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const compositeScore = Math.round(
    scores.reduce((sum, s, i) => sum + s * (weights[i] / totalWeight), 0)
  );

  // Additional risk factors not captured in score
  if (metrics.conflictRatio > 50) factors.push("High conflict message ratio");
  if (metrics.openHelpRequests > 3) factors.push("Many unresolved help requests");

  return { score: compositeScore, factors };
}

function getCompositeRiskLevel(score: number | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score === null) return { label: "No Data", color: "text-gray-500", bgColor: "bg-gray-100" };
  if (score >= 75) return { label: "Low", color: "text-emerald-700", bgColor: "bg-emerald-100" };
  if (score >= 55) return { label: "Medium", color: "text-amber-700", bgColor: "bg-amber-100" };
  if (score >= 35) return { label: "High", color: "text-orange-700", bgColor: "bg-orange-100" };
  return { label: "Critical", color: "text-red-700", bgColor: "bg-red-100" };
}

// ---------- Data Fetching ----------

async function getMediatorCases(
  userId: string,
  filters: { search?: string; filter?: string }
): Promise<CaseMetrics[]> {
  const where: Record<string, unknown> = { mediatorId: userId };

  if (filters.search) {
    where.title = { contains: filters.search, mode: "insensitive" as const };
  }

  const cases = await prisma.familyCase.findMany({
    where,
    include: {
      parentA: { select: { id: true, name: true, email: true } },
      parentB: { select: { id: true, name: true, email: true } },
      assessments: {
        select: { id: true, status: true, score: true, userId: true },
      },
      children: { select: { id: true, name: true } },
      messages: { select: { id: true, hasConflict: true } },
      agreements: { select: { id: true, status: true } },
      childImpacts: { select: { id: true, category: true, score: true } },
      growthRecords: {
        select: { id: true, userId: true, category: true, score: true, recordedAt: true },
        orderBy: { recordedAt: "asc" },
      },
      conflictAnalyses: {
        select: { id: true, category: true, score: true },
        orderBy: { createdAt: "desc" },
      },
      responsibilityItems: {
        select: { id: true, parentAScore: true, parentBScore: true },
      },
      helpRequests: {
        select: { id: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return cases.map((c) => {
    // --- Assessment scores ---
    const completedAssessments = c.assessments.filter((a) => a.status === "COMPLETED");
    const avgScore =
      completedAssessments.length > 0
        ? Math.round(
            completedAssessments.reduce((sum, a) => sum + (a.score ?? 0), 0) /
              completedAssessments.length
          )
        : null;

    // Agreement score (simplified: average of completed assessment scores)
    const agreementScore = avgScore;

    // --- Conflict ratio ---
    const totalMessages = c.messages.length;
    const conflictMessages = c.messages.filter((m) => m.hasConflict).length;
    const conflictRatio = totalMessages > 0 ? (conflictMessages / totalMessages) * 100 : 0;

    // --- Conflict gap from analyses ---
    const conflictGap =
      c.conflictAnalyses.length > 0
        ? Math.round(
            (c.conflictAnalyses.reduce((s, a) => s + (10 - a.score), 0) /
              c.conflictAnalyses.length) *
              10
          ) / 10
        : null;

    // --- Child wellbeing ---
    const childWellbeingScore =
      c.childImpacts.length > 0
        ? Math.round(
            (c.childImpacts.reduce((s, i) => s + i.score, 0) / c.childImpacts.length) * 10
          ) / 10
        : null;
    const childWellbeingRisk =
      childWellbeingScore === null
        ? "unknown"
        : childWellbeingScore < 4
        ? "high"
        : childWellbeingScore < 6.5
        ? "medium"
        : "low";

    // --- Growth trend ---
    const growthRecords = c.growthRecords;
    let growthTrend: "improving" | "declining" | "stable" | "unknown" = "unknown";
    let growthChange: number | null = null;
    if (growthRecords.length >= 4) {
      const midpoint = Math.floor(growthRecords.length / 2);
      const firstHalf = growthRecords.slice(0, midpoint);
      const secondHalf = growthRecords.slice(midpoint);
      const firstAvg = firstHalf.reduce((s, r) => s + r.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, r) => s + r.score, 0) / secondHalf.length;
      growthChange = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
      if (growthChange > 5) growthTrend = "improving";
      else if (growthChange < -5) growthTrend = "declining";
      else growthTrend = "stable";
    }

    // --- Responsibility balance ---
    const items = c.responsibilityItems;
    let responsibilityBalance: number | null = null;
    if (items.length > 0) {
      const totalA = items.reduce((s, i) => s + i.parentAScore, 0);
      const totalB = items.reduce((s, i) => s + i.parentBScore, 0);
      const total = totalA + totalB;
      if (total > 0) {
        const aPct = (totalA / total) * 100;
        const bPct = (totalB / total) * 100;
        const gap = Math.abs(aPct - bPct);
        responsibilityBalance = 100 - gap;
      }
    }

    // --- Agreements ---
    const resolvedAgreements = c.agreements.filter(
      (a) => a.status === "APPROVED" || a.status === "accepted"
    ).length;

    // --- Help requests ---
    const openHelpRequests = c.helpRequests.filter(
      (h) => h.status === "OPEN"
    ).length;

    // --- Composite risk ---
    const { score: compositeRiskScore, factors: riskFactors } = computeCompositeRiskScore({
      agreementScore,
      childWellbeingScore,
      conflictGap,
      responsibilityBalance,
      growthTrend,
      growthChange,
      conflictRatio,
      openHelpRequests,
      totalHelpRequests: c.helpRequests.length,
    });

    const riskLevel = getCompositeRiskLevel(compositeRiskScore);

    const needsAttention =
      compositeRiskScore !== null
        ? compositeRiskScore < 45
        : conflictRatio > 50 || (avgScore !== null && avgScore < 40);

    return {
      id: c.id,
      title: c.title,
      status: c.status,
      parentA: c.parentA,
      parentB: c.parentB,
      children: c.children,
      avgScore,
      agreementScore,
      riskLevel,
      compositeRiskScore,
      riskFactors,
      conflictRatio,
      conflictGap,
      childWellbeingScore,
      childWellbeingRisk,
      growthTrend,
      growthChange,
      responsibilityBalance,
      resolvedAgreements,
      totalAgreements: c.agreements.length,
      openHelpRequests,
      totalHelpRequests: c.helpRequests.length,
      totalMessages,
      needsAttention,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    };
  });
}

// ---------- Page Component ----------

export default async function MediatorDashboardPage(props: {
  searchParams?: Promise<{ search?: string; filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name?: string; role: string };
  if (user.role !== "MEDIATOR" && user.role !== "admin") {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const activeFilter = searchParams.filter ?? "All";
  const searchQuery = searchParams.search ?? "";

  const cases = await getMediatorCases(user.id, {
    search: searchQuery || undefined,
  });

  // Apply client filters (for risk/attention views)
  const filteredCases = cases.filter((c) => {
    switch (activeFilter) {
      case "Active":
        return c.status === "ACTIVE";
      case "Needs Attention":
        return c.needsAttention;
      case "High Risk":
        return c.riskLevel.label === "High" || c.riskLevel.label === "Critical";
      default:
        return true;
    }
  });

  // Stats from ALL cases (not filtered)
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => c.status === "ACTIVE").length;
  const underMediation = cases.filter(
    (c) => c.status === "UNDER_MEDIATION"
  ).length;
  const resolvedCases = cases.filter(
    (c) => c.status === "RESOLVED" || c.status === "CLOSED"
  ).length;
  const needsAttention = cases.filter((c) => c.needsAttention).length;
  const highRisk = cases.filter(
    (c) => c.riskLevel.label === "High" || c.riskLevel.label === "Critical"
  ).length;
  const criticalChildWellbeing = cases.filter(
    (c) => c.childWellbeingRisk === "high"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mediator Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Comprehensive risk assessment across all assigned mediation cases
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard
          label="Total Cases"
          value={totalCases}
          icon={Briefcase}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Active"
          value={activeCases}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          label="Under Mediation"
          value={underMediation}
          icon={Scale}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <StatCard
          label="Resolved"
          value={resolvedCases}
          icon={CheckCircle2}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Needs Attention"
          value={needsAttention}
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          label="High Risk"
          value={highRisk}
          icon={Shield}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          label="Child Wellbeing Risk"
          value={criticalChildWellbeing}
          icon={Heart}
          color="text-pink-600"
          bg="bg-pink-50"
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {["All", "Active", "Needs Attention", "High Risk"].map((filter) => (
              <button
                key={filter}
                type="submit"
                name="filter"
                value={filter}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  activeFilter === filter
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search cases..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
      </div>

      {/* Case List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Parents
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Agreement
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Conflict Gap
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Child Wellbeing
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Attention
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.children.length > 0
                          ? `${c.children.length} child${c.children.length > 1 ? "ren" : ""}`
                          : "No children"}{" "}
                        &middot; {formatRelativeTime(c.createdAt)}
                      </p>
                    </td>

                    {/* Parents */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-medium text-blue-700">
                            {c.parentA.name?.charAt(0) ?? "A"}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-xs font-medium text-amber-700">
                            {c.parentB.name?.charAt(0) ?? "B"}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                          {c.parentA.name?.split(" ")[0] ?? "Parent A"} &{" "}
                          {c.parentB.name?.split(" ")[0] ?? "Parent B"}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(c.status)
                        )}
                      >
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Agreement Score */}
                    <td className="px-4 py-3.5 text-center">
                      {c.agreementScore !== null ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                c.agreementScore >= 80
                                  ? "bg-emerald-500"
                                  : c.agreementScore >= 60
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${c.agreementScore}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium", getScoreColor(c.agreementScore))}>
                            {c.agreementScore}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>

                    {/* Conflict Gap */}
                    <td className="px-4 py-3.5 text-center">
                      {c.conflictGap !== null ? (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            c.conflictGap >= 5
                              ? "text-red-600"
                              : c.conflictGap >= 3
                              ? "text-amber-600"
                              : "text-emerald-600"
                          )}
                        >
                          {c.conflictGap}/10
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Child Wellbeing */}
                    <td className="px-4 py-3.5 text-center">
                      {c.childWellbeingScore !== null ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Heart
                            className={cn(
                              "w-3.5 h-3.5",
                              c.childWellbeingRisk === "high"
                                ? "text-red-500"
                                : c.childWellbeingRisk === "medium"
                                ? "text-amber-500"
                                : "text-emerald-500"
                            )}
                            fill="currentColor"
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              c.childWellbeingRisk === "high"
                                ? "text-red-600"
                                : c.childWellbeingRisk === "medium"
                                ? "text-amber-600"
                                : "text-emerald-600"
                            )}
                          >
                            {c.childWellbeingScore}/10
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Growth Trend */}
                    <td className="px-4 py-3.5 text-center">
                      {c.growthTrend !== "unknown" ? (
                        <div className="flex items-center justify-center gap-1">
                          {c.growthTrend === "improving" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          ) : c.growthTrend === "declining" ? (
                            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          {c.growthChange !== null && (
                            <span
                              className={cn(
                                "text-xs font-medium",
                                c.growthTrend === "improving"
                                  ? "text-emerald-600"
                                  : c.growthTrend === "declining"
                                  ? "text-red-600"
                                  : "text-gray-500"
                              )}
                            >
                              {c.growthChange > 0 ? "+" : ""}
                              {c.growthChange}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No data</span>
                      )}
                    </td>

                    {/* Risk Level (composite) */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            c.riskLevel.color,
                            c.riskLevel.bgColor
                          )}
                        >
                          {c.riskLevel.label}
                        </span>
                        {c.compositeRiskScore !== null && (
                          <span className="text-[10px] text-gray-400">
                            {c.compositeRiskScore}/100
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Needs Attention */}
                    <td className="px-4 py-3.5 text-center">
                      {c.needsAttention ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full group relative cursor-help"
                          title={c.riskFactors.join("; ")}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Yes
                          {c.riskFactors.length > 0 && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 text-left z-10">
                              {c.riskFactors.map((f, i) => (
                                <div key={i} className="flex items-start gap-1">
                                  <span className="text-red-400 mt-0.5">&bull;</span>
                                  <span>{f}</span>
                                </div>
                              ))}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/mediator/cases/${c.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {cases.length > 0 ? "No Matching Cases" : "No Cases Assigned"}
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {cases.length > 0
                ? "No cases match your current filter criteria. Try adjusting the filters."
                : "You haven't been assigned to any mediation cases yet. Cases will appear here once an administrator assigns them to you."}
            </p>
          </div>
        )}
      </div>

      {/* Risk Summary Quick View */}
      {highRisk > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-900">
                {highRisk} High-Risk {highRisk === 1 ? "Case" : "Cases"} Require Attention
              </h3>
              <div className="mt-2 space-y-1.5">
                {cases
                  .filter((c) => c.riskLevel.label === "High" || c.riskLevel.label === "Critical")
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            c.riskLevel.label === "Critical" ? "bg-red-500" : "bg-orange-500"
                          )}
                        />
                        <span className="text-red-800 truncate">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {c.riskFactors.slice(0, 2).map((f, i) => (
                          <span key={i} className="text-xs text-red-600">
                            {f}
                          </span>
                        ))}
                        <Link
                          href={`/mediator/cases/${c.id}`}
                          className="text-xs font-medium text-red-700 hover:text-red-800"
                        >
                          Review &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Stat Card ----------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
