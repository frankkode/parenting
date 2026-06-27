"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Loader2,
  Calendar,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Briefcase,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

// ---------- Types ----------
type ReportEntity = "CASES" | "USERS" | "ANALYTICS" | "ASSESSMENTS";
type ExportFormat = "CSV" | "PDF" | "JSON";
type ReportStatus = "COMPLETED" | "FAILED" | "PROCESSING";

interface GeneratedReport {
  id: string;
  title: string;
  entity: ReportEntity;
  format: ExportFormat;
  status: ReportStatus;
  dateRange: string;
  createdAt: string;
  fileSize: string;
}

// ---------- Mock Data ----------
const reportEntityInfo: Record<
  ReportEntity,
  { label: string; description: string; icon: typeof FileText; color: string; bg: string }
> = {
  CASES: {
    label: "All Cases",
    description: "Complete case data including status, parties, and outcomes",
    icon: Briefcase,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  USERS: {
    label: "User Data",
    description: "User accounts, roles, activity, and engagement metrics",
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  ANALYTICS: {
    label: "Analytics",
    description: "Platform metrics, trends, and performance indicators",
    icon: BarChart3,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  ASSESSMENTS: {
    label: "Assessments",
    description: "Assessment results, scores, and completion data",
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
};

const exportFormats: { value: ExportFormat; label: string; description: string }[] = [
  { value: "CSV", label: "CSV", description: "Comma-separated values, spreadsheet compatible" },
  { value: "PDF", label: "PDF", description: "Formatted document, presentation ready" },
  { value: "JSON", label: "JSON", description: "Raw data format, developer friendly" },
];

const mockGeneratedReports: GeneratedReport[] = [
  {
    id: "r1",
    title: "All Cases Export",
    entity: "CASES",
    format: "CSV",
    status: "COMPLETED",
    dateRange: "Jan 1, 2026 - Jun 23, 2026",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    fileSize: "2.4 MB",
  },
  {
    id: "r2",
    title: "User Activity Report",
    entity: "USERS",
    format: "PDF",
    status: "COMPLETED",
    dateRange: "Jan 1, 2026 - Jun 23, 2026",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    fileSize: "1.8 MB",
  },
  {
    id: "r3",
    title: "Monthly Analytics Snapshot",
    entity: "ANALYTICS",
    format: "PDF",
    status: "COMPLETED",
    dateRange: "May 1, 2026 - May 31, 2026",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    fileSize: "3.1 MB",
  },
  {
    id: "r4",
    title: "Assessment Results Summary",
    entity: "ASSESSMENTS",
    format: "CSV",
    status: "FAILED",
    dateRange: "Jan 1, 2026 - Jun 23, 2026",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    fileSize: "-",
  },
];

const datePresets = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "This Year", days: 180 },
  { label: "All Time", days: 0 },
];

export default function AdminReportsPage() {
  const [selectedEntity, setSelectedEntity] = useState<ReportEntity>("CASES");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("CSV");
  const [selectedPreset, setSelectedPreset] = useState(4); // "All Time" default
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] =
    useState<GeneratedReport[]>(mockGeneratedReports);
  const [showFilters, setShowFilters] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  const getDateRangeLabel = useCallback(() => {
    if (selectedPreset < datePresets.length) {
      const preset = datePresets[selectedPreset];
      if (preset.days === 0) return "All Time";
      const start = new Date(Date.now() - preset.days * 86400000);
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} - Present`;
    }
    if (customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} - ${new Date(customEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    return "Custom Range";
  }, [selectedPreset, customStart, customEnd]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const newReport: GeneratedReport = {
        id: `r${Date.now()}`,
        title: `${reportEntityInfo[selectedEntity].label} Export`,
        entity: selectedEntity,
        format: selectedFormat,
        status: "COMPLETED",
        dateRange: getDateRangeLabel(),
        createdAt: new Date().toISOString(),
        fileSize: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
      };

      setGeneratedReports((prev) => [newReport, ...prev]);
      toast.success("Report generated successfully");
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report: GeneratedReport) => {
    setDownloadProgress(report.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const content = `Report: ${report.title}\nFormat: ${report.format}\nGenerated: ${report.createdAt}\n\nThis is a simulated ${report.format} export file. In production, this would contain real ${report.entity.toLowerCase()} data.`;
      const blob = new Blob([content], {
        type:
          report.format === "CSV"
            ? "text/csv"
            : report.format === "PDF"
            ? "application/pdf"
            : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, "_")}.${report.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${report.title} downloaded`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleRegenerate = async (report: GeneratedReport) => {
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setGeneratedReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                status: "COMPLETED" as ReportStatus,
                createdAt: new Date().toISOString(),
              }
            : r
        )
      );
      toast.success("Report regenerated");
    } catch {
      toast.error("Failed to regenerate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const EntityIcon = reportEntityInfo[selectedEntity].icon;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Exports</h1>
        <p className="text-gray-500 mt-1">
          Generate and download platform reports in various formats
        </p>
      </div>

      {/* Generate Report Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Generate New Report
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Report Entity Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(reportEntityInfo) as ReportEntity[]).map(
                (entity) => {
                  const info = reportEntityInfo[entity];
                  const Icon = info.icon;
                  return (
                    <button
                      key={entity}
                      onClick={() => setSelectedEntity(entity)}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        selectedEntity === entity
                          ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                          info.bg
                        )}
                      >
                        <Icon className={cn("w-5 h-5", info.color)} />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {info.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {info.description}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Date Range + Format Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Date Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Date Range
                </label>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" />
                  {showFilters ? "Simpler View" : "Custom Range"}
                </button>
              </div>

              {showFilters ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => {
                        setCustomStart(e.target.value);
                        setSelectedPreset(-1);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => {
                        setCustomEnd(e.target.value);
                        setSelectedPreset(-1);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {datePresets.map((preset, idx) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setSelectedPreset(idx);
                        setCustomStart("");
                        setCustomEnd("");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        selectedPreset === idx
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {getDateRangeLabel()}
              </p>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="flex gap-3">
                {exportFormats.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setSelectedFormat(fmt.value)}
                    className={cn(
                      "flex-1 p-3 rounded-lg border text-center transition-all",
                      selectedFormat === fmt.value
                        ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {fmt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fmt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  reportEntityInfo[selectedEntity].bg
                )}
              >
                <EntityIcon
                  className={cn("w-4 h-4", reportEntityInfo[selectedEntity].color)}
                />
              </div>
              <span>
                Exporting{" "}
                <strong>{reportEntityInfo[selectedEntity].label}</strong> as{" "}
                <strong>{selectedFormat}</strong>
              </span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isGenerating
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Export Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Quick Exports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: "Export All Cases", entity: "CASES", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Export Analytics", entity: "ANALYTICS", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Export User Data", entity: "USERS", icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Export Assessments", entity: "ASSESSMENTS", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
          ] as const).map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  setSelectedEntity(action.entity);
                  setSelectedFormat("CSV");
                  toast.success(`Starting ${action.label}...`);
                }}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    action.bg
                  )}
                >
                  <Icon className={cn("w-4 h-4", action.color)} />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated Reports History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Generated Reports
          </h3>
        </div>

        {generatedReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date Range
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {generatedReports.map((report) => {
                  const info = reportEntityInfo[report.entity];
                  const Icon = info.icon;
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              info.bg
                            )}
                          >
                            <Icon className={cn("w-4 h-4", info.color)} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {report.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDateTime(report.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {info.label}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">
                        {report.dateRange}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {report.format}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {report.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : report.status === "FAILED" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-500">
                        {report.fileSize}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.status === "COMPLETED" && (
                            <button
                              onClick={() => handleDownload(report)}
                              disabled={downloadProgress === report.id}
                              className={cn(
                                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                                downloadProgress === report.id
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              )}
                            >
                              {downloadProgress === report.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              Download
                            </button>
                          )}
                          {report.status === "FAILED" && (
                            <button
                              onClick={() => handleRegenerate(report)}
                              disabled={isGenerating}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              No Reports Yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Generate your first report using the form above. Reports will
              appear here for download.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
