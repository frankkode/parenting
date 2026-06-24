import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  FileSignature,
} from "lucide-react";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3 w-3 mr-1" />,
  accepted: <CheckCircle2 className="h-3 w-3 mr-1" />,
  signed: <FileSignature className="h-3 w-3 mr-1" />,
  declined: <XCircle className="h-3 w-3 mr-1" />,
  counter_proposal: <RefreshCw className="h-3 w-3 mr-1" />,
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "outline"> = {
  draft: "warning",
  accepted: "success",
  signed: "success",
  declined: "destructive",
  counter_proposal: "info",
};

export default async function AgreementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };
  const isAdmin = user.role === "ADMIN" || user.role === "MEDIATOR";

  const caseWhere = isAdmin ? {} : {
    OR: [{ parentAId: user.id }, { parentBId: user.id }, { mediatorId: user.id }],
  };

  const agreements = await prisma.agreement.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    where: isAdmin ? undefined : { familyCase: caseWhere },
    include: {
      createdBy: { select: { id: true, name: true } },
      familyCase: { select: { id: true, title: true } },
    },
  });

  const draftCount = agreements.filter((a) => a.status === "draft").length;
  const acceptedCount = agreements.filter(
    (a) => a.status === "accepted" || a.status === "signed"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agreements</h1>
        <p className="text-gray-500 mt-1">
          View and manage agreements across all your cases.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <FileText className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {agreements.length}
          </p>
          <p className="text-sm text-gray-500">Total Agreements</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">{acceptedCount}</p>
          <p className="text-sm text-gray-500">Accepted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Clock className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
          <p className="text-sm text-gray-500">Pending / Draft</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            All Agreements
          </h2>
        </div>

        {agreements.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {agreements.map((agreement) => (
              <Link
                key={agreement.id}
                href={`/cases/${agreement.familyCaseId}/agreements`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {agreement.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {agreement.familyCase.title}
                    {agreement.createdBy && (
                      <span> — Created by {agreement.createdBy.name}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <Badge variant="outline" className="text-xs">
                    v{agreement.version}
                  </Badge>
                  <Badge variant={STATUS_VARIANTS[agreement.status] || "outline"}>
                    {STATUS_ICONS[agreement.status]}
                    {agreement.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {formatDate(agreement.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              No agreements yet
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Agreements created for your cases will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
