import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  Briefcase,
  BarChart3,
  CheckCircle2,
  UserPlus,
  ClipboardCheck,
  FileText,
  Settings,
  ArrowRight,
  Activity,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { cn, formatRelativeTime, getStatusColor } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name?: string; role: string };
  if (user.role !== "ADMIN" && user.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all stats in parallel
  const [
    totalFamilies,
    totalUsers,
    activeCases,
    resolvedCases,
    completedAssessments,
    totalCases,
    recentActivity,
    userCountByRole,
    caseStatusCounts,
    monthlyCaseData,
  ] = await Promise.all([
    // Total families (cases with both parents)
    prisma.familyCase.count(),

    // Total users
    prisma.user.count(),

    // Active cases
    prisma.familyCase.count({
      where: { status: { in: ["ACTIVE", "UNDER_MEDIATION"] } },
    }),

    // Resolved cases
    prisma.familyCase.count({
      where: { status: { in: ["RESOLVED", "CLOSED"] } },
    }),

    // Completed assessments
    prisma.assessment.count({
      where: { status: "COMPLETED" },
    }),

    // Total cases
    prisma.familyCase.count(),

    // Recent activity (audit logs)
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, image: true } },
      },
    }),

    // User count by role
    prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    }),

    // Case status counts
    prisma.familyCase.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Monthly case creation data (last 6 months)
    prisma.familyCase.findMany({
      select: { createdAt: true },
      where: {
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const mediationSuccessRate =
    totalCases > 0
      ? Math.round((resolvedCases / totalCases) * 100)
      : 0;

  // Average score from completed assessments (real data)
  const assessmentScores = await prisma.assessment.findMany({
    where: { status: "COMPLETED", score: { not: null } },
    select: { score: true },
  });
  const avgAgreementScore =
    assessmentScores.length > 0
      ? Math.round(
          assessmentScores.reduce((sum, a) => sum + (a.score || 0), 0) /
            assessmentScores.length
        )
      : 0;

  // Build role counts
  const roleCounts: Record<string, number> = {};
  userCountByRole.forEach((r) => {
    roleCounts[r.role] = r._count.id;
  });

  // Build status counts
  const statusCounts: Record<string, number> = {};
  caseStatusCounts.forEach((s) => {
    statusCounts[s.status] = s._count.id;
  });

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // Group monthly case data by month
  const monthlyBuckets: Record<string, number> = {};
  for (const c of monthlyCaseData) {
    const key = `${c.createdAt.getFullYear()}-${c.createdAt.getMonth()}`;
    monthlyBuckets[key] = (monthlyBuckets[key] || 0) + 1;
  }
  const monthlyChartData = Object.entries(monthlyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [year, month] = key.split("-");
      return {
        label: `${months[parseInt(month)]} ${year.slice(2)}`,
        count,
      };
    });

  const maxMonthly = Math.max(...monthlyChartData.map((d) => d.count), 1);

  const analyticsCards = [
    {
      label: "Total Families",
      value: totalFamilies,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/admin/users",
    },
    {
      label: "Active Cases",
      value: activeCases,
      icon: Briefcase,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/admin/mediators",
    },
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      link: "/admin/users",
    },
    {
      label: "Success Rate",
      value: `${mediationSuccessRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      link: "/admin/analytics",
    },
  ];

  const quickActions = [
    {
      label: "Create User",
      description: "Add a new user account",
      icon: UserPlus,
      href: "/admin/users",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Manage Assessments",
      description: "Configure assessment questions",
      icon: ClipboardCheck,
      href: "/admin/assessments",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "View Analytics",
      description: "Detailed platform analytics",
      icon: BarChart3,
      href: "/admin/analytics",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Export Reports",
      description: "Generate platform reports",
      icon: FileText,
      href: "/admin/reports",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of platform activity and management
        </p>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.link}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    card.bg
                  )}
                >
                  <Icon className={cn("w-5 h-5", card.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-3">
                {card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Cases by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(statusCounts).length > 0 ? (
              Object.entries(statusCounts).map(([status, count]) => {
                const total = Object.values(statusCounts).reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            getStatusColor(status)
                          )}
                        >
                          {status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          status === "ACTIVE"
                            ? "bg-blue-500"
                            : status === "UNDER_MEDIATION"
                            ? "bg-amber-500"
                            : status === "RESOLVED"
                            ? "bg-emerald-500"
                            : "bg-gray-400"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {percentage.toFixed(1)}% of total
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No cases yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Users by Role
          </h3>
          <div className="space-y-3">
            {Object.entries(roleCounts).length > 0 ? (
              Object.entries(roleCounts).map(([role, count]) => {
                const total = Object.values(roleCounts).reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={role}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            role === "ADMIN"
                              ? "bg-violet-500"
                              : role === "MEDIATOR"
                              ? "bg-blue-500"
                              : role === "PARENT"
                              ? "bg-emerald-500"
                              : "bg-gray-400"
                          )}
                        />
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {role.toLowerCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          role === "ADMIN"
                            ? "bg-violet-500"
                            : role === "MEDIATOR"
                            ? "bg-blue-500"
                            : role === "PARENT"
                            ? "bg-emerald-500"
                            : "bg-gray-400"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {percentage.toFixed(1)}% of total
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No users yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Case Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Monthly New Cases
          {avgAgreementScore > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              &middot; Average Assessment Score: {avgAgreementScore}/10
            </span>
          )}
        </h3>
        {monthlyChartData.length > 0 ? (
          <div className="flex items-end gap-2 h-40">
            {monthlyChartData.map((d) => (
              <div
                key={d.label}
                className="flex-1 flex flex-col items-center gap-1 min-w-0"
              >
                <span className="text-xs font-medium text-gray-700">
                  {d.count}
                </span>
                <div
                  className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                  style={{
                    height: `${Math.max((d.count / maxMonthly) * 100, 4)}%`,
                  }}
                />
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No cases created in the last 6 months</p>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            Recent Activity
          </h2>
          <Link
            href="/admin/audit"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivity.length > 0 ? (
            recentActivity.map((log) => (
              <div
                key={log.id}
                className="px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {log.action}
                    </p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {log.details}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.user.name ?? "System"} &middot;{" "}
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    action.bg
                  )}
                >
                  <Icon className={cn("w-5 h-5", action.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
