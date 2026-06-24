import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";

export default async function AssessmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };

  const assessments = await prisma.assessment.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      familyCase: { select: { id: true, title: true } },
      _count: { select: { answers: true } },
    },
  });

  const completedCount = assessments.filter(
    (a) => a.status === "COMPLETED"
  ).length;
  const averageScore =
    assessments.length > 0
      ? Math.round(
          assessments
            .filter((a) => a.score !== null)
            .reduce((sum, a) => sum + (a.score || 0), 0) /
            Math.max(
              1,
              assessments.filter((a) => a.score !== null).length
            )
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        <p className="text-gray-500 mt-1">
          View co-parenting assessments across all your cases.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <ClipboardCheck className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {assessments.length}
          </p>
          <p className="text-sm text-gray-500">Total Assessments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            {completedCount}
          </p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <BarChart3 className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-violet-600">
            {averageScore !== null ? `${averageScore}/100` : "N/A"}
          </p>
          <p className="text-sm text-gray-500">Average Score</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            All Assessments
          </h2>
        </div>

        {assessments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {assessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/cases/${assessment.familyCaseId}/assessments`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {assessment.type.replace(/_/g, " ")} Assessment
                    </p>
                    <Badge
                      variant={
                        assessment.status === "COMPLETED"
                          ? "success"
                          : "warning"
                      }
                    >
                      {assessment.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {assessment.status.charAt(0) +
                        assessment.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {assessment.familyCase.title} — By{" "}
                    {assessment.user?.name || "Unknown"}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {assessment.score !== null && (
                    <>
                      <Progress
                        value={assessment.score}
                        className="w-24 h-2"
                      />
                      <span
                        className={`text-sm font-semibold ${
                          assessment.score >= 70
                            ? "text-emerald-600"
                            : assessment.score >= 40
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {assessment.score}/100
                      </span>
                    </>
                  )}
                  {assessment._count && (
                    <span className="text-xs text-gray-400">
                      {assessment._count.answers} answers
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              No assessments yet
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Assessments completed for your cases will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
