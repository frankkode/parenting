"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn, formatDateTime, getStatusColor } from "@/lib/utils";

type ReportType = "MEDIATION" | "CHILD_IMPACT" | "PROGRESS" | "SUMMARY";

interface ReportPreview {
  title: string;
  type: ReportType;
  content: string;
  generatedAt: string;
}

const reportTypeInfo: Record<
  ReportType,
  { label: string; description: string; icon: string }
> = {
  MEDIATION: {
    label: "Mediation Report",
    description:
      "Comprehensive mediation summary including case details, progress, and outcomes",
    icon: "📋",
  },
  CHILD_IMPACT: {
    label: "Child Impact Assessment",
    description:
      "Assessment focused on the wellbeing and impact on children involved",
    icon: "👶",
  },
  PROGRESS: {
    label: "Progress Report",
    description:
      "Track progress over time, including agreement completion and communication trends",
    icon: "📈",
  },
  SUMMARY: {
    label: "Case Summary",
    description:
      "High-level summary of the case suitable for sharing with stakeholders",
    icon: "📄",
  },
};

export default function MediatorReportsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [selectedType, setSelectedType] = useState<ReportType>("MEDIATION");
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [reportHistory, setReportHistory] = useState<
    { id: string; type: string; createdAt: string }[]
  >([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newReport: ReportPreview = {
        title: `${reportTypeInfo[selectedType].label} - ${new Date().toLocaleDateString()}`,
        type: selectedType,
        content: generateSampleContent(selectedType, caseId),
        generatedAt: new Date().toISOString(),
      };

      setPreview(newReport);
      setReportHistory((prev) => [
        {
          id: Math.random().toString(36).substring(7),
          type: selectedType,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Report generated successfully");
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!preview) return;
    const blob = new Blob([preview.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preview.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/mediator/cases/${caseId}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Case
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Report</h1>
        <p className="text-gray-500 mt-1">
          Create and manage reports for this mediation case
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Report Type Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Report Type
            </h3>
            <div className="space-y-3">
              {(Object.keys(reportTypeInfo) as ReportType[]).map((type) => {
                const info = reportTypeInfo[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      selectedType === type
                        ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{info.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {info.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
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
                  <FileText className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>

          {/* Report History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Report History
            </h3>
            {reportHistory.length > 0 ? (
              <div className="space-y-3">
                {reportHistory.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {reportTypeInfo[report.type as ReportType]?.label ??
                          report.type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(report.createdAt)}
                      </p>
                    </div>
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500">No reports yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="lg:col-span-2">
          {preview ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Report Preview
                    </h3>
                    <p className="text-xs text-gray-500">{preview.title}</p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              {/* Preview Content */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {reportTypeInfo[preview.type].label}
                  </span>
                  <span className="text-xs text-gray-400">
                    Generated {formatDateTime(preview.generatedAt)}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {preview.content}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No Report Generated
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Select a report type from the left panel and click
                &quot;Generate Report&quot; to create a new report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateSampleContent(type: ReportType, caseId: string): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sections: Record<ReportType, string> = {
    MEDIATION: `MEDIATION REPORT
Case ID: ${caseId}
Date: ${date}

SUMMARY
This mediation case involves co-parenting arrangements following separation. Both parties have been actively engaged in the mediation process, demonstrating commitment to reaching mutually agreeable solutions.

CASE PROGRESS
- Status: Under Mediation
- Sessions Completed: 3
- Agreements Reached: 2 of 4 proposed
- Communication Quality: Moderate

KEY OBSERVATIONS
1. Both parents express strong commitment to child wellbeing
2. Primary areas of disagreement relate to holiday scheduling and extracurricular activities
3. Communication has improved since initial sessions, though occasional conflicts arise
4. Parent A shows willingness to compromise on scheduling flexibility

RECOMMENDATIONS
1. Continue bi-weekly mediation sessions to address remaining disagreements
2. Implement a shared calendar system for activity scheduling
3. Consider using the platform's messaging system for routine communications
4. Schedule a follow-up assessment in 4 weeks to track progress

Next Steps:
- Schedule next mediation session
- Review proposed holiday schedule agreement
- Complete pending assessment questionnaires`,

    CHILD_IMPACT: `CHILD IMPACT ASSESSMENT
Case ID: ${caseId}
Date: ${date}

CHILDREN OVERVIEW
Number of children involved: Based on case records

WELLBEING ASSESSMENT
Both parents report that children are adjusting to the new arrangements, though some signs of stress are noted during transition periods.

EMOTIONAL WELLBEING
- Both parents rate child emotional health as moderately positive
- Areas of concern: Transitions between households, homework consistency
- Positive factors: Both parents maintain open communication with children

EDUCATIONAL IMPACT
- School performance remains stable
- Both parents attend parent-teacher conferences when possible
- Recommendation: Consistent homework routine across both households

SOCIAL DEVELOPMENT
- Children maintain friendships and extracurricular activities
- Both parents support social development
- Coordination on activities scheduling needs improvement

RECOMMENDATIONS
1. Establish consistent routines across both households
2. Create a shared communication log for school-related matters
3. Consider counseling support for children if adjustment difficulties persist
4. Maintain regular check-ins about children's emotional wellbeing`,

    PROGRESS: `PROGRESS REPORT
Case ID: ${caseId}
Date: ${date}

PERIOD COVERED
From case initiation to present

KEY METRICS
Total Messages Exchanged: Recent communication activity
Agreements Completed: 2
Pending Agreements: 2
Assessment Completions: 1 per parent

COMMUNICATION TRENDS
- Message volume has been consistent
- Fewer flagged conflicts in recent communications
- Both parents using platform features regularly

AGREEMENT PROGRESS
- Parenting Schedule: DRAFT
- Holiday Arrangements: Under discussion
- Financial Responsibilities: Not yet addressed
- Educational Decisions: APPROVED

AREAS OF IMPROVEMENT
1. Response time to messages has improved
2. More constructive language in communications
3. Willingness to consider alternative proposals

AREAS FOR ATTENTION
1. Financial discussions remain challenging
2. Holiday schedule needs further negotiation
3. Long-term decision-making framework not yet established

NEXT MILESTONES
- Complete holiday schedule agreement
- Initiate financial responsibility discussions
- Schedule follow-up assessment session`,

    SUMMARY: `CASE SUMMARY
Case ID: ${caseId}
Date: ${date}

CASE OVERVIEW
This is a co-parenting mediation case currently under active mediation. Both parents are working with a mediator to establish mutually agreeable parenting arrangements.

PARTIES INVOLVED
- Parent A: Primary participant
- Parent B: Primary participant
- Mediator: Assigned mediator

CURRENT STATUS
Case Status: Under Mediation
Mediation Stage: Active Negotiation
Risk Level: Moderate

ACHIEVEMENTS TO DATE
- Initial assessment completed
- Basic parenting framework established
- Communication protocols agreed upon
- Educational decision-making process finalized

PENDING ITEMS
- Holiday and vacation schedule
- Extracurricular activity coordination
- Financial responsibility allocation
- Long-term care arrangements

NEXT STEPS
1. Continue mediation sessions
2. Finalize holiday schedule
3. Address financial arrangements
4. Complete remaining assessments

This summary is intended for informational purposes and may be shared with relevant stakeholders as appropriate.`,
  };

  return sections[type];
}
