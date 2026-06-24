import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

const URGENCY_VARIANTS: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const STATUS_VARIANTS: Record<string, "warning" | "info" | "success" | "destructive"> = {
  open: "warning",
  accepted: "info",
  completed: "success",
  declined: "destructive",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Clock className="h-3 w-3 mr-1" />,
  accepted: <ArrowUpRight className="h-3 w-3 mr-1" />,
  completed: <CheckCircle2 className="h-3 w-3 mr-1" />,
  declined: <XCircle className="h-3 w-3 mr-1" />,
};

export default async function HelpRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };
  const isAdmin = user.role === "ADMIN" || user.role === "MEDIATOR";

  const caseWhere = isAdmin ? {} : {
    OR: [{ parentAId: user.id }, { parentBId: user.id }, { mediatorId: user.id }],
  };

  const requests = await prisma.helpRequest.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    where: isAdmin ? undefined : {
      OR: [{ requesterId: user.id }, { familyCase: caseWhere }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      responder: { select: { id: true, name: true } },
      familyCase: { select: { id: true, title: true } },
    },
  });

  const openCount = requests.filter((r) => r.status === "open").length;
  const inProgressCount = requests.filter(
    (r) => r.status === "accepted"
  ).length;
  const completedCount = requests.filter(
    (r) => r.status === "completed"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help Requests</h1>
        <p className="text-gray-500 mt-1">
          View help and support requests across all your cases.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <LifeBuoy className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
          <p className="text-sm text-gray-500">Total Requests</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <AlertTriangle className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-600">{openCount}</p>
          <p className="text-sm text-gray-500">Open</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <ArrowUpRight className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-blue-600">
            {inProgressCount}
          </p>
          <p className="text-sm text-gray-500">In Progress</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            {completedCount}
          </p>
          <p className="text-sm text-gray-500">Resolved</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            All Help Requests
          </h2>
        </div>

        {requests.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/cases/${request.familyCaseId}/help`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {request.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {request.familyCase.title}
                    {request.requester && (
                      <span> — By {request.requester.name}</span>
                    )}
                    <span> — {formatRelativeTime(request.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Badge
                    variant={URGENCY_VARIANTS[request.urgency] || "secondary"}
                  >
                    {request.urgency}
                  </Badge>
                  <Badge
                    variant={STATUS_VARIANTS[request.status] || "outline"}
                  >
                    {STATUS_ICONS[request.status]}
                    {request.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <LifeBuoy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              No help requests yet
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Help requests from your cases will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
