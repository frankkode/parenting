import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { CaseTabs } from "./case-tabs";

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUser = session.user as { id: string; name?: string; role: string };
  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";

  const { id } = await params;

  const caseItem = await prisma.familyCase.findUnique({
    where: { id },
    include: {
      parentA: { select: { id: true, name: true, email: true, phone: true, profession: true } },
      parentB: { select: { id: true, name: true, email: true, phone: true, profession: true } },
      mediator: { select: { id: true, name: true, email: true } },
      children: true,
      assessments: {
        orderBy: { createdAt: "desc" },
        where: isAdmin
          ? undefined
          : { userId: currentUser.id },
        include: {
          user: { select: { name: true } },
        },
      },
      events: {
        orderBy: { startDate: "asc" },
        take: 5,
        include: {
          user: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          sender: { select: { name: true, image: true } },
        },
      },
      agreements: {
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: { select: { name: true } },
        },
      },
      helpRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          requester: { select: { name: true } },
          responder: { select: { name: true } },
        },
      },
    },
  });

  if (!caseItem) {
    notFound();
  }

  // Verify parent users are participants of this case
  if (!isAdmin) {
    const isParticipant =
      caseItem.parentAId === currentUser.id ||
      caseItem.parentBId === currentUser.id ||
      caseItem.mediatorId === currentUser.id;
    if (!isParticipant) {
      redirect("/dashboard");
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
    CLOSED: "bg-gray-50 text-gray-600 ring-gray-500/20",
    ARCHIVED: "bg-gray-100 text-gray-500 ring-gray-400/20",
  };

  const tabData = {
    overview: {
      label: "Overview",
      content: {
        parentA: caseItem.parentA,
        parentB: caseItem.parentB,
        mediator: caseItem.mediator,
        children: caseItem.children,
        createdAt: caseItem.createdAt,
        updatedAt: caseItem.updatedAt,
      },
    },
    children: {
      label: `Children (${caseItem.children.length})`,
      content: caseItem.children,
    },
    assessments: {
      label: `Assessments (${caseItem.assessments.length})`,
      content: caseItem.assessments,
    },
    calendar: {
      label: "Calendar",
      content: caseItem.events,
    },
    messages: {
      label: `Messages (${caseItem.messages.length})`,
      content: caseItem.messages,
    },
    agreements: {
      label: `Agreements (${caseItem.agreements.length})`,
      content: caseItem.agreements,
    },
    helpRequests: {
      label: `Help Requests (${caseItem.helpRequests.length})`,
      content: caseItem.helpRequests,
    },
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </Link>
      </div>

      {/* Case header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {caseItem.title}
            </h1>
            <span
              className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${
                statusColors[caseItem.status] ??
                "bg-gray-50 text-gray-600 ring-gray-500/20"
              }`}
            >
              {caseItem.status.charAt(0) + caseItem.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            Created {formatDate(caseItem.createdAt)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <CaseTabs
        caseId={caseItem.id}
        tabs={tabData}
        isAdmin={isAdmin}
        parentAId={caseItem.parentAId}
        parentBId={caseItem.parentBId}
      />
    </div>
  );
}
