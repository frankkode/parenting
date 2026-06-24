import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { CasesFilters } from "./cases-filters";

interface CasesPageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUS_OPTIONS = ["ACTIVE", "PENDING", "CLOSED", "ARCHIVED"] as const;

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name?: string; role: string };
  const isAdmin = user.role === "ADMIN" || user.role === "MEDIATOR";

  const params = await searchParams;
  const statusFilter = params.status;
  const searchQuery = params.q;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Non-admin users can only see cases they're part of
  if (!isAdmin) {
    where.OR = [
      { parentAId: user.id },
      { parentBId: user.id },
      { mediatorId: user.id },
    ];
  }

  if (statusFilter && STATUS_OPTIONS.includes(statusFilter as typeof STATUS_OPTIONS[number])) {
    where.status = statusFilter;
  }
  if (searchQuery) {
    // Merge search query with existing OR for non-admin users
    const searchOR = [
      { title: { contains: searchQuery } },
      { parentA: { name: { contains: searchQuery } } },
      { parentB: { name: { contains: searchQuery } } },
    ];
    if (where.OR) {
      // For non-admin: must satisfy both participant check AND search
      where.AND = [
        { OR: where.OR as any },
        { OR: searchOR },
      ];
      delete where.OR;
    } else {
      where.OR = searchOR;
    }
  }

  const cases = await prisma.familyCase.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      parentA: { select: { id: true, name: true, email: true } },
      parentB: { select: { id: true, name: true, email: true } },
      mediator: { select: { id: true, name: true } },
      _count: {
        select: {
          children: true,
          messages: true,
          assessments: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-gray-500 mt-1">
            Manage and view all family cases.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Case
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <CasesFilters statusFilter={statusFilter} searchQuery={searchQuery} />

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {cases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Parents
                  </th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Mediator
                  </th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Details
                  </th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((caseItem) => {
                  const statusColorMap: Record<string, string> = {
                    ACTIVE: "bg-emerald-50 text-emerald-700",
                    PENDING: "bg-amber-50 text-amber-700",
                    CLOSED: "bg-gray-50 text-gray-600",
                    ARCHIVED: "bg-gray-100 text-gray-500",
                  };
                  const statusClass =
                    statusColorMap[caseItem.status] ??
                    "bg-gray-50 text-gray-600";

                  return (
                    <tr
                      key={caseItem.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/cases/${caseItem.id}`}
                          className="font-medium text-gray-900 hover:text-emerald-600 transition-colors"
                        >
                          {caseItem.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${statusClass}`}
                        >
                          {caseItem.status.charAt(0) +
                            caseItem.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-900">
                          {caseItem.parentA.name ?? caseItem.parentA.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {caseItem.parentB.name ?? caseItem.parentB.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {caseItem.mediator?.name ?? (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{caseItem._count.children} children</span>
                          <span>{caseItem._count.messages} messages</span>
                          <span>{caseItem._count.assessments} assessments</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(caseItem.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No cases found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || statusFilter
                ? "Try adjusting your search or filter."
                : "Get started by creating your first case."}
            </p>
            {!searchQuery && !statusFilter && isAdmin && (
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Case
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {cases.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {cases.length} case{cases.length !== 1 ? "s" : ""}
          {statusFilter ? ` with status "${statusFilter.toLowerCase()}"` : ""}
          {searchQuery ? ` matching "${searchQuery}"` : ""}
        </p>
      )}
    </div>
  );
}
