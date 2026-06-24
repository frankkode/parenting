"use client";

import { useRouter } from "next/navigation";
import { Search, Filter } from "lucide-react";

const STATUS_OPTIONS = ["ACTIVE", "PENDING", "CLOSED", "ARCHIVED"] as const;

interface CasesFiltersProps {
  statusFilter?: string;
  searchQuery?: string;
}

export function CasesFilters({ statusFilter, searchQuery }: CasesFiltersProps) {
  const router = useRouter();

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.delete("q");
    if (searchQuery) params.set("q", searchQuery);
    router.push(`/cases?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    const params = new URLSearchParams(window.location.search);
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    router.push(`/cases?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <form onSubmit={handleSearch}>
          <input
            type="text"
            name="q"
            defaultValue={searchQuery ?? ""}
            placeholder="Search cases by title or parent name..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </form>
      </div>
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
