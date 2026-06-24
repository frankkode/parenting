"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UserCog,
  Search,
  Briefcase,
  CheckCircle2,
  BarChart3,
  Star,
  Phone,
  Mail,
  ArrowUpRight,
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
  avgScoreImprovement: number;
  rating: number;
  joinedAt: string;
}

interface CaseAssignment {
  id: string;
  title: string;
  status: string;
  parentA: string;
  parentB: string;
  parentAId: string;
  parentBId: string;
  mediatorId: string | null;
}

// ---------- Mock Data ----------
const mockMediators: MediatorData[] = [
  {
    id: "m1",
    name: "Dr. Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "+1 (555) 456-7890",
    activeCases: 4,
    resolvedCases: 12,
    totalCases: 18,
    avgScoreImprovement: 22,
    rating: 4.8,
    joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
  {
    id: "m2",
    name: "Michael Chen",
    email: "michael.c@example.com",
    phone: "+1 (555) 333-2222",
    activeCases: 3,
    resolvedCases: 8,
    totalCases: 14,
    avgScoreImprovement: 18,
    rating: 4.5,
    joinedAt: new Date(Date.now() - 150 * 86400000).toISOString(),
  },
  {
    id: "m3",
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    phone: "+1 (555) 777-8888",
    activeCases: 5,
    resolvedCases: 15,
    totalCases: 22,
    avgScoreImprovement: 25,
    rating: 4.9,
    joinedAt: new Date(Date.now() - 200 * 86400000).toISOString(),
  },
];

const mockUnassignedCases: CaseAssignment[] = [
  {
    id: "c1",
    title: "Williams Family",
    status: "ACTIVE",
    parentA: "David Williams",
    parentB: "Lisa Williams",
    parentAId: "pa1",
    parentBId: "pb1",
    mediatorId: null,
  },
  {
    id: "c2",
    title: "Garcia Parenting Plan",
    status: "ACTIVE",
    parentA: "Carlos Garcia",
    parentB: "Maria Garcia",
    parentAId: "pa2",
    parentBId: "pb2",
    mediatorId: null,
  },
];

export default function AdminMediatorsPage() {
  const [mediators, setMediators] = useState<MediatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMediator, setSelectedMediator] = useState<string | null>(null);
  const [showAssignment, setShowAssignment] = useState(false);
  const [unassignedCases, setUnassignedCases] = useState<CaseAssignment[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setMediators(mockMediators);
      setUnassignedCases(mockUnassignedCases);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignCase = async (caseId: string, mediatorId: string) => {
    setIsAssigning(true);
    await new Promise((r) => setTimeout(r, 800));
    setUnassignedCases((prev) => prev.filter((c) => c.id !== caseId));
    setMediators((prev) =>
      prev.map((m) =>
        m.id === mediatorId
          ? { ...m, activeCases: m.activeCases + 1, totalCases: m.totalCases + 1 }
          : m
      )
    );
    setIsAssigning(false);
    toast.success("Case assigned successfully");
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
        {mediators.map((mediator) => (
          <div
            key={mediator.id}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Avatar & Info */}
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700 flex-shrink-0">
                {mediator.name?.split(" ").map((n) => n[0]).join("") ?? "M"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {mediator.name}
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
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {mediator.rating}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Active since {formatDate(mediator.joinedAt)}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full sm:w-auto">
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
                <div className="text-center">
                  <p className={cn("text-xl font-bold", getScoreColor(mediator.avgScoreImprovement))}>
                    +{mediator.avgScoreImprovement}%
                  </p>
                  <p className="text-xs text-gray-500">Avg. Improvement</p>
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
                    style={{
                      width: `${
                        mediator.totalCases > 0
                          ? (mediator.resolvedCases / mediator.totalCases) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {mediator.totalCases > 0
                    ? Math.round(
                        (mediator.resolvedCases / mediator.totalCases) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Cases Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-400" />
            Unassigned Cases
          </h2>
          {!showAssignment && unassignedCases.length > 0 && (
            <button
              onClick={() => setShowAssignment(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Assign Cases
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
                    {c.parentA} &amp; {c.parentB}
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
                        {m.name}
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
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Avg. Improvement
                </th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mediators.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">
                    {m.name}
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
                  <td className="px-3 py-3 text-sm text-center font-medium">
                    <span className={getScoreColor(m.avgScoreImprovement)}>
                      +{m.avgScoreImprovement}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-center text-gray-700">
                    {m.rating}/5.0
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
