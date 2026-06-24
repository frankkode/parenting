"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Loader2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living Situation",
  WORK_SITUATION: "Work Situation",
  CHILDCARE_CAPACITY: "Childcare Capacity",
  FINANCIAL_CAPACITY: "Financial Capacity",
  EMOTIONAL_READINESS: "Emotional Readiness",
  CHILD_WELLBEING: "Child Wellbeing",
};

interface QuestionComparison {
  id: string;
  text: string;
  type: string;
  parentAAnswer: string | null;
  parentAScore: number | null;
  parentBAnswer: string | null;
  parentBScore: number | null;
}

interface CategoryData {
  parentA: number | null;
  parentB: number | null;
  questions: QuestionComparison[];
}

interface ComparisonData {
  caseId: string;
  caseTitle: string;
  parentA: string;
  parentB: string;
  parentAOverall: number | null;
  parentBOverall: number | null;
  parentAAssessmentCount: number;
  parentBAssessmentCount: number;
  categories: Record<string, CategoryData>;
}

export default function ComparisonPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/comparison/${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch comparison data");
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      setError(e.message || "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error || "No data available"}</p>
        <button
          onClick={fetchComparison}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare chart data
  const barChartData = Object.entries(data.categories).map(
    ([category, catData]) => ({
      category: CATEGORY_LABELS[category] || category,
      "Parent A": catData.parentA,
      "Parent B": catData.parentB,
    })
  );

  const radarChartData = Object.entries(data.categories).map(
    ([category, catData]) => ({
      category: CATEGORY_LABELS[category] || category,
      "Parent A": catData.parentA || 0,
      "Parent B": catData.parentB || 0,
    })
  );

  const maxScore = Math.max(
    10,
    ...barChartData.flatMap((d) => [
      d["Parent A"] || 0,
      d["Parent B"] || 0,
    ])
  );

  const allQuestions = Object.entries(data.categories).flatMap(
    ([category, catData]) =>
      catData.questions.map((q) => ({
        ...q,
        category,
        categoryLabel: CATEGORY_LABELS[category] || category,
      }))
  );

  const gapCount = allQuestions.filter(
    (q) =>
      q.parentAScore !== null &&
      q.parentBScore !== null &&
      Math.abs(q.parentAScore - q.parentBScore) >= 3
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Parent Comparison: {data.caseTitle}
        </h1>
        <p className="text-gray-500 mt-1">
          Side-by-side analysis of parent assessments across all categories.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Users className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {data.parentAOverall !== null ? `${data.parentAOverall}%` : "N/A"}
          </p>
          <p className="text-sm text-gray-500">Parent A Overall Score</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Users className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-violet-600">
            {data.parentBOverall !== null ? `${data.parentBOverall}%` : "N/A"}
          </p>
          <p className="text-sm text-gray-500">Parent B Overall Score</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <BarChart3 className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            {gapCount}
          </p>
          <p className="text-sm text-gray-500">Significant Gaps (≥3pts)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {data.parentAOverall !== null && data.parentBOverall !== null ? (
            data.parentAOverall > data.parentBOverall ? (
              <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
            ) : data.parentBOverall > data.parentAOverall ? (
              <TrendingDown className="w-5 h-5 text-violet-600 mb-2" />
            ) : (
              <Minus className="w-5 h-5 text-gray-600 mb-2" />
            )
          ) : (
            <Minus className="w-5 h-5 text-gray-400 mb-2" />
          )}
          <p className="text-2xl font-bold">
            {data.parentAOverall !== null && data.parentBOverall !== null
              ? `${Math.abs(data.parentAOverall - data.parentBOverall)}%`
              : "N/A"}
          </p>
          <p className="text-sm text-gray-500">Score Difference</p>
        </div>
      </div>

      {/* Bar Chart - Category Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Category Score Comparison
        </h2>
        {barChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 12 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis domain={[0, maxScore + 1]} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Legend />
              <Bar
                dataKey="Parent A"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Parent B"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            No assessment data available for comparison.
          </p>
        )}
      </div>

      {/* Radar Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Profile Radar
          </h2>
          {radarChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 10]} />
                <Radar
                  name="Parent A"
                  dataKey="Parent A"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Parent B"
                  dataKey="Parent B"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Not enough data for radar chart.
            </p>
          )}
        </div>

        {/* Gap Analysis */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Gap Analysis by Category
          </h2>
          <div className="space-y-3">
            {Object.entries(data.categories).map(([category, catData]) => {
              const gap =
                catData.parentA !== null && catData.parentB !== null
                  ? catData.parentA - catData.parentB
                  : null;
              return (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {CATEGORY_LABELS[category] || category}
                    </p>
                    <p className="text-xs text-gray-500">
                      A: {catData.parentA?.toFixed(1) || "N/A"} / B:{" "}
                      {catData.parentB?.toFixed(1) || "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {gap !== null ? (
                      <>
                        <span
                          className={`text-sm font-bold ${
                            Math.abs(gap) < 1
                              ? "text-emerald-600"
                              : Math.abs(gap) < 3
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {gap > 0 ? "+" : ""}
                          {gap.toFixed(1)}
                        </span>
                        {Math.abs(gap) < 1 ? (
                          <Minus className="w-4 h-4 text-emerald-500" />
                        ) : gap > 0 ? (
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-violet-500" />
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">No data</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question-Level Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Question-by-Question Comparison
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {allQuestions.map((q) => {
            const hasGap =
              q.parentAScore !== null &&
              q.parentBScore !== null &&
              Math.abs(q.parentAScore - q.parentBScore) >= 3;
            return (
              <div
                key={q.id}
                className={`px-5 py-3.5 hover:bg-gray-50 transition-colors ${
                  hasGap ? "bg-amber-50/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 uppercase">
                        {q.categoryLabel}
                      </span>
                      {hasGap && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          Gap
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {q.text}
                    </p>
                    {q.type !== "SLIDER" && (
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>A: &ldquo;{q.parentAAnswer || "No answer"}&rdquo;</span>
                        <span>B: &ldquo;{q.parentBAnswer || "No answer"}&rdquo;</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {q.parentAScore !== null && (
                      <div className="text-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            q.parentAScore !== null && q.parentBScore !== null
                              ? q.parentAScore > q.parentBScore
                                ? "bg-blue-100 text-blue-700"
                                : q.parentAScore < q.parentBScore
                                ? "bg-gray-100 text-gray-600"
                                : "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {q.parentAScore}
                        </div>
                        <span className="text-xs text-gray-400">A</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-300 font-bold">vs</span>
                    {q.parentBScore !== null && (
                      <div className="text-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            q.parentAScore !== null && q.parentBScore !== null
                              ? q.parentBScore > q.parentAScore
                                ? "bg-violet-100 text-violet-700"
                                : q.parentBScore < q.parentAScore
                                ? "bg-gray-100 text-gray-600"
                                : "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {q.parentBScore}
                        </div>
                        <span className="text-xs text-gray-400">B</span>
                      </div>
                    )}
                    {q.parentAScore === null && q.parentBScore === null && (
                      <span className="text-xs text-gray-400">
                        No scores yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
