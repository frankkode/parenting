"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UserCog,
  Briefcase,
  BarChart3,
  Star,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { cn, formatDate, getScoreColor } from "@/lib/utils";

// ---------- Types ----------
interface MediatorData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  activeCases: number;
  resolvedCases: number;
  totalCases: number;
  joinedAt: string;
}

interface CaseData {
  id: string;
  title: string;
  status: string;
  mediatorId: string | null;
  parentA: { id: string; name: string | null; email: string };
  parentB: { id: string; name: string | null; email: string };
}

export default function AdminMediatorsPage() {
  const [mediators, setMediators] = useState<MediatorData[]>([]);
  const [allCases, setAllCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignment, setShowAssignment] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, casesRes] = await Promise.all([
        fetch("/api/users?role=MEDIATOR"),
        fetch("/api/cases"),
      ]);
      if (!usersRes.ok || !casesRes.ok) throw new Error("Failed to fetch");

      const users: {
        id: string;
        name: string | null;
        email: string;
        phone: string | null;
        createdAt: string;
      }[] = await usersRes.json();

      const cases: CaseData[] = await casesRes.json();

      setAllCases(cases);

      // Compute mediator stats from real case data
      const enriched: MediatorData[] = users.map((u) => {
        const mediatorCases = cases.filter((c) => c.mediatorId === u.id);
        const active = mediatorCases.filter(
          (c) => c.status === "ACTIVE" || c.status === "UNDER_MEDIATION"
        ).length;
        const resolved = mediatorCases.filter(
          (c) => c.status === "RESOLVED" || c.status === "CLOSED"
        ).length;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          activeCases: active,
          resolvedCases: resolved,
          totalCases: mediatorCases.length,
          joinedAt: u.createdAt,
        };
      });

      setMediators(enriched);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unassignedCases = allCases.filter((c) => !c.mediatorId);

  const handleAssignCase = async (caseId: string, mediatorId: string) => {
    setIsAssigning(true);
    try {
      const res = await fetch("/api/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: caseId, mediatorId }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      toast.success("Case assigned successfully");
      loadData();
      setShowAssignment(false);
    } catch {
      toast.error("Failed to assign case");
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mediator Management</h1>
          <p className="text-gray-500 mt-1">Loading mediator data...</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mediator Management</h1>
        <p className="text-gray-500 mt-1">
          Manage mediators, assign cases, and track performance
        </p>
      </div>

      {/* Mediator List */}
      <div className="grid grid-cols-1 gap-6">
        {mediators.length > 0 ? (
          mediators.map((mediator) => {
            const resolutionRate =
              mediator.totalCases > 0
                ? Math.round((mediator.resolvedCases / mediator.totalCases) * 100)
                : 0;

            return (
              <div
                key={mediator.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Avatar & Info */}
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700 flex-shrink-0">
                    {mediator.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") ?? "M"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {mediator.name ?? "Unnamed"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {mediator.email}
                      </span>
                      {mediator.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {mediator.phone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Active since {formatDate(mediator.joinedAt)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 w-full sm:w-auto">
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-600">
                        {mediator.activeCases}
                      </p>
                      <p className="text-xs text-gray-500">Active Cases</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-emerald-600">
                        {mediator.resolvedCases}
                      </p>
                      <p className="text-xs text-gray-500">Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">
                        {mediator.totalCases}
                      </p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-500 w-32">
                      Case Resolution Rate
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${resolutionRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {resolutionRate}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No Mediators Found
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Create a user with the Mediator role to see them here.
            </p>
          </div>
        )}
      </div>

      {/* Assign Cases Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-400" />
            Unassigned Cases
          </h2>
          {unassignedCases.length > 0 && (
            <button
              onClick={() => setShowAssignment(!showAssignment)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showAssignment ? "Done" : "Assign Cases"}
            </button>
          )}
        </div>

        {unassignedCases.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {unassignedCases.map((c) => (
              <div
                key={c.id}
                className="px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.parentA?.name ?? "Unknown"} &amp; {c.parentB?.name ?? "Unknown"}
                  </p>
                </div>
                {showAssignment && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignCase(c.id, e.target.value);
                      }
                    }}
                    disabled={isAssigning}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Assign to...</option>
                    {mediators.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name ?? m.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              All cases are assigned to mediators
            </p>
          </div>
        )}
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          Performance Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mediator
                </th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Caseload
                </th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resolved
                </th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resolution Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mediators.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">
                    {m.name ?? "Unnamed"}
                  </td>
                  <td className="px-3 py-3 text-sm text-center text-gray-700">
                    {m.totalCases}
                  </td>
                  <td className="px-3 py-3 text-sm text-center text-emerald-600 font-medium">
                    {m.resolvedCases}
                  </td>
                  <td className="px-3 py-3 text-sm text-center text-gray-700">
                    {m.totalCases > 0
                      ? Math.round((m.resolvedCases / m.totalCases) * 100)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
              {mediators.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500">
                    No mediator data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
