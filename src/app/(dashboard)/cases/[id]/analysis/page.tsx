"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Calendar,
  Target,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import ParentStatementAnalysis from "@/components/parent-statement-analysis";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface AnalysisData {
  overview: {
    totalAssessments: number;
    totalMessages: number;
    totalAgreements: number;
    totalResponsibilityItems: number;
    totalCalendarEvents: number;
    upcomingEvents: number;
  };
  communication: {
    totalMessages: number;
    conflictMessages: number;
    conflictRate: number;
    messagesBySender: Record<string, number>;
  };
  assessments: {
    completed: number;
    pending: number;
    averageScore: number | null;
    latestScores: { date: string; score: number; type: string }[];
  };
  agreements: {
    total: number;
    draft: number;
    accepted: number;
    completionRate: number;
  };
  responsibilities: {
    total: number;
    pending: number;
    completed: number;
    byCategory: Record<string, { total: number; pending: number; completed: number }>;
  };
}

interface AnswerComparison {
  questionId: string;
  questionText: string;
  category: string;
  subcategory: string | null;
  type: string;
  parentA: { value: string; score: number | null } | null;
  parentB: { value: string; score: number | null } | null;
  gap: number | null;
  severity: string;
}

interface CategoryGap {
  parentAAvg: number;
  parentBAvg: number;
  gap: number;
  severity: string;
  questionCount: number;
}

interface ConflictAnalysisData {
  analyses: { id: string; category: string; score: number; details: string | null; createdAt: string }[];
  answerComparisons: AnswerComparison[];
  categoryGaps: Record<string, CategoryGap>;
  comparativeScore: number | null;
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const { data: session, status } = useSession();
  const user = session?.user as { role: string } | undefined;
  const isAdmin = user?.role === "ADMIN" || user?.role === "MEDIATOR";

