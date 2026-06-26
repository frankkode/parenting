"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare, Plus, Loader2, FileText, AlertCircle,
  Lightbulb, Target, ChevronDown, ChevronUp, Trash2,
  ArrowRight, CheckCircle2, User,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";

// ---------- Types ----------
interface AnalyzedPoint {
  category: string;
  label: string;
  points: string[];
}

interface AgreementProposal {
  title: string;
  category: string;
  content: string;
}

interface StatementAnalysis {
  summary: string;
  keyConcerns: AnalyzedPoint[];
  proposedSolutions: AnalyzedPoint[];
  communicationNeeds: AnalyzedPoint[];
  legalAdministrative: AnalyzedPoint[];
  actionItems: string[];
  assessmentMapping: { category: string; relevance: string; suggestedQuestions: string[] }[];
  agreementProposals: AgreementProposal[];
}

interface ParentStatement {
  id: string;
  content: string;
  analysis: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living Situation",
  WORK_SITUATION: "Work Situation",
  CHILDCARE_CAPACITY: "Childcare Capacity",
  FINANCIAL_CAPACITY: "Financial Capacity",
  EMOTIONAL_READINESS: "Emotional Readiness",
  CHILD_WELLBEING: "Child Wellbeing",
};

const CATEGORY_COLORS: Record<string, string> = {
  LIVING_SITUATION: "bg-blue-50 text-blue-700 border-blue-200",
  WORK_SITUATION: "bg-purple-50 text-purple-700 border-purple-200",
  CHILDCARE_CAPACITY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FINANCIAL_CAPACITY: "bg-amber-50 text-amber-700 border-amber-200",
  EMOTIONAL_READINESS: "bg-rose-50 text-rose-700 border-rose-200",
  CHILD_WELLBEING: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

interface Props {
  caseId: string;
  isAdmin: boolean;
}

export default function ParentStatementAnalysis({ caseId, isAdmin }: Props) {
  const [statements, setStatements] = useState<ParentStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [creatingAgreement, setCreatingAgreement] = useState<string | null>(null);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent-statements?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStatements(data);
    } catch {
      toast.error("Failed to load parent statements");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleSubmitStatement = async () => {
    if (!newContent.trim()) {
      toast.error("Please enter the parent's statement");
      return;
    }
    setSubmitting(true);
    try {
      // Build structured analysis from the text
      const analysis = buildAnalysis(newContent);

      const res = await fetch("/api/parent-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          content: newContent,
          analysis,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Statement analyzed and saved");
      setNewContent("");
      setShowNewForm(false);
      fetchStatements();
    } catch {
      toast.error("Failed to save statement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStatement = async (id: string) => {
    try {
      const res = await fetch(`/api/parent-statements?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Statement deleted");
      fetchStatements();
    } catch {
      toast.error("Failed to delete statement");
    }
  };

  const handleCreateAgreement = async (proposal: AgreementProposal) => {
    setCreatingAgreement(proposal.title);
    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          title: proposal.title,
          content: proposal.content,
          category: proposal.category,
        }),
      });
      if (!res.ok) throw new Error("Failed to create agreement");
      toast.success(`Agreement proposal created: ${proposal.title}`);
    } catch {
      toast.error("Failed to create agreement proposal");
    } finally {
      setCreatingAgreement(null);
    }
  };

  const parseAnalysis = (analysisStr: string): StatementAnalysis | null => {
    try {
      return JSON.parse(analysisStr);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Parent Statements & Analysis</h2>
          <p className="text-sm text-gray-500">
            Analyze parent-provided information to identify key points and generate agreements
          </p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Statement
        </Button>
      </div>

      {/* New Statement Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Parent Statement</CardTitle>
            <CardDescription>
              Paste the parent's statement text. The system will analyze it and extract key points.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste the parent's full statement here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={8}
              className="min-h-[200px]"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitStatement} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Analyze & Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statements List */}
      {statements.length === 0 && !showNewForm ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Statements Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Add a parent's statement to analyze their concerns and generate agreement proposals.
            </p>
          </CardContent>
        </Card>
      ) : (
        statements.map((stmt) => {
          const analysis = parseAnalysis(stmt.analysis);
          const isExpanded = expandedAnalysis === stmt.id;

          return (
            <Card key={stmt.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      Statement from {stmt.user.name ?? stmt.user.email}
                    </CardTitle>
                    <CardDescription>
                      {formatDate(stmt.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteStatement(stmt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpandedAnalysis(isExpanded ? null : stmt.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      )}
                      {isExpanded ? "Hide Analysis" : "View Analysis"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Original Content (always visible, truncated) */}
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                    {stmt.content}
                  </p>
                </div>

                {/* Expanded Analysis */}
                {isExpanded && analysis && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Summary */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1 mb-2">
                        <Lightbulb className="h-4 w-4" />
                        Summary
                      </h4>
                      <p className="text-sm text-blue-800">{analysis.summary}</p>
                    </div>

                    {/* Key Concerns */}
                    <PointSection
                      title="Key Concerns"
                      icon={AlertCircle}
                      points={analysis.keyConcerns}
                      color="text-rose-600"
                      bg="bg-rose-50"
                    />

                    {/* Proposed Solutions */}
                    <PointSection
                      title="Proposed Solutions"
                      icon={Lightbulb}
                      points={analysis.proposedSolutions}
                      color="text-emerald-600"
                      bg="bg-emerald-50"
                    />

                    {/* Communication Needs */}
                    <PointSection
                      title="Communication Needs"
                      icon={MessageSquare}
                      points={analysis.communicationNeeds}
                      color="text-violet-600"
                      bg="bg-violet-50"
                    />

                    {/* Legal / Administrative */}
                    <PointSection
                      title="Legal & Administrative"
                      icon={FileText}
                      points={analysis.legalAdministrative}
                      color="text-amber-600"
                      bg="bg-amber-50"
                    />

                    {/* Action Items */}
                    {analysis.actionItems && analysis.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1 mb-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          Action Items
                        </h4>
                        <div className="space-y-1">
                          {analysis.actionItems.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-700 p-2 rounded hover:bg-gray-50"
                            >
                              <ArrowRight className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Assessment Mapping */}
                    {analysis.assessmentMapping &&
                      analysis.assessmentMapping.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Assessment Category Mapping
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {analysis.assessmentMapping.map((map, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  CATEGORY_COLORS[map.category] || "bg-gray-50 border-gray-200"
                                )}
                              >
                                <p className="text-sm font-medium">
                                  {CATEGORY_LABELS[map.category] || map.category}
                                </p>
                                <p className="text-xs mt-1 opacity-80">{map.relevance}</p>
                                {map.suggestedQuestions.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {map.suggestedQuestions.map((q, j) => (
                                      <p key={j} className="text-xs opacity-70 italic">
                                        &quot;{q}&quot;
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    <Separator />

                    {/* Agreement Proposals */}
                    {analysis.agreementProposals &&
                      analysis.agreementProposals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1">
                            <FileText className="h-4 w-4 text-blue-500" />
                            Suggested Agreement Proposals
                          </h4>
                          <div className="space-y-3">
                            {analysis.agreementProposals.map((proposal, i) => (
                              <div
                                key={i}
                                className="p-4 rounded-lg border border-blue-200 bg-blue-50/50"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="text-sm font-semibold text-gray-900">
                                    {proposal.title}
                                  </h5>
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCreateAgreement(proposal)}
                                      disabled={creatingAgreement === proposal.title}
                                    >
                                      {creatingAgreement === proposal.title ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                      )}
                                      Create Agreement
                                    </Button>
                                  )}
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="mb-2 text-xs"
                                >
                                  {CATEGORY_LABELS[proposal.category] || proposal.category}
                                </Badge>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {proposal.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ---------- Sub-component ----------
function PointSection({
  title,
  icon: Icon,
  points,
  color,
  bg,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  points: AnalyzedPoint[];
  color: string;
  bg: string;
}) {
  if (!points || points.length === 0) return null;

  return (
    <div>
      <h4 className={cn("text-sm font-semibold flex items-center gap-1 mb-2", color)}>
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <div className="space-y-3">
        {points.map((section, i) => (
          <div key={i} className={cn("p-3 rounded-lg border", bg)}>
            <p className="text-sm font-medium">{section.label}</p>
            <ul className="mt-1 space-y-1">
              {section.points.map((pt, j) => (
                <li key={j} className="text-sm flex items-start gap-1">
                  <span className="text-xs mt-1.5 block w-1.5 h-1.5 rounded-full bg-current opacity-40 flex-shrink-0" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Analysis Engine ----------
function buildAnalysis(content: string): StatementAnalysis {
  const text = content.toLowerCase();

  // ---- Pattern Detection ----
  // Emotional / exhaustion
  const hasExhaustion =
    text.includes("exhaust") || text.includes("tired") || text.includes("overwhelm");
  // Custody / scheduling
  const hasCustody =
    text.includes("custody") || text.includes("50/50") || text.includes("schedule") || text.includes("parenting");
  const hasScheduleNotice =
    text.includes("inform") && (text.includes("advance") || text.includes("week") || text.includes("notice"));
  // Location / housing
  const hasLocation =
    text.includes("move") || text.includes("housing") || text.includes("apartment") || text.includes("distance");
  // Work / finances
  const hasJob =
    text.includes("work") || text.includes("job") || text.includes("employment") || text.includes("financial");
  // Communication / respect
  const hasCommunication =
    text.includes("communicat") || text.includes("respect") || text.includes("conflict");
  const hasRespectCommunication =
    text.includes("respectful") || text.includes("constructive") || text.includes("best interest");
  // Children references
  const hasChildren =
    text.includes("child") || text.includes("kid") || text.includes("son") || text.includes("daughter");
  // Legal
  const hasLegal =
    text.includes("divorce") || text.includes("court") || text.includes("law") || text.includes("immigration") || text.includes("municipality");
  const hasWithdrawCourt =
    text.includes("withdraw") && (text.includes("court") || text.includes("case"));
  // Shared responsibilities
  const hasSharedResponsibilities =
    text.includes("parental responsibilities") || (text.includes("share") && text.includes("responsibilit"));
  const hasCareDetails =
    text.includes("sick") || text.includes("school meeting") || text.includes("medical appointment") || text.includes("doctor");
  // Cost sharing
  const hasCostSharing =
    text.includes("costs") || text.includes("clothing") || text.includes("leisure") || text.includes("holiday") || text.includes("vacation");

  // ---- Build analysis dynamically ----
  const analysis: StatementAnalysis = {
    summary: "",
    keyConcerns: [],
    proposedSolutions: [],
    communicationNeeds: [],
    legalAdministrative: [],
    actionItems: [],
    assessmentMapping: [],
    agreementProposals: [],
  };

  // ---- Summary ----
  const summaryParts: string[] = [];
  if (hasExhaustion) summaryParts.push("the parent reports exhaustion from childcare responsibilities");
  if (hasCustody) summaryParts.push("concerns about parenting schedule and custody arrangement");
  if (hasLocation) summaryParts.push("geographic distance creates logistical challenges");
  if (hasJob) summaryParts.push("work and financial constraints affect parenting availability");
  if (hasCommunication) summaryParts.push("communication and respectful interaction are identified as important");
  if (hasWithdrawCourt) summaryParts.push("the parent requests withdrawal of court proceedings as a foundation for cooperation");
  if (hasSharedResponsibilities) summaryParts.push("shared parental responsibilities are proposed");
  if (hasCostSharing) summaryParts.push("equitable sharing of child-related costs is requested");
  if (hasCareDetails) summaryParts.push("day-to-day childcare tasks are specified (sick care, school, medical)");
  if (hasScheduleNotice) summaryParts.push("advance notice for schedule changes is proposed");

  analysis.summary = summaryParts.length > 0
    ? "This parent statement highlights: " + summaryParts.join("; ") + "."
    : "Parent statement analyzed for key concerns, proposed solutions, and actionable agreements.";

  // ---- Key Concerns ----

  if (hasExhaustion) {
    analysis.keyConcerns.push({
      category: "EMOTIONAL_READINESS",
      label: "Parental Exhaustion",
      points: [
        "Primary caregiver reports feeling exhausted from handling most childcare responsibilities",
        "Current arrangement creates uneven burden that impacts emotional wellbeing",
        "Exhaustion may affect quality of care and parent-child relationships",
      ],
    });
  }

  if (hasCustody) {
    const custodyPoints = ["Need to establish a fair and sustainable parenting schedule"];
    if (text.includes("50/50")) {
      custodyPoints.unshift("Desire for 50/50 shared custody arrangement expressed");
    } else {
      custodyPoints.unshift("Parenting schedule and custody terms need clarification");
    }
    if (hasScheduleNotice) {
      custodyPoints.push("Advance notice period requested for schedule modifications");
    }
    analysis.keyConcerns.push({
      category: "CHILDCARE_CAPACITY",
      label: "Custody & Parenting Schedule",
      points: custodyPoints,
    });
  }

  if (hasLocation) {
    analysis.keyConcerns.push({
      category: "LIVING_SITUATION",
      label: "Geographic Distance",
      points: [
        "Parents live in different locations, creating logistical challenges",
        "Distance limits one parent's ability to participate in daily childcare",
        "Relocation is being considered to enable more involvement",
      ],
    });
  }

  if (hasJob) {
    analysis.keyConcerns.push({
      category: "WORK_SITUATION",
      label: "Work & Financial Constraints",
      points: [
        "Employment obligations limit scheduling flexibility",
        "Financial stability is tied to current job location",
        "Work requirements may affect availability for parenting time",
      ],
    });
  }

  if (hasSharedResponsibilities || hasCareDetails) {
    const pts = ["The parent proposes sharing all parental responsibilities"];
    if (hasCareDetails) {
      pts.push("Specific care duties mentioned: caring for sick children, attending school meetings, and medical appointments");
    }
    pts.push("Both parents' involvement in day-to-day childcare decisions is important");
    analysis.keyConcerns.push({
      category: "CHILDCARE_CAPACITY",
      label: "Shared Parental Responsibilities",
      points: pts,
    });
  }

  if (hasCostSharing) {
    analysis.keyConcerns.push({
      category: "FINANCIAL_CAPACITY",
      label: "Shared Child-Related Costs",
      points: [
        "Parent proposes sharing the costs of all child-related expenses",
        "Cost categories include clothing, leisure activities, and holidays/vacations",
        "Equitable financial contribution is important for the children's wellbeing",
      ],
    });
  }

  if (hasWithdrawCourt) {
    analysis.keyConcerns.push({
      category: "FINANCIAL_CAPACITY",
      label: "Court Proceedings & Cooperation",
      points: [
        "Parent views withdrawal of the court case as a prerequisite for effective cooperation",
        "Ongoing litigation may be creating tension that affects co-parenting",
        "Alternative dispute resolution through mediation may be a more constructive path",
      ],
    });
  }

  // ---- Proposed Solutions ----

  if (hasLocation) {
    analysis.proposedSolutions.push({
      category: "LIVING_SITUATION",
      label: "Relocation Plan",
      points: [
        "Explore housing options closer to the children's school and other parent",
        "Contact housing officers for relocation assistance if available",
        "Prioritize living arrangements that facilitate shared parenting",
      ],
    });
  }

  if (hasCustody) {
    analysis.proposedSolutions.push({
      category: "CHILDCARE_CAPACITY",
      label: "Shared Custody Arrangement",
      points: [
        "Develop a clear parenting schedule that both parents can commit to",
        "Consider a graduated transition if moving toward increased shared custody",
        "Review and adjust the schedule periodically based on the children's needs",
      ],
    });
  }

  if (hasSharedResponsibilities || hasCareDetails) {
    analysis.proposedSolutions.push({
      category: "CHILDCARE_CAPACITY",
      label: "Shared Responsibility Framework",
      points: [
        "Create a clear division of parental responsibilities for school, medical, and care duties",
        "Establish a protocol for handling unexpected situations (sickness, emergencies)",
        "Both parents should have access to school and medical records and be informed of appointments",
      ],
    });
  }

  if (hasCostSharing) {
    analysis.proposedSolutions.push({
      category: "FINANCIAL_CAPACITY",
      label: "Cost-Sharing System",
      points: [
        "Agree on which child expenses are shared and in what proportion",
        "Establish a method for tracking and settling shared costs (e.g., shared spreadsheet, app)",
        "Define categories: clothing, school supplies, activities, holidays/vacations, medical",
      ],
    });
  }

  if (hasWithdrawCourt) {
    analysis.proposedSolutions.push({
      category: "LEGAL",
      label: "Alternative Dispute Resolution",
      points: [
        "Explore mediation as an alternative to court proceedings",
        "Use this co-parenting platform to build agreements before formalizing them legally",
        "Withdrawal of court case can be conditional on reaching a mediated agreement",
      ],
    });
  }

  // ---- Communication Needs ----

  if (hasCommunication || hasRespectCommunication || hasChildren) {
    const commPoints = ["Communication should focus on children's best interests"];
    if (hasRespectCommunication) {
      commPoints.unshift("Both parents should maintain respectful and constructive communication");
    } else {
      commPoints.unshift("Both parents need to recognize that conflict negatively impacts children");
    }
    commPoints.push("Mutual respect — not one-sided — is essential for co-parenting");
    analysis.communicationNeeds.push({
      category: "EMOTIONAL_READINESS",
      label: "Mutual Respect & Communication",
      points: commPoints,
    });
  }

  if (hasChildren || hasCommunication) {
    analysis.communicationNeeds.push({
      category: "CHILD_WELLBEING",
      label: "Children's Emotional Wellbeing",
      points: [
        "Children are vulnerable to the effects of parental conflict",
        "Hostility and poor communication harm children's development",
        "Parents should work together to minimize negative impacts of separation",
      ],
    });
  }

  if (hasScheduleNotice) {
    analysis.communicationNeeds.push({
      category: "CHILDCARE_CAPACITY",
      label: "Schedule Change Notifications",
      points: [
        "Parent requests at least one week's advance notice for schedule changes",
        "Adequate notice allows the other parent to plan and avoids last-minute disruption",
        "Clear communication around scheduling prevents misunderstandings and conflict",
      ],
    });
  }

  // ---- Legal / Administrative ----

  if (hasLegal) {
    const legalPts = ["Clear custody agreement based on applicable law should be established"];
    if (text.includes("municipality") || text.includes("informationssamtal")) {
      legalPts.unshift("Informationssamtal with municipality is recommended as a first step");
    }
    if (text.includes("divorce")) {
      legalPts.unshift("Divorce should be formalized through proper legal channels");
    }
    analysis.legalAdministrative.push({
      category: "LEGAL",
      label: "Divorce & Legal Process",
      points: legalPts,
    });
  }

  if (hasWithdrawCourt) {
    analysis.legalAdministrative.push({
      category: "LEGAL",
      label: "Court Case Withdrawal",
      points: [
        "Parent sees the court case as an obstacle to cooperative co-parenting",
        "Withdrawal would signal good faith and willingness to collaborate",
        "Mediation is proposed as a replacement for litigation to resolve disputes",
      ],
    });
  }

  // ---- Action Items ----

  if (hasLocation) {
    analysis.actionItems.push("Contact housing officers to explore relocation options");
  }
  if (hasLegal && text.includes("municipality")) {
    analysis.actionItems.push("Schedule informationssamtal with the municipality");
  }
  if (hasCustody) {
    analysis.actionItems.push("Draft a parenting schedule that both parents can agree to");
  }
  if (hasCommunication || hasRespectCommunication) {
    analysis.actionItems.push("Establish communication guidelines focused on children's wellbeing");
  }
  if (hasJob) {
    analysis.actionItems.push("Review work schedule impact on proposed parenting arrangements");
  }
  if (hasWithdrawCourt) {
    analysis.actionItems.push("Discuss terms and conditions for withdrawing the court case");
    analysis.actionItems.push("Set up mediation as an alternative dispute resolution mechanism");
  }
  if (hasSharedResponsibilities || hasCareDetails) {
    analysis.actionItems.push("Create a shared responsibilities plan covering sick care, school, and medical appointments");
  }
  if (hasCostSharing) {
    analysis.actionItems.push("Set up a cost-sharing agreement and tracking system for child expenses");
  }

  // Fallback action items if nothing specific was detected
  if (analysis.actionItems.length === 0) {
    analysis.actionItems = [
      "Review the parent's statement for actionable requests",
      "Discuss the parent's concerns in a mediation session",
      "Identify areas of agreement between both parents' statements",
    ];
  }

  // ---- Assessment Mapping ----

  if (hasLocation) {
    analysis.assessmentMapping.push({
      category: "LIVING_SITUATION",
      relevance: "Geographic distance and housing stability directly impact childcare capacity",
      suggestedQuestions: [
        "How stable is your current living situation?",
        "Is your home suitable for children to stay overnight?",
        "How close do you live to your children's school?",
      ],
    });
  }

  if (hasJob) {
    analysis.assessmentMapping.push({
      category: "WORK_SITUATION",
      relevance: "Employment constraints affect availability for parenting time",
      suggestedQuestions: [
        "How flexible is your work schedule for childcare?",
        "Does your commute affect your ability to care for children?",
      ],
    });
  }

  if (hasCustody || hasSharedResponsibilities || hasCareDetails) {
    analysis.assessmentMapping.push({
      category: "CHILDCARE_CAPACITY",
      relevance: hasSharedResponsibilities
        ? "Parent proposes shared responsibilities — assess readiness for cooperative childcare"
        : "Core issue — need to assess readiness for shared custody",
      suggestedQuestions: [
        "How many days per week can you realistically care for the children?",
        "Do you have support systems for childcare?",
        "Are you able to attend school meetings and medical appointments?",
      ],
    });
  }

  if (hasCostSharing) {
    analysis.assessmentMapping.push({
      category: "FINANCIAL_CAPACITY",
      relevance: "Parent proposes sharing child-related costs — assess financial capability and fairness",
      suggestedQuestions: [
        "What is your current financial situation?",
        "What proportion of child expenses do you think each parent should cover?",
        "Are there any large upcoming expenses for the children?",
      ],
    });
  }

  if (hasExhaustion || hasCommunication || hasRespectCommunication) {
    analysis.assessmentMapping.push({
      category: "EMOTIONAL_READINESS",
      relevance: hasExhaustion
        ? "Exhaustion and communication challenges affect co-parenting capacity"
        : "Communication and respect are key factors in successful co-parenting",
      suggestedQuestions: [
        "How well do you manage stress and conflict with the other parent?",
        "Are you open to co-parenting counseling?",
        "How would you describe the current communication dynamic?",
      ],
    });
  }

  if (hasChildren || hasCommunication) {
    analysis.assessmentMapping.push({
      category: "CHILD_WELLBEING",
      relevance: "Children's emotional health is affected by parental dynamics",
      suggestedQuestions: [
        "How are the children coping with the separation?",
        "Do the children express feelings about the custody arrangement?",
        "Are the children's routines and activities being maintained consistently?",
      ],
    });
  }

  // ---- Agreement Proposals ----

  if (hasCustody) {
    analysis.agreementProposals.push({
      title: "Parenting Schedule Framework",
      category: "CHILDCARE_CAPACITY",
      content:
        "1. Both parents agree to establish a clear and fair parenting schedule.\n" +
        "2. The schedule will specify regular parenting time, holidays, and special occasions.\n" +
        "3. Both parents commit to following the agreed schedule consistently.\n" +
        "4. Changes to the schedule require mutual agreement, with at least one week's notice unless it is an emergency.\n" +
        "5. The schedule will be reviewed every 3 months and adjusted as the children's needs evolve.",
    });
  }

  if (hasCommunication || hasRespectCommunication) {
    analysis.agreementProposals.push({
      title: "Communication & Mutual Respect Agreement",
      category: "EMOTIONAL_READINESS",
      content:
        "1. Both parents agree to communicate respectfully and constructively at all times.\n" +
        "2. Communication will focus on the children's needs, not personal grievances.\n" +
        "3. Hostile or accusatory language will be avoided — disagreements will be addressed calmly.\n" +
        "4. Both parents recognize that mutual respect is given and received equally.\n" +
        "5. If communication breaks down, both agree to use the mediation platform or seek professional co-parenting counseling.",
    });
  }

  if (hasChildren) {
    analysis.agreementProposals.push({
      title: "Children's Wellbeing Priority Agreement",
      category: "CHILD_WELLBEING",
      content:
        "1. Both parents acknowledge that conflict and hostility negatively impact the children's emotional wellbeing.\n" +
        "2. The children's best interests will always be the primary consideration in all decisions.\n" +
        "3. Both parents will shield the children from adult conflicts and disagreements.\n" +
        "4. Regular check-ins on the children's emotional state will be part of the co-parenting routine.\n" +
        "5. Both parents support maintaining consistent routines, school attendance, and social activities for the children.",
    });
  }

  if (hasLocation) {
    analysis.agreementProposals.push({
      title: "Relocation Action Plan",
      category: "LIVING_SITUATION",
      content:
        "1. Both parents agree to support efforts to relocate closer to the children's school.\n" +
        "2. The relocating parent will contact housing officers within 30 days to explore options.\n" +
        "3. The other parent will provide necessary documentation to support the housing application if needed.\n" +
        "4. Once relocation is achieved, the parenting schedule will be renegotiated.\n" +
        "5. If relocation is not possible within 6 months, alternative solutions will be discussed.",
    });
  }

  if (hasSharedResponsibilities || hasCareDetails) {
    analysis.agreementProposals.push({
      title: "Shared Parental Responsibilities Agreement",
      category: "CHILDCARE_CAPACITY",
      content:
        "1. Both parents agree to share all parental responsibilities related to the children equally.\n" +
        "2. Responsibilities include: caring for the children when sick, attending school meetings, and going to medical appointments.\n" +
        "3. Both parents will be listed as emergency contacts at school and with healthcare providers.\n" +
        "4. School and medical records will be accessible to both parents at all times.\n" +
        "5. In case of a child's illness during one parent's time, both parents will be informed promptly.",
    });
  }

  if (hasCostSharing) {
    analysis.agreementProposals.push({
      title: "Child Expense Cost-Sharing Agreement",
      category: "FINANCIAL_CAPACITY",
      content:
        "1. Both parents agree to share the costs of all child-related expenses fairly.\n" +
        "2. Covered categories include: clothing, school supplies, leisure activities, sports, and holidays/vacations.\n" +
        "3. Extraordinary expenses (above an agreed threshold) require mutual consent before purchase.\n" +
        "4. Parents will use a shared tracking system (app or spreadsheet) to log and reconcile shared expenses monthly.\n" +
        "5. The cost-sharing arrangement will be reviewed annually or when either parent's financial situation changes significantly.",
    });
  }

  if (hasScheduleNotice) {
    analysis.agreementProposals.push({
      title: "Schedule Respect & Notice Agreement",
      category: "CHILDCARE_CAPACITY",
      content:
        "1. Both parents commit to respecting the agreed parenting schedule at all times.\n" +
        "2. If a parent is unable to exercise their scheduled parenting time, they must inform the other parent at least one week in advance.\n" +
        "3. Exceptions for emergencies (illness, accidents) will be communicated as soon as reasonably possible.\n" +
        "4. Repeated failure to follow the schedule or provide adequate notice will be addressed through mediation.\n" +
        "5. Make-up time will be offered for any missed parenting days due to short-notice cancellations.",
    });
  }

  if (hasWithdrawCourt) {
    analysis.agreementProposals.push({
      title: "Court Proceedings Resolution Agreement",
      category: "FINANCIAL_CAPACITY",
      content:
        "1. Both parents acknowledge that withdrawing the court case is a show of good faith toward cooperative co-parenting.\n" +
        "2. The withdrawal will be conditional on reaching a mediated agreement covering the key points raised by both parents.\n" +
        "3. The mediated agreement will serve as the foundation for all future co-parenting arrangements.\n" +
        "4. Both parents agree to use mediation rather than litigation to resolve future disputes.\n" +
        "5. If mediation fails, either parent may re-file with the court, but only after making a genuine effort to resolve the issue through mediation.",
    });
  }

  // Fallback proposal if nothing specific detected
  if (analysis.agreementProposals.length === 0) {
    analysis.agreementProposals.push({
      title: "General Co-Parenting Framework",
      category: "EMOTIONAL_READINESS",
      content:
        "1. Both parents agree to work cooperatively in the children's best interests.\n" +
        "2. Open and respectful communication will be maintained regarding all child-related matters.\n" +
        "3. Both parents will attend mediation sessions to work through specific concerns.\n" +
        "4. Decisions affecting the children will be made jointly whenever possible.\n" +
        "5. This agreement will be reviewed and expanded as specific issues are resolved.",
    });
  }

  return analysis;
}
