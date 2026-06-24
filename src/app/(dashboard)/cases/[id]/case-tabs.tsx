"use client";

import { useState } from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import {
  Info,
  GraduationCap,
  ClipboardCheck,
  Calendar,
  MessageSquare,
  FileText,
  HelpCircle,
  Mail,
  Phone,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  BarChart3,
  Target,
  Heart,
  TrendingUp,
  StickyNote,
  Users,
  Plus,
  Loader2,
} from "lucide-react";
// --- Type definitions ---

interface TabContent {
  overview: {
    label: string;
    content: {
      parentA: { id: string; name: string | null; email: string; phone: string | null; profession: string | null };
      parentB: { id: string; name: string | null; email: string; phone: string | null; profession: string | null };
      mediator: { id: string; name: string | null; email: string } | null;
      children: Array<{ id: string; name: string; age: number; school: string | null; grade: string | null; notes: string | null }>;
      createdAt: Date;
      updatedAt: Date;
    };
  };
  children: {
    label: string;
    content: Array<{ id: string; name: string; age: number; school: string | null; grade: string | null; notes: string | null }>;
  };
  assessments: {
    label: string;
    content: Array<{
      id: string;
      type: string;
      status: string;
      score: number | null;
      createdAt: Date;
      user: { name: string | null };
    }>;
  };
  calendar: {
    label: string;
    content: Array<{
      id: string;
      title: string;
      description: string | null;
      startDate: Date;
      endDate: Date;
      type: string;
      color: string | null;
      user: { name: string | null };
    }>;
  };
  messages: {
    label: string;
    content: Array<{
      id: string;
      subject: string | null;
      content: string;
      isRead: boolean;
      hasConflict: boolean;
      createdAt: Date;
      sender: { name: string | null; image: string | null };
    }>;
  };
  agreements: {
    label: string;
    content: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      status: string;
      version: number;
      createdAt: Date;
      createdBy: { name: string | null };
    }>;
  };
  helpRequests: {
    label: string;
    content: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      status: string;
      urgency: string;
      createdAt: Date;
      requester: { name: string | null };
      responder: { name: string | null } | null;
    }>;
  };
}

interface CaseTabsProps {
  caseId: string;
  tabs: TabContent;
  isAdmin?: boolean;
  parentAId?: string;
  parentBId?: string;
}

// --- Status helpers ---

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    DRAFT: "bg-gray-50 text-gray-600",
    OPEN: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CLOSED: "bg-gray-50 text-gray-600",
    ARCHIVED: "bg-gray-100 text-gray-500",
    RESOLVED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-600",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
        colors[status] ?? "bg-gray-50 text-gray-600"
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </span>
  );
};

