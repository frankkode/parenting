import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function calculateAgreementScore(
  parentAAnswers: Record<string, number>,
  parentBAnswers: Record<string, number>
): number {
  const questions = Object.keys(parentAAnswers);
  if (questions.length === 0) return 0;

  const totalDifference = questions.reduce((sum, q) => {
    const diff = Math.abs(
      (parentAAnswers[q] ?? 0) - (parentBAnswers[q] ?? 0)
    );
    return sum + diff;
  }, 0);

  const maxPossibleDiff = questions.length * 4;
  const agreementRatio = 1 - totalDifference / maxPossibleDiff;
  return Math.round(agreementRatio * 100);
}

export function getScoreColor(score: number | null | undefined): string {
  if (score == null) return "text-gray-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBgColor(score: number | null | undefined): string {
  if (score == null) return "bg-gray-100";
  if (score >= 80) return "bg-emerald-100";
  if (score >= 60) return "bg-amber-100";
  return "bg-red-100";
}

export function getRiskLevel(score: number | null | undefined): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score == null) return { label: "Unknown", color: "text-gray-500", bgColor: "bg-gray-100" };
  if (score >= 80) return { label: "Low", color: "text-emerald-700", bgColor: "bg-emerald-100" };
  if (score >= 60) return { label: "Medium", color: "text-amber-700", bgColor: "bg-amber-100" };
  if (score >= 40) return { label: "High", color: "text-orange-700", bgColor: "bg-orange-100" };
  return { label: "Critical", color: "text-red-700", bgColor: "bg-red-100" };
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "text-blue-700 bg-blue-100",
    UNDER_MEDIATION: "text-amber-700 bg-amber-100",
    RESOLVED: "text-emerald-700 bg-emerald-100",
    CLOSED: "text-gray-700 bg-gray-100",
    DRAFT: "text-gray-500 bg-gray-100",
    IN_PROGRESS: "text-blue-700 bg-blue-100",
    COMPLETED: "text-emerald-700 bg-emerald-100",
    PENDING: "text-amber-700 bg-amber-100",
    APPROVED: "text-emerald-700 bg-emerald-100",
    REJECTED: "text-red-700 bg-red-100",
  };
  return map[status] ?? "text-gray-500 bg-gray-100";
}

export function getCategoryColor(index: number): string {
  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
    "#F97316", "#6366F1",
  ];
  return colors[index % colors.length];
}
