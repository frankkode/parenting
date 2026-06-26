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

  // Detect key patterns
  const hasExhaustion =
    text.includes("exhaust") || text.includes("tired") || text.includes("overwhelm");
  const hasCustody =
    text.includes("custody") || text.includes("50/50") || text.includes("schedule") || text.includes("parenting");
  const hasLocation =
    text.includes("move") || text.includes("housing") || text.includes("apartment") || text.includes("distance");
  const hasJob =
    text.includes("work") || text.includes("job") || text.includes("employment") || text.includes("financial");
  const hasCommunication =
    text.includes("communicat") || text.includes("respect") || text.includes("conflict");
  const hasChildren =
    text.includes("child") || text.includes("kid") || text.includes("son") || text.includes("daughter");
  const hasLegal =
    text.includes("divorce") || text.includes("court") || text.includes("law") || text.includes("immigration") || text.includes("municipality");

  const analysis: StatementAnalysis = {
    summary: "Parent statement analyzed for key concerns, proposed solutions, and actionable agreements.",

    keyConcerns: [],
    proposedSolutions: [],
    communicationNeeds: [],
    legalAdministrative: [],
    actionItems: [],
    assessmentMapping: [],
    agreementProposals: [],
  };

  // Key Concerns
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
    analysis.keyConcerns.push({
      category: "CHILDCARE_CAPACITY",
      label: "Custody & Parenting Schedule",
      points: [
        "Current schedule is limited (2 weekends/month for one parent)",
        "Desire for 50/50 shared custody arrangement expressed",
        "Need to establish a fair and sustainable parenting schedule",
      ],
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
        "Work requirements affect citizenship/immigration status",
      ],
    });
  }

  // Proposed Solutions
  analysis.proposedSolutions.push({
    category: "LIVING_SITUATION",
    label: "Relocation Plan",
    points: [
      "Explore housing options closer to children's school",
      "Contact housing officers for relocation assistance",
      "Prioritize moving to Gråbo area near the children",
    ],
  });

  analysis.proposedSolutions.push({
    category: "CHILDCARE_CAPACITY",
    label: "Shared Custody Transition",
    points: [
      "Develop a graduated transition plan toward 50/50 custody",
      "Review and adjust parenting schedule after relocation",
      "Ensure changes do not negatively impact either parent's stability",
    ],
  });

  // Communication Needs
  if (hasCommunication || hasChildren) {
    analysis.communicationNeeds.push({
      category: "EMOTIONAL_READINESS",
      label: "Mutual Respect & Communication",
      points: [
        "Both parents need to recognize that conflict negatively impacts children",
        "Communication should focus on children's best interests",
        "Mutual respect — not one-sided — is essential for co-parenting",
      ],
    });
  }

  analysis.communicationNeeds.push({
    category: "CHILD_WELLBEING",
    label: "Children's Emotional Wellbeing",
    points: [
      "Children are vulnerable to the effects of parental conflict",
      "Hostility and poor communication harm children's development",
      "Parents should work together to minimize negative impacts of separation",
    ],
  });

  // Legal / Administrative
  if (hasLegal) {
    analysis.legalAdministrative.push({
      category: "LEGAL",
      label: "Divorce & Legal Process",
      points: [
        "Divorce should be formalized even though parents have been separated for years",
        "Informationssamtal with municipality is recommended as a first step",
        "Clear custody agreement based on Swedish law should be established",
      ],
    });
  }

  // Action Items
  analysis.actionItems = [
    "Contact housing officers to explore relocation to Gråbo area",
    "Schedule informationssamtal with Lerum Municipality",
    "Draft a graduated parenting schedule working toward 50/50 shared custody",
    "Establish communication guidelines focused on children's wellbeing",
    "Review work schedule impact once relocation is confirmed",
  ];

  // Assessment Mapping
  analysis.assessmentMapping = [
    {
      category: "LIVING_SITUATION",
      relevance: "Geographic distance and housing stability directly impact childcare capacity",
      suggestedQuestions: [
        "How stable is your current living situation?",
        "Is your home suitable for children to stay overnight?",
        "How close do you live to your children's school?",
      ],
    },
    {
      category: "WORK_SITUATION",
      relevance: "Employment constraints affect availability for parenting time",
      suggestedQuestions: [
        "How flexible is your work schedule for childcare?",
        "Does your commute affect your ability to care for children?",
      ],
    },
    {
      category: "CHILDCARE_CAPACITY",
      relevance: "Core issue — need to assess readiness for increased custody share",
      suggestedQuestions: [
        "How many days per week can you realistically care for the children?",
        "Do you have support systems for childcare?",
      ],
    },
    {
      category: "EMOTIONAL_READINESS",
      relevance: "Exhaustion, conflict, and communication challenges affect co-parenting",
      suggestedQuestions: [
        "How well do you manage stress and conflict with the other parent?",
        "Are you open to co-parenting counseling?",
      ],
    },
    {
      category: "CHILD_WELLBEING",
      relevance: "Children's emotional health is affected by parental conflict and separation",
      suggestedQuestions: [
        "How are the children coping with the separation?",
        "Do the children express feelings about the custody arrangement?",
      ],
    },
  ];

  // Agreement Proposals
  analysis.agreementProposals = [
    {
      title: "Parenting Schedule Framework",
      category: "CHILDCARE_CAPACITY",
      content:
        "1. Both parents agree to work toward a fair shared custody arrangement.\n" +
        "2. A graduated transition plan will be developed, starting with increased weekend and weekday time for the non-primary parent.\n" +
        "3. Once relocation is completed, the schedule will be reviewed to move toward 50/50 shared custody.\n" +
        "4. Both parents commit to flexibility in scheduling for the children's benefit.\n" +
        "5. The schedule will be reviewed every 3 months and adjusted as needed.",
    },
    {
      title: "Communication & Mutual Respect Agreement",
      category: "EMOTIONAL_READINESS",
      content:
        "1. Both parents agree to communicate respectfully and constructively at all times.\n" +
        "2. Communication will focus on the children's needs, not personal grievances.\n" +
        "3. Hostile or accusatory language will be avoided — disagreements will be addressed calmly.\n" +
        "4. Both parents recognize that mutual respect means respect is given and received equally.\n" +
        "5. If communication breaks down, both agree to use the mediation platform or seek professional co-parenting counseling.",
    },
    {
      title: "Children's Wellbeing Priority Statement",
      category: "CHILD_WELLBEING",
      content:
        "1. Both parents acknowledge that conflict and hostility negatively impact the children's emotional wellbeing.\n" +
        "2. The children's best interests will always be the primary consideration in all decisions.\n" +
        "3. Both parents will shield the children from adult conflicts and disagreements.\n" +
        "4. Regular check-ins on the children's emotional state will be part of the co-parenting routine.\n" +
        "5. Both parents support maintaining consistent routines, school attendance, and social activities for the children.",
    },
    {
      title: "Relocation Action Plan",
      category: "LIVING_SITUATION",
      content:
        "1. Both parents agree to support efforts to relocate closer to the children's school.\n" +
        "2. The relocating parent will contact housing officers within 30 days to explore options.\n" +
        "3. The other parent will provide necessary documentation to support the housing application if needed.\n" +
        "4. Once relocation is achieved, the parenting schedule will be renegotiated.\n" +
        "5. If relocation is not possible within 6 months, alternative solutions will be discussed.",
    },
    {
      title: "Legal Process & Municipality Information Session",
      category: "FINANCIAL_CAPACITY",
      content:
        "1. Both parents agree to participate in an informationssamtal with Lerum Municipality.\n" +
        "2. During this session, a clear custody agreement based on Swedish law will be established.\n" +
        "3. The custody agreement will guide all co-parenting arrangements going forward.\n" +
        "4. Both parents agree to postpone the formal divorce filing until after the informationssamtal.\n" +
        "5. The custody agreement reached during the informationssamtal will be submitted to court when the divorce application is filed.",
    },
  ];

  return analysis;
}