const urgencyIcon = (urgency: string) => {
  switch (urgency) {
    case "HIGH":
    case "URGENT":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "MEDIUM":
      return <Clock className="w-4 h-4 text-amber-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

// --- Tab Panel Components ---

function OverviewPanel({ data }: { data: TabContent["overview"]["content"] }) {
  return (
    <div className="space-y-6">
      {/* Parents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Parent A
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">
              {data.parentA.name ?? "Unknown"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              {data.parentA.email}
            </div>
            {data.parentA.phone && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                {data.parentA.phone}
              </div>
            )}
            {data.parentA.profession && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Briefcase className="w-3.5 h-3.5" />
                {data.parentA.profession}
              </div>
            )}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Parent B
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">
              {data.parentB.name ?? "Unknown"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              {data.parentB.email}
            </div>
            {data.parentB.phone && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                {data.parentB.phone}
              </div>
            )}
            {data.parentB.profession && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Briefcase className="w-3.5 h-3.5" />
                {data.parentB.profession}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mediator */}
      {data.mediator && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Mediator
          </h3>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {data.mediator.name ?? "Unknown"}
            </p>
            <p className="text-xs text-gray-500">{data.mediator.email}</p>
          </div>
        </div>
      )}

      {/* Children Summary */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Children ({data.children.length})
        </h3>
        {data.children.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.children.map((child) => (
              <div
                key={child.id}
                className="bg-gray-50 rounded-lg px-3 py-2.5"
              >
                <p className="text-sm font-medium text-gray-900">
                  {child.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Age {child.age}
                  {child.grade && ` - Grade ${child.grade}`}
                </p>
                {child.school && (
                  <p className="text-xs text-gray-400">{child.school}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No children added yet.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Timeline
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-900">
              {formatDate(data.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Last Updated</span>
            <span className="text-gray-900">
              {formatDate(data.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildrenPanel({
  data,
}: {
  data: TabContent["children"]["content"];
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">No children</p>
        <p className="text-sm text-gray-500 mt-1">
          No children have been added to this case yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((child) => (
        <div
          key={child.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            {child.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Age: {child.age}</p>
          {child.grade && (
            <p className="text-sm text-gray-500">Grade: {child.grade}</p>
          )}
          {child.school && (
            <p className="text-sm text-gray-500">School: {child.school}</p>
          )}
          {child.notes && (
            <p className="text-xs text-gray-400 mt-2 italic">
              {child.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function AssessmentsPanel({
  data,
  caseId,
  isAdmin,
  parentAId,
  parentBId,
}: {
  data: TabContent["assessments"]["content"];
  caseId: string;
  isAdmin?: boolean;
  parentAId?: string;
  parentBId?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  const handleCreateAssessment = async (userId: string, userName: string) => {
    try {
      setCreating(true);
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          type: "CO_PARENTING",
          targetUserId: userId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success(`Assessment created for ${userName}`);
      window.location.reload();
    } catch {
      toast.error("Failed to create assessment");
    } finally {
      setCreating(false);
    }
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    try {
      setPublishing(assessmentId);
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      toast.success("Assessment published");
      window.location.reload();
    } catch {
      toast.error("Failed to publish assessment");
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin: quick assign */}
      {isAdmin && parentAId && parentBId && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            Assign Assessment:
          </span>
          <button
            onClick={() => handleCreateAssessment(parentAId, "Parent A")}
            disabled={creating}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {creating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Parent A
          </button>
          <button
            onClick={() => handleCreateAssessment(parentBId, "Parent B")}
            disabled={creating}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {creating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Parent B
          </button>
        </div>
      )}

      {data.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            No assessments yet
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Assign assessments to parents using the buttons above."
              : "Assessments will appear here once they are created."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((assessment) => (
            <div
              key={assessment.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-start gap-3">
                <ClipboardCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {assessment.type.charAt(0) +
                      assessment.type.slice(1).toLowerCase().replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    By {assessment.user.name ?? "Unknown"} -{" "}
                    {formatDate(assessment.createdAt)}
                  </p>
                  {assessment.score !== null && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Score: {assessment.score.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && assessment.status === "PENDING" && (
                  <button
                    onClick={() => handlePublishAssessment(assessment.id)}
                    disabled={publishing === assessment.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {publishing === assessment.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Publish
                  </button>
                )}
                <Link
                  href={`/cases/${caseId}/assessments`}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View All
                </Link>
                {statusBadge(assessment.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarPanel({
  data,
  caseId: panelCaseId,
}: {
  data: TabContent["calendar"]["content"];
  caseId: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">No events</p>
        <p className="text-sm text-gray-500 mt-1">
          No upcoming or past events for this case.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((event) => (
        <div
          key={event.id}
          className="border border-gray-200 rounded-lg p-4 flex items-start gap-3"
        >
          <div
            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: event.color ?? "#3B82F6" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{event.title}</p>
            {event.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {event.description}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(event.startDate)} - {event.user.name ?? "Unknown"}
            </p>
          </div>
          <span className="text-xs text-gray-400 capitalize flex-shrink-0">
            {event.type.toLowerCase()}
          </span>
        </div>
      ))}
      <div className="text-center pt-2">
        <Link
          href={`/calendar?caseId=${panelCaseId}`}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
        >
          View full calendar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function MessagesPanel({
  data,
}: {
  data: TabContent["messages"]["content"];
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">No messages</p>
        <p className="text-sm text-gray-500 mt-1">
          No messages have been exchanged in this case.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((message) => (
        <div
          key={message.id}
          className="border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
              {message.sender.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {message.subject ?? "(No subject)"}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {message.hasConflict && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  {!message.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                From {message.sender.name ?? "Unknown"} -{" "}
                {formatDate(message.createdAt)}
              </p>
              <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgreementsPanel({
  data,
}: {
  data: TabContent["agreements"]["content"];
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">
          No agreements yet
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Agreements will appear here once created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((agreement) => (
        <Link
          key={agreement.id}
          href={`/agreements/${agreement.id}`}
          className="block border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {agreement.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {agreement.type.replace(/_/g, " ")} - v{agreement.version}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Created by {agreement.createdBy.name ?? "Unknown"} -{" "}
                  {formatDate(agreement.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {statusBadge(agreement.status)}
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function HelpRequestsPanel({
  data,
}: {
  data: TabContent["helpRequests"]["content"];
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">
          No help requests
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Help requests will appear here once submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((request) => (
        <div
          key={request.id}
          className="border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {urgencyIcon(request.urgency)}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {request.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {request.type.replace(/_/g, " ")} - Requested by{" "}
                  {request.requester.name ?? "Unknown"}
                </p>
                {request.responder && (
                  <p className="text-xs text-gray-400">
                    Assigned to {request.responder.name}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(request.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {statusBadge(request.status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkTabPanel({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-4"
      >
        Open full page <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// --- Main Tabs Component ---

export function CaseTabs({ caseId, tabs, isAdmin, parentAId, parentBId }: CaseTabsProps) {

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    overview: Info,
    children: GraduationCap,
    assessments: ClipboardCheck,
    analysis: BarChart3,
    comparison: Users,
    responsibilities: Target,
    childImpact: Heart,
    growth: TrendingUp,
    calendar: Calendar,
    messages: MessageSquare,
    notes: StickyNote,
    agreements: FileText,
    helpRequests: HelpCircle,
  };

  const tabList = [
    { key: "overview", ...tabs.overview },
    { key: "children", ...tabs.children },
    { key: "assessments", ...tabs.assessments, adminOnly: false },
    ...(isAdmin
      ? [
          { key: "analysis" as const, ...tabs.assessments, label: "Analysis" },
          { key: "comparison" as const, ...tabs.assessments, label: "Comparison" },
          { key: "responsibilities" as const, ...tabs.assessments, label: "Responsibilities" },
          { key: "childImpact" as const, ...tabs.assessments, label: "Child Impact" },
          { key: "growth" as const, ...tabs.assessments, label: "Growth" },
        ]
      : []),
    { key: "calendar", ...tabs.calendar },
    { key: "messages", ...tabs.messages },
    ...(isAdmin
      ? [{ key: "notes" as const, ...tabs.assessments, label: "Notes" }]
      : []),
    { key: "agreements", ...tabs.agreements },
    { key: "helpRequests", ...tabs.helpRequests },
  ] as const;

  return (
    <Root defaultValue="overview" className="w-full">
      <List className="flex border-b border-gray-200 overflow-x-auto -mx-1 px-1">
        {tabList.map(({ key, label }) => {
          const Icon = iconMap[key];
          return (
          <Trigger
            key={key}
            value={key}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent",
              "text-gray-500 hover:text-gray-700 hover:border-gray-300",
              "transition-all",
              "data-[state=active]:text-emerald-600 data-[state=active]:border-emerald-600"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Trigger>
          );
        })}
      </List>

      <div className="mt-6">
        <Content value="overview">
          <OverviewPanel data={tabs.overview.content} />
        </Content>

        <Content value="children">
          <ChildrenPanel data={tabs.children.content} />
        </Content>

        <Content value="assessments">
          <AssessmentsPanel
            data={tabs.assessments.content}
            caseId={caseId}
            isAdmin={isAdmin}
            parentAId={parentAId}
            parentBId={parentBId}
          />
        </Content>

        {isAdmin && (
          <Content value="analysis">
            <LinkTabPanel
              icon={BarChart3}
              title="Case Analysis"
              description="Comprehensive analysis of communication, agreements, and progress"
              href={`/cases/${caseId}/analysis`}
            />
          </Content>
        )}

        {isAdmin && (
          <Content value="comparison">
            <LinkTabPanel
              icon={Users}
              title="Parent Comparison"
              description="Side-by-side comparison of parent assessments with charts and gap analysis"
              href={`/cases/${caseId}/comparison`}
            />
          </Content>
        )}

        {isAdmin && (
          <Content value="responsibilities">
            <LinkTabPanel
              icon={Target}
              title="Responsibilities"
              description="Track and manage parenting task distribution"
              href={`/cases/${caseId}/responsibilities`}
            />
          </Content>
        )}

        {isAdmin && (
          <Content value="childImpact">
            <LinkTabPanel
              icon={Heart}
              title="Child Impact Assessment"
              description="Evaluate how arrangements affect each child"
              href={`/cases/${caseId}/child-impact`}
            />
          </Content>
        )}

        {isAdmin && (
          <Content value="growth">
            <LinkTabPanel
              icon={TrendingUp}
              title="Parent Growth Tracking"
              description="Track co-parenting skill development over time"
              href={`/cases/${caseId}/growth`}
            />
          </Content>
        )}

        <Content value="calendar">
          <CalendarPanel data={tabs.calendar.content} caseId={caseId} />
        </Content>

        <Content value="messages">
          <MessagesPanel data={tabs.messages.content} />
        </Content>

        {isAdmin && (
          <Content value="notes">
            <LinkTabPanel
              icon={StickyNote}
              title="Shared Notes"
              description="Collaborative notes visible to all case participants"
              href={`/cases/${caseId}/notes`}
            />
          </Content>
        )}

        <Content value="agreements">
          <AgreementsPanel data={tabs.agreements.content} />
        </Content>

        <Content value="helpRequests">
          <HelpRequestsPanel data={tabs.helpRequests.content} />
        </Content>
      </div>
    </Root>
  );
}