  // Redirect non-admin users
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/dashboard");
    }
  }, [status, isAdmin, router]);

  const [data, setData] = useState<AnalysisData | null>(null);
  const [conflictData, setConflictData] = useState<ConflictAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analysis/${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      const result = await res.json();
      setData(result);

      // Also fetch conflict analysis
      const conflictRes = await fetch(`/api/conflict-analysis?caseId=${caseId}`);
      if (conflictRes.ok) {
        const conflictResult = await conflictRes.json();
        setConflictData(conflictResult);
      }
    } catch (error) {
      console.error("[FETCH_ANALYSIS]", error);
      toast.error("Failed to load analysis data");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analysis data available.</p>
      </div>
    );
  }

  const conflictStatus =
    data.communication.conflictRate > 50
      ? { label: "High Conflict", icon: TrendingUp, color: "text-red-600" }
      : data.communication.conflictRate > 20
      ? { label: "Moderate", icon: Minus, color: "text-amber-600" }
      : { label: "Low Conflict", icon: TrendingDown, color: "text-emerald-600" };

  const StatusIcon = conflictStatus.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Case Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of case communication, agreements, and progress
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.communication.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {data.communication.conflictMessages} flagged as conflict
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agreements</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.agreements.accepted}/{data.agreements.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.agreements.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.assessments.averageScore !== null
                ? `${data.assessments.averageScore}`
                : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average score ({data.assessments.completed} completed)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.totalCalendarEvents} total events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Communication Health
          </CardTitle>
          <CardDescription>
            Analysis of message patterns and conflict indicators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${conflictStatus.color}`}>
              <StatusIcon className="h-5 w-5" />
              <span className="font-semibold">{conflictStatus.label}</span>
            </div>
            <Badge variant={data.communication.conflictRate > 50 ? "destructive" : "secondary"}>
              {data.communication.conflictRate}% conflict rate
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Conflict Rate</span>
              <span className="font-medium">{data.communication.conflictRate}%</span>
            </div>
            <Progress
              value={data.communication.conflictRate}
              className={data.communication.conflictRate > 50 ? "bg-red-100" : undefined}
            />
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Messages by Participant</h4>
            <div className="space-y-2">
              {Object.entries(data.communication.messagesBySender).map(
                ([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm">{name}</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          (count / data.communication.totalMessages) * 100
                        }
                        className="w-32"
                      />
                      <span className="text-sm font-medium w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="assessments">
        <TabsList>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="responsibilities">Responsibilities</TabsTrigger>
          <TabsTrigger value="conflict">Conflict Resolution</TabsTrigger>
          <TabsTrigger value="statements">Parent Statements</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">
                    {data.assessments.completed}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {data.assessments.pending}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {data.assessments.averageScore !== null
                      ? `${data.assessments.averageScore}/100`
                      : "--"}
                  </div>
                  <div className="text-xs text-muted-foreground">Average Score</div>
                </div>
              </div>

              {data.assessments.latestScores.length > 0 && (
                <>
                  <h4 className="text-sm font-medium mb-3">Score History</h4>
                  <div className="space-y-2">
                    {data.assessments.latestScores.map((score, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm capitalize">{score.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(score.date).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-sm font-bold">
                          {score.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agreements" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Agreement Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{data.agreements.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {data.agreements.draft}
                  </div>
                  <div className="text-xs text-muted-foreground">In Draft</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">
                    {data.agreements.accepted}
                  </div>
                  <div className="text-xs text-muted-foreground">Accepted</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span className="font-medium">{data.agreements.completionRate}%</span>
                </div>
                <Progress value={data.agreements.completionRate} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsibilities" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Responsibility Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{data.responsibilities.total}</div>
                  <div className="text-xs text-muted-foreground">Total Items</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {data.responsibilities.pending}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">
                    {data.responsibilities.completed}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                {Object.entries(data.responsibilities.byCategory).map(
                  ([category, stats]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">
                          {category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stats.completed}/{stats.total} done
                        </span>
                      </div>
                      <Progress
                        value={
                          stats.total > 0
                            ? (stats.completed / stats.total) * 100
                            : 0
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflict" className="space-y-4 mt-4">
          {!conflictData || (conflictData.answerComparisons.length === 0 && conflictData.analyses.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Conflict Data Yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Both parents need to complete assessments before conflict analysis can detect alignment gaps.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Comparative Score */}
              {conflictData.comparativeScore !== null && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5" />
                      Co-Parenting Alignment
                    </CardTitle>
                    <CardDescription>
                      How well parent perspectives align across all assessment categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${
                          conflictData.comparativeScore >= 70 ? "text-emerald-600" :
                          conflictData.comparativeScore >= 40 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {conflictData.comparativeScore}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Alignment Score</p>
                      </div>
                      <div className="flex-1">
                        <Progress value={conflictData.comparativeScore} className="h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Low Alignment</span>
                          <span>High Alignment</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category Gaps Bar Chart */}
              {Object.keys(conflictData.categoryGaps).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Category Gap Analysis
                    </CardTitle>
                    <CardDescription>
                      Average score differences between parents per assessment category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(conflictData.categoryGaps).map(([cat, g]) => ({
                          category: cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                          "Parent A": g.parentAAvg,
                          "Parent B": g.parentBAvg,
                          Gap: g.gap,
                          severity: g.severity,
                        }))}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 10]} />
                        <YAxis type="category" dataKey="category" width={120} className="text-xs" />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="Parent A" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Parent B" fill="#EC4899" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Per-Question Gap Details */}
              {conflictData.answerComparisons.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Detailed Gap Analysis
                    </CardTitle>
                    <CardDescription>
                      Individual question comparisons showing specific points of disagreement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {conflictData.answerComparisons
                        .sort((a, b) => (b.gap || 0) - (a.gap || 0))
                        .map((comp) => (
                          <div
                            key={comp.questionId}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              comp.severity === "high" ? "border-red-200 bg-red-50" :
                              comp.severity === "medium" ? "border-amber-200 bg-amber-50" :
                              "border-emerald-200 bg-emerald-50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{comp.questionText}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-blue-600">
                                  A: {comp.parentA?.score !== null ? `${comp.parentA?.score}/10` : "N/A"}
                                </span>
                                <span className="text-xs text-pink-600">
                                  B: {comp.parentB?.score !== null ? `${comp.parentB?.score}/10` : "N/A"}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {comp.category.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {comp.gap !== null && (
                                <>
                                  <Badge
                                    variant={
                                      comp.severity === "high" ? "destructive" :
                                      comp.severity === "medium" ? "secondary" : "default"
                                    }
                                    className="text-xs"
                                  >
                                    Gap: {comp.gap}
                                  </Badge>
                                  {comp.severity === "high" ? (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  ) : comp.severity === "medium" ? (
                                    <Minus className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="statements" className="mt-4">
          <ParentStatementAnalysis caseId={caseId} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
