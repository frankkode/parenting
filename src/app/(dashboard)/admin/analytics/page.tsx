"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn, getCategoryColor, getScoreColor } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

// ---------- Mock Data ----------

const monthlyCaseData = [
  { month: "Jan", cases: 8 },
  { month: "Feb", cases: 12 },
  { month: "Mar", cases: 15 },
  { month: "Apr", cases: 10 },
  { month: "May", cases: 18 },
  { month: "Jun", cases: 14 },
];

const conflictByCategory = [
  { category: "Communication", count: 24 },
  { category: "Parenting", count: 18 },
  { category: "Schedule", count: 15 },
  { category: "Financial", count: 22 },
  { category: "Education", count: 8 },
  { category: "Childcare", count: 12 },
];

const caseStatusDistribution = [
  { name: "Active", value: 28, color: "#3B82F6" },
  { name: "Under Mediation", value: 15, color: "#F59E0B" },
  { name: "Resolved", value: 32, color: "#10B981" },
  { name: "Closed", value: 8, color: "#6B7280" },
];

const assessmentCategories = [
  { category: "Communication" },
  { category: "Parenting" },
  { category: "Child Wellbeing" },
  { category: "Financial" },
  { category: "Conflict Resolution" },
  { category: "Cooperation" },
];

const radarData = assessmentCategories.map((cat, i) => ({
  category: cat.category,
  "Parent A": Math.round(50 + Math.random() * 40),
  "Parent B": Math.round(50 + Math.random() * 40),
  Average: Math.round(55 + Math.random() * 35),
}));

const mediatorPerformance = [
  {
    name: "Dr. Sarah Johnson",
    cases: 18,
    resolved: 12,
    rate: 67,
    avgScore: 22,
    rating: 4.8,
  },
  {
    name: "Michael Chen",
    cases: 14,
    resolved: 8,
    rate: 57,
    avgScore: 18,
    rating: 4.5,
  },
  {
    name: "Emily Rodriguez",
    cases: 22,
    resolved: 15,
    rate: 68,
    avgScore: 25,
    rating: 4.9,
  },
  {
    name: "James Wilson",
    cases: 10,
    resolved: 7,
    rate: 70,
    avgScore: 20,
    rating: 4.6,
  },
  {
    name: "Lisa Thompson",
    cases: 16,
    resolved: 11,
    rate: 69,
    avgScore: 21,
    rating: 4.7,
  },
];

type Period = "6M" | "1Y" | "ALL";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("6M");
  const [isExporting, setIsExporting] = useState(false);

  const statsCards = useMemo(
    () => [
      {
        label: "Total Families",
        value: "77",
        change: "+12%",
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        label: "Active Cases",
        value: "43",
        change: "+5%",
        icon: Briefcase,
        color: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        label: "Avg Agreement Score",
        value: "74%",
        change: "+8%",
        icon: TrendingUp,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: "Mediation Success Rate",
        value: "64%",
        change: "+3%",
        icon: BarChart3,
        color: "text-violet-600",
        bg: "bg-violet-50",
      },
    ],
    []
  );

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsExporting(false);
  };

  const totalCases = caseStatusDistribution.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.color }} className="font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">
            Platform performance metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            {(["6M", "1Y", "ALL"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {p === "6M" ? "6 Months" : p === "1Y" ? "1 Year" : "All Time"}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              isExporting
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    card.bg
                  )}
                >
                  <Icon className={cn("w-5 h-5", card.color)} />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-3">
                {card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Line Chart + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Cases Per Month */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            New Cases Per Month
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyCaseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="cases"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Case Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-400" />
            Case Status
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={caseStatusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {caseStatusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {caseStatusDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Bar Chart + Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conflicts by Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Conflicts by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={conflictByCategory}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                {conflictByCategory.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getCategoryColor(index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Assessment Scores Radar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Avg Assessment Scores by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: "#6B7280" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Parent A"
                dataKey="Parent A"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
              />
              <Radar
                name="Parent B"
                dataKey="Parent B"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.1}
              />
              <Radar
                name="Average"
                dataKey="Average"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.1}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mediator Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Mediator Performance Comparison
          </h3>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Export Table
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mediator
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Cases
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resolved
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resolution Rate
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Avg Score Improvement
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mediatorPerformance.map((m, idx) => (
                <tr
                  key={m.name}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700">
                    {m.cases}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-emerald-600 font-medium">
                    {m.resolved}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${m.rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {m.rate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={cn(
                        "font-medium",
                        getScoreColor(m.avgScore)
                      )}
                    >
                      +{m.avgScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700">
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
