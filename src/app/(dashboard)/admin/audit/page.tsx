import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Shield, Search, ArrowRight, Activity } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name?: string; role: string };
  if (user.role !== "ADMIN" && user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const actionFilter = params.action || "";
  const pageSize = 20;

  const where = actionFilter ? { action: { contains: actionFilter } } : {};

  const [logs, totalCount, uniqueActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const actionIcons: Record<string, string> = {
    CREATE: "bg-emerald-50 text-emerald-600",
    UPDATE: "bg-blue-50 text-blue-600",
    DELETE: "bg-red-50 text-red-600",
    LOGIN: "bg-violet-50 text-violet-600",
    LOGOUT: "bg-gray-50 text-gray-600",
    ACCESS: "bg-amber-50 text-amber-600",
    ERROR: "bg-red-50 text-red-600",
  };

  function getActionBadge(action: string) {
    const base = action.split("_")[0] || action;
    return actionIcons[base] || "bg-gray-50 text-gray-600";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 mt-1">
            Track all platform activity and changes
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Total entries: <span className="font-semibold text-gray-900">{totalCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/audit"
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                !actionFilter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All
            </Link>
            {uniqueActions.slice(0, 8).map((a) => (
              <Link
                key={a.action}
                href={`/admin/audit?action=${encodeURIComponent(a.action)}`}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  actionFilter === a.action
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {a.action}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {logs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getActionBadge(log.action)
                        )}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          {log.user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.user.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {log.details || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-16 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No Audit Entries
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {actionFilter
                  ? `No entries found for action "${actionFilter}".`
                  : "No audit log entries have been recorded yet."}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/admin/audit?page=${page - 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  page <= 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Previous
              </Link>
              <Link
                href={`/admin/audit?page=${page + 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  page >= totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
