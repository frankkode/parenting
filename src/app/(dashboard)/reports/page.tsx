import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  BarChart3,
  FileText,
  Users,
  ClipboardCheck,
  MessageSquare,
  TrendingUp,
  Activity,
} from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };

  // Aggregate statistics across all cases
  const activeCases = await prisma.familyCase.count({
    where: { status: "ACTIVE" },
  });

  const totalMessages = await prisma.message.count();
  const completedAssessments = await prisma.assessment.count({
    where: { status: "COMPLETED" },
  });
  const agreementsAccepted = await prisma.agreement.count({
    where: { status: { in: ["accepted", "signed"] } },
  });

  // Get cases summary
  const cases = await prisma.familyCase.findMany({
    take: 10,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: true,
          agreements: true,
          assessments: true,
          events: true,
          children: true,
        },
      },
      parentA: { select: { name: true } },
      parentB: { select: { name: true } },
      mediator: { select: { name: true } },
    },
  });

  // Conflict metrics
  const conflictMessages = await prisma.message.count({
    where: { hasConflict: true },
  });
  const conflictRatio =
    totalMessages > 0
      ? Math.round((conflictMessages / totalMessages) * 100)
      : 0;

  // Open help requests
  const openHelpRequests = await prisma.helpRequest.count({
    where: { status: "open" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Analytics and insights across all your co-parenting cases.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Users className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{activeCases}</p>
          <p className="text-sm text-gray-500">Active Cases</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <ClipboardCheck className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            {agreementsAccepted}
          </p>
          <p className="text-sm text-gray-500">Agreements Accepted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Activity className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-600">{conflictRatio}%</p>
          <p className="text-sm text-gray-500">Conflict Ratio</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <TrendingUp className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-violet-600">
            {openHelpRequests}
          </p>
          <p className="text-sm text-gray-500">Open Help Requests</p>
        </div>
      </div>

      {/* Communication Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Communication Health
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Total Messages</span>
                <span className="font-medium">{totalMessages}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Flagged Messages</span>
                <span className="font-medium text-red-600">
                  {conflictMessages}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${conflictRatio}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completed Assessments</span>
                <span className="font-medium">{completedAssessments}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{
                    width: `${totalMessages > 0 ? Math.min(100, (completedAssessments / totalMessages) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cases Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            Case Overview
          </h3>
          <div className="space-y-3">
            {cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                href={`/cases/${caseItem.id}/comparison`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {caseItem.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {caseItem.parentA.name} & {caseItem.parentB.name}
                    {caseItem.mediator && ` — Mediator: ${caseItem.mediator.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0 ml-3">
                  <span>{caseItem._count.messages} msgs</span>
                  <span>{caseItem._count.agreements} agrmts</span>
                  <span>{caseItem._count.events} events</span>
                </div>
              </Link>
            ))}
            {cases.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No cases to display.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
