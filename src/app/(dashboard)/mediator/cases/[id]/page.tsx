import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Calendar,
  ClipboardCheck,
  StickyNote,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Users,
  BarChart3,
} from "lucide-react";
import {
  cn,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  calculateAgreementScore,
  getScoreColor,
  getScoreBgColor,
  getRiskLevel,
  getStatusColor,
} from "@/lib/utils";

// ---------- Types ----------
interface PageProps {
  params: Promise<{ id: string }>;
}

type AssessmentWithAnswers = {
  id: string;
  type: string;
  status: string;
  score: number | null;
  createdAt: Date;
  userId: string;
  user: { name: string | null; id: string };
  answers: {
    id: string;
    value: string;
    questionId: string;
    question: {
      id: string;
      text: string;
      category: string;
      type: string;
      options: string | null;
      order: number;
    };
  }[];
};

// ---------- Server Component ----------
export default async function MediatorCaseDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const familyCase = await prisma.familyCase.findUnique({
    where: { id },
    include: {
      parentA: {
        select: { id: true, name: true, email: true, phone: true, profession: true },
      },
      parentB: {
        select: { id: true, name: true, email: true, phone: true, profession: true },
      },
      children: true,
      mediator: {
        select: { id: true, name: true, email: true },
      },
      assessments: {
        include: {
          user: { select: { name: true, id: true } },
          answers: {
            include: {
              question: true,
            },
            orderBy: { question: { order: "asc" } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: {
          sender: { select: { name: true, id: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      agreements: {
        orderBy: { createdAt: "desc" },
      },
      mediatorNotes: {
        include: {
          mediator: { select: { name: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      reports: {
        orderBy: { createdAt: "desc" },
      },
      aiRecommendations: {
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      responsibilityItems: true,
    },
  });

  if (!familyCase) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Case Not Found</h2>
        <p className="text-gray-500 mt-1">The requested case could not be found.</p>
        <Link
          href="/mediator"
          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Back to Cases
        </Link>
      </div>
    );
  }

  // Compute metrics
  const completedAssessments = familyCase.assessments.filter(
    (a) => a.status === "COMPLETED"
  );
  const parentAAssessments = completedAssessments.filter(
    (a) => a.userId === familyCase.parentAId
  );
  const parentBAssessments = completedAssessments.filter(
    (a) => a.userId === familyCase.parentBId
  );

  const latestParentAAssessment = parentAAssessments[0] as
    | AssessmentWithAnswers
    | undefined;
  const latestParentBAssessment = parentBAssessments[0] as
    | AssessmentWithAnswers
    | undefined;

  // Calculate agreement score from latest assessments
  const parentAAnswers =
    latestParentAAssessment?.answers?.reduce(
      (acc, a) => {
        acc[a.questionId] = parseInt(a.value) || 0;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};
  const parentBAnswers =
    latestParentBAssessment?.answers?.reduce(
      (acc, a) => {
        acc[a.questionId] = parseInt(a.value) || 0;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};

  const agreementScore = calculateAgreementScore(parentAAnswers, parentBAnswers);
  const riskLevel = getRiskLevel(agreementScore);

  const conflictMessages = familyCase.messages.filter((m) => m.hasConflict).length;
  const totalMessages = familyCase.messages.length;

  const resolvedAgreements = familyCase.agreements.filter(
    (a) => a.status === "APPROVED"
  ).length;

  // Build timeline data
  const timelineEvents = [
    ...familyCase.auditLogs.map((log) => ({
      id: `audit-${log.id}`,
      type: "event" as const,
      title: log.action,
      description: log.details ?? "",
      date: log.createdAt,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    })),
    ...familyCase.messages.map((msg) => ({
      id: `msg-${msg.id}`,
      type: "message" as const,
      title: msg.subject ?? "Message",
      description: msg.content.slice(0, 120),
      date: msg.createdAt,
      icon: MessageSquare,
      color: msg.hasConflict ? "text-red-600" : "text-emerald-600",
      bg: msg.hasConflict ? "bg-red-50" : "bg-emerald-50",
    })),
    ...familyCase.assessments.map((a) => ({
      id: `assess-${a.id}`,
      type: "assessment" as const,
      title: `${a.type.replace(/_/g, " ")} Assessment`,
      description: `Score: ${a.score ?? "N/A"} - ${a.status}`,
      date: a.createdAt,
      icon: ClipboardCheck,
      color: "text-violet-600",
      bg: "bg-violet-50",
    })),
    ...familyCase.agreements.map((a) => ({
      id: `agree-${a.id}`,
      type: "agreement" as const,
      title: `Agreement: ${a.title}`,
      description: `Status: ${a.status}`,
      date: a.createdAt,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
    })),
    ...familyCase.mediatorNotes.map((n) => ({
      id: `note-${n.id}`,
      type: "note" as const,
      title: "Mediator Note",
      description: n.content.slice(0, 120),
      date: n.createdAt,
      icon: StickyNote,
      color: "text-gray-600",
      bg: "bg-gray-50",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Assessment comparison data per category
  const categoryScores = buildCategoryScores(
    latestParentAAssessment,
    latestParentBAssessment
  );

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/mediator"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
              getStatusColor(familyCase.status)
            )}
          >
            {familyCase.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Case Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {familyCase.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Created {formatDate(familyCase.createdAt)} &middot; Last updated{" "}
              {formatRelativeTime(familyCase.updatedAt)}
            </p>
          </div>
          <Link
            href={`/mediator/cases/${id}/reports`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </Link>
        </div>

        {/* People Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <PersonCard
            label="Parent A"
            name={familyCase.parentA.name ?? "Unnamed"}
            email={familyCase.parentA.email}
            details={familyCase.parentA.profession}
            color="blue"
          />
          <PersonCard
            label="Parent B"
            name={familyCase.parentB.name ?? "Unnamed"}
            email={familyCase.parentB.email}
            details={familyCase.parentB.profession}
            color="amber"
          />
          <PersonCard
            label="Mediator"
            name={familyCase.mediator?.name ?? "Unassigned"}
            email={familyCase.mediator?.email}
            details={`${familyCase.children.length} child${
              familyCase.children.length > 1 ? "ren" : ""
            }`}
            color="emerald"
          />
        </div>
      </div>

      {/* Tabs - using HTML details/summary or manual tab implementation */}
      <TabContainer>
        {/* Overview Tab */}
        <TabContent id="overview" label="Overview">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Agreement Score"
                value={
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      getScoreColor(agreementScore)
                    )}
                  >
                    {agreementScore}%
                  </span>
                }
                icon={Scale}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <MetricCard
                label="Risk Level"
                value={
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      riskLevel.color
                    )}
                  >
                    {riskLevel.label}
                  </span>
                }
                icon={AlertTriangle}
                color={riskLevel.color}
                bg={riskLevel.bgColor}
              />
              <MetricCard
                label="Messages"
                value={
                  <span className="text-2xl font-bold text-gray-900">
                    {totalMessages}
                    {conflictMessages > 0 && (
                      <span className="text-sm font-normal text-red-500 ml-1">
                        ({conflictMessages} flagged)
                      </span>
                    )}
                  </span>
                }
                icon={MessageSquare}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <MetricCard
                label="Agreements Resolved"
                value={
                  <span className="text-2xl font-bold text-gray-900">
                    {resolvedAgreements}/{familyCase.agreements.length}
                  </span>
                }
                icon={CheckCircle2}
                color="text-violet-600"
                bg="bg-violet-50"
              />
            </div>

            {/* Parent Comparison Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Parent Assessment Comparison
              </h3>
              {latestParentAAssessment && latestParentBAssessment ? (
                <div className="space-y-4">
                  {categoryScores.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700">
                          {cat.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          Agreement: {cat.agreement}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-blue-600">
                              Parent A: {cat.parentAScore}
                            </span>
                            <span className="text-xs text-amber-600">
                              Parent B: {cat.parentBScore}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-blue-500 rounded-l-full transition-all"
                              style={{
                                width: `${(cat.parentAScore / 5) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-amber-500 rounded-r-full transition-all"
                              style={{
                                width: `${(cat.parentBScore / 5) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            getScoreColor(cat.agreement)
                          )}
                        >
                          {cat.agreement >= 70 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : cat.agreement >= 40 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Both parents need to complete assessments before comparison
                    is available.
                  </p>
                </div>
              )}
            </div>

            {/* Risk Assessment */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Risk Assessment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RiskIndicator
                  label="Communication Risk"
                  level={
                    conflictMessages > 5
                      ? "High"
                      : conflictMessages > 2
                      ? "Medium"
                      : "Low"
                  }
                  value={totalMessages > 0 ? Math.round((conflictMessages / totalMessages) * 100) : 0}
                />
                <RiskIndicator
                  label="Agreement Risk"
                  level={
                    resolvedAgreements === 0 && familyCase.agreements.length > 0
                      ? "High"
                      : resolvedAgreements >=
                        Math.ceil(familyCase.agreements.length / 2)
                      ? "Low"
                      : "Medium"
                  }
                  value={
                    familyCase.agreements.length > 0
                      ? Math.round(
                          (resolvedAgreements / familyCase.agreements.length) *
                            100
                        )
                      : 0
                  }
                />
                <RiskIndicator
                  label="Overall Risk"
                  level={riskLevel.label}
                  value={agreementScore}
                />
              </div>
            </div>
          </div>
        </TabContent>

        {/* Assessment Tab */}
        <TabContent id="assessment" label="Assessment">
          {completedAssessments.length > 0 ? (
            <div className="space-y-6">
              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Parent A Assessment */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    {familyCase.parentA.name ?? "Parent A"}&apos;s Responses
                  </h3>
                  {latestParentAAssessment ? (
                    <div className="space-y-4">
                      {latestParentAAssessment.answers
                        .sort((a, b) => a.question.order - b.question.order)
                        .map((answer) => (
                          <div key={answer.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                            <p className="text-sm font-medium text-gray-700">
                              {answer.question.text}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {answer.question.type === "RATING" ||
                              answer.question.type === "SCALE"
                                ? `${answer.value}/5`
                                : answer.value}
                            </p>
                            <span className="text-xs text-gray-400">
                              {answer.question.category}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No assessment completed
                    </p>
                  )}
                </div>

                {/* Parent B Assessment */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    {familyCase.parentB.name ?? "Parent B"}&apos;s Responses
                  </h3>
                  {latestParentBAssessment ? (
                    <div className="space-y-4">
                      {latestParentBAssessment.answers
                        .sort((a, b) => a.question.order - b.question.order)
                        .map((answer) => (
                          <div key={answer.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                            <p className="text-sm font-medium text-gray-700">
                              {answer.question.text}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {answer.question.type === "RATING" ||
                              answer.question.type === "SCALE"
                                ? `${answer.value}/5`
                                : answer.value}
                            </p>
                            <span className="text-xs text-gray-400">
                              {answer.question.category}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No assessment completed
                    </p>
                  )}
                </div>
              </div>

              {/* Agreement Scores per Category */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Agreement Scores by Category
                </h3>
                <div className="space-y-4">
                  {categoryScores.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {cat.category}
                        </p>
                        <p className="text-xs text-gray-500">
                          Parent A: {cat.parentAScore}/5 &middot; Parent B:{" "}
                          {cat.parentBScore}/5
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              cat.agreement >= 70
                                ? "bg-emerald-500"
                                : cat.agreement >= 40
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${cat.agreement}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            getScoreColor(cat.agreement)
                          )}
                        >
                          {cat.agreement}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No Assessments Yet
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Assessments need to be completed by both parents before
                comparison data is available.
              </p>
            </div>
          )}
        </TabContent>

        {/* Communication Tab */}
        <TabContent id="communication" label="Communication">
          <div className="space-y-6">
            {/* Pattern Analysis */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PatternCard
                label="Total Messages"
                value={totalMessages}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <PatternCard
                label="Flagged Messages"
                value={conflictMessages}
                color="text-red-600"
                bg="bg-red-50"
              />
              <PatternCard
                label="Conflict Rate"
                value={
                  totalMessages > 0
                    ? `${Math.round((conflictMessages / totalMessages) * 100)}%`
                    : "0%"
                }
                color="text-amber-600"
                bg="bg-amber-50"
              />
            </div>

            {/* Message History */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  Message History
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {familyCase.messages.length > 0 ? (
                  familyCase.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {msg.sender.name ?? "Unknown"}
                            </p>
                            {msg.hasConflict && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                <AlertTriangle className="w-3 h-3" />
                                Flagged
                              </span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">
                              {formatDateTime(msg.createdAt)}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-sm text-gray-700 mt-0.5 font-medium">
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {msg.content}
                          </p>
                          {msg.conflictScore != null && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-xs text-gray-400">
                                Conflict Score:
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  msg.conflictScore > 0.5
                                    ? "text-red-600"
                                    : msg.conflictScore > 0.3
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                )}
                              >
                                {Math.round(msg.conflictScore * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center">
                    <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No messages in this case
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabContent>

        {/* Timeline Tab */}
        <TabContent id="timeline" label="Timeline">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Case Timeline
            </h3>
            {timelineEvents.length > 0 ? (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-0">
                  {timelineEvents.map((event, idx) => {
                    const Icon = event.icon;
                    return (
                      <div key={event.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                        <div
                          className={cn(
                            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            event.bg
                          )}
                        >
                          <Icon
                            className={cn("w-4 h-4", event.color)}
                          />
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-sm font-medium text-gray-900">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDateTime(event.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No timeline events yet
                </p>
              </div>
            )}
          </div>
        </TabContent>

        {/* Reports Tab */}
        <TabContent id="reports" label="Reports">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Generated Reports
              </h3>
              <Link
                href={`/mediator/cases/${id}/reports`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Generate New Report
              </Link>
            </div>

            {familyCase.reports.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Generated
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {familyCase.reports.map((report) => (
                        <tr
                          key={report.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {report.type.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {formatDateTime(report.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/mediator/cases/${id}/reports`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No Reports Yet
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Generate your first mediation report for this case.
                </p>
              </div>
            )}
          </div>
        </TabContent>

        {/* Notes Tab */}
        <TabContent id="notes" label="Notes">
          <MediatorNotesSection
            caseId={id}
            notes={familyCase.mediatorNotes}
            mediatorName={session.user.name ?? "You"}
          />
        </TabContent>

        {/* Recommendations Tab */}
        <TabContent id="recommendations" label="Recommendations">
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-gray-900">
              AI-Generated Recommendations
            </h3>

            {familyCase.aiRecommendations.length > 0 ? (
              <div className="space-y-4">
                {familyCase.aiRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {rec.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(rec.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {rec.content}
                        </p>
                        {rec.context && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Context &amp; Explainability
                            </p>
                            <p className="text-sm text-gray-600">
                              {rec.context}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No Recommendations
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  AI recommendations will appear here once assessment data is
                  available for analysis.
                </p>
              </div>
            )}
          </div>
        </TabContent>
      </TabContainer>
    </div>
  );
}

// ---------- Helper Components ----------

function PersonCard({
  label,
  name,
  email,
  details,
  color,
}: {
  label: string;
  name: string;
  email?: string | null;
  details?: string | null;
  color: "blue" | "amber" | "emerald";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
          colorClasses[color]
        )}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        {email && (
          <p className="text-xs text-gray-400 truncate">{email}</p>
        )}
        {details && <p className="text-xs text-gray-400">{details}</p>}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}
        >
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <div>{value}</div>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function RiskIndicator({
  label,
  level,
  value,
}: {
  label: string;
  level: string;
  value: number;
}) {
  const levelColor =
    level === "Low"
      ? "text-emerald-600"
      : level === "Medium"
      ? "text-amber-600"
      : "text-red-600";
  const levelBg =
    level === "Low"
      ? "bg-emerald-50"
      : level === "Medium"
      ? "bg-amber-50"
      : "bg-red-50";

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          levelBg,
          levelColor
        )}
      >
        {level}
      </span>
      <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            level === "Low"
              ? "bg-emerald-500"
              : level === "Medium"
              ? "bg-amber-500"
              : "bg-red-500"
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function PatternCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div
          className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}
        >
          <div className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ---------- Tab Container (Client-like with Server) ----------
// Using <details>/<summary> for tab behavior since this is a server component
function TabContainer({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

function TabContent({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{label}</h2>
      {children}
    </div>
  );
}

// ---------- Notes Section (Server Rendered) ----------
async function MediatorNotesSection({
  caseId,
  notes,
  mediatorName,
}: {
  caseId: string;
  notes: {
    id: string;
    content: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    mediator: { name: string | null; id: string };
  }[];
  mediatorName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Private Notes
        </h3>

        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {note.type === "CONFIDENTIAL" ? "Confidential" : "Note"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <StickyNote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notes yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Helper Functions ----------
function buildCategoryScores(
  parentAAssessment?: AssessmentWithAnswers,
  parentBAssessment?: AssessmentWithAnswers
) {
  if (!parentAAssessment || !parentBAssessment) return [];

  const categories = new Map<
    string,
    { parentAScores: number[]; parentBScores: number[] }
  >();

  parentAAssessment.answers.forEach((a) => {
    const cat = a.question.category;
    if (!categories.has(cat)) {
      categories.set(cat, { parentAScores: [], parentBScores: [] });
    }
    categories.get(cat)!.parentAScores.push(parseInt(a.value) || 0);
  });

  parentBAssessment.answers.forEach((a) => {
    const cat = a.question.category;
    if (!categories.has(cat)) {
      categories.set(cat, { parentAScores: [], parentBScores: [] });
    }
    categories.get(cat)!.parentBScores.push(parseInt(a.value) || 0);
  });

  return Array.from(categories.entries()).map(([category, scores]) => {
    const parentAScore =
      scores.parentAScores.length > 0
        ? Math.round(
            scores.parentAScores.reduce((a, b) => a + b, 0) /
              scores.parentAScores.length
          )
        : 0;
    const parentBScore =
      scores.parentBScores.length > 0
        ? Math.round(
            scores.parentBScores.reduce((a, b) => a + b, 0) /
              scores.parentBScores.length
          )
        : 0;

    const diff = Math.abs(parentAScore - parentBScore);
    const agreement = Math.round((1 - diff / 5) * 100);

    return { category, parentAScore, parentBScore, agreement };
  });
}
