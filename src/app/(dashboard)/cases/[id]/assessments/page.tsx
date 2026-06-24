"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2, Plus, BarChart3, ClipboardCheck, CheckCircle2, Clock,
  AlertCircle, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  category: string;
  subcategory: string | null;
  type: string;
  options: string[] | null;
  order: number;
}

interface Answer {
  id: string;
  questionId: string;
  value: string;
  score: number | null;
}

interface Assessment {
  id: string;
  type: string;
  status: string;
  score: number | null;
  createdAt: string;
  userId: string;
  user: { id: string; name: string; email: string } | null;
  _count?: { answers: number };
  answers?: Answer[];
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

export default function AssessmentsPage() {
  const params = useParams();
  const caseId = params.id as string;
  const session = useSession();
  const user = session?.data?.user as { id: string; role: string } | undefined;
  const isAdmin = user?.role === "ADMIN" || user?.role === "MEDIATOR";

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, { value: string; score: number | null }>>({});
  const [saving, setSaving] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assessments?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAssessments(data);
    } catch {
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setQuestions(data);
    } catch {
      toast.error("Failed to load questions");
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
    fetchQuestions();
  }, [fetchAssessments, fetchQuestions]);

  const handleCreateAssessment = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCaseId: caseId, type: "CO_PARENTING" }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success("Assessment created");
      setActiveAssessment(data);
      setAnswers({});
      fetchAssessments();
    } catch {
      toast.error("Failed to create assessment");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveAnswer = async (questionId: string, value: string, score: number | null) => {
    if (!activeAssessment) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { value, score } }));
  };

  const handleSubmitAllAnswers = async () => {
    if (!activeAssessment) return;
    try {
      setSaving(true);
      for (const [questionId, answer] of Object.entries(answers)) {
        await fetch("/api/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: activeAssessment.id,
            questionId,
            value: answer.value,
            score: answer.score,
          }),
        });
      }
      // Complete the assessment
      const totalScore = Object.values(answers)
        .filter((a) => a.score !== null)
        .reduce((sum, a) => sum + (a.score || 0), 0);
      const scoredCount = Object.values(answers).filter((a) => a.score !== null).length;
      const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : null;

      await fetch(`/api/assessments/${activeAssessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", score: avgScore }),
      });

      toast.success("Assessment completed");
      setActiveAssessment(null);
      setAnswers({});
      fetchAssessments();
    } catch {
      toast.error("Failed to save answers");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryScore = (assessment: Assessment) => {
    if (!assessment.answers) return null;
    const categoryScores: Record<string, { total: number; count: number }> = {};
    for (const ans of assessment.answers) {
      const q = questions.find((q) => q.id === ans.questionId);
      if (q && ans.score !== null) {
        if (!categoryScores[q.category]) categoryScores[q.category] = { total: 0, count: 0 };
        categoryScores[q.category].total += ans.score;
        categoryScores[q.category].count++;
      }
    }
    const result: Record<string, number> = {};
    for (const [cat, data] of Object.entries(categoryScores)) {
      result[cat] = Math.round((data.total / data.count) * 10);
    }
    return result;
  };

  const groupedQuestions: Record<string, Question[]> = {};
  for (const q of questions) {
    if (!groupedQuestions[q.category]) groupedQuestions[q.category] = [];
    groupedQuestions[q.category].push(q);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            Complete comprehensive co-parenting assessments across 6 categories
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreateAssessment} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            New Assessment
          </Button>
        )}
      </div>

      {activeAssessment ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Complete Your Assessment
            </CardTitle>
            <CardDescription>
              Rate each question on a scale of 0-10. Be honest for the best analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(groupedQuestions)[0]}>
              <TabsList className="w-full flex flex-wrap h-auto gap-1">
                {Object.entries(groupedQuestions).map(([cat, qs]) => (
                  <TabsTrigger key={cat} value={cat} className="text-xs">
                    {CATEGORY_LABELS[cat] || cat} ({qs.length})
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(groupedQuestions).map(([cat, qs]) => (
                <TabsContent key={cat} value={cat} className="space-y-6 mt-4">
                  {qs.map((q) => (
                    <div key={q.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{q.text}</p>
                          {q.subcategory && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {q.subcategory.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                        {answers[q.id]?.score !== null && answers[q.id]?.score !== undefined && (
                          <Badge variant="secondary" className="ml-2">
                            {answers[q.id].score}/10
                          </Badge>
                        )}
                      </div>

                      {q.type === "SLIDER" ? (
                        <div className="space-y-2">
                          <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[
                              answers[q.id]?.score !== null &&
                              answers[q.id]?.score !== undefined
                                ? answers[q.id].score!
                                : 5,
                            ]}
                            onValueChange={([val]) =>
                              handleSaveAnswer(q.id, String(val), val)
                            }
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0 - Very Low</span>
                            <span>5 - Average</span>
                            <span>10 - Excellent</span>
                          </div>
                        </div>
                      ) : q.type === "TEXT" ? (
                        <Textarea
                          placeholder="Type your answer..."
                          value={answers[q.id]?.value || ""}
                          onChange={(e) =>
                            handleSaveAnswer(q.id, e.target.value, null)
                          }
                          className="min-h-[100px]"
                        />
                      ) : q.type === "BOOLEAN" ? (
                        <RadioGroup
                          value={answers[q.id]?.value ?? ""}
                          onValueChange={(val) =>
                            handleSaveAnswer(q.id, val, val === "Yes" ? 10 : 0)
                          }
                          className="flex items-center gap-6"
                        >
                          {["Yes", "No"].map((opt) => (
                            <div
                              key={opt}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={opt}
                                id={`${q.id}-${opt}`}
                              />
                              <Label
                                htmlFor={`${q.id}-${opt}`}
                                className="text-sm cursor-pointer"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <RadioGroup
                          value={answers[q.id]?.value ?? ""}
                          onValueChange={(val) =>
                            handleSaveAnswer(q.id, val, null)
                          }
                          className="flex flex-wrap gap-3"
                        >
                          {(q.options || []).map((opt) => (
                            <div
                              key={opt}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={opt}
                                id={`${q.id}-${opt}`}
                              />
                              <Label
                                htmlFor={`${q.id}-${opt}`}
                                className="text-sm cursor-pointer"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-muted-foreground">
                      {qs.filter((q) => answers[q.id]).length} of {qs.length} answered
                    </span>
                    <Progress
                      value={(qs.filter((q) => answers[q.id]).length / qs.length) * 100}
                      className="w-48"
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button onClick={handleSubmitAllAnswers} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Existing Assessments List */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({assessments.length})</TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({assessments.filter((a) => a.status === "COMPLETED").length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({assessments.filter((a) => a.status !== "COMPLETED").length})
              </TabsTrigger>
            </TabsList>

            {(["all", "completed", "pending"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                {assessments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center py-12">
                      <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Assessments Yet</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                        Start your first co-parenting assessment to get personalized insights.
                      </p>
                      {isAdmin && (
                        <Button onClick={handleCreateAssessment} disabled={creating}>
                          <Plus className="h-4 w-4 mr-2" />
                          Start Assessment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  assessments
                    .filter((a) =>
                      tab === "all"
                        ? true
                        : tab === "completed"
                        ? a.status === "COMPLETED"
                        : a.status !== "COMPLETED"
                    )
                    .map((assessment) => (
                      <Card key={assessment.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{assessment.type.replace(/_/g, " ")} Assessment</CardTitle>
                              <CardDescription>
                                By {assessment.user?.name || "Unknown"} &middot;{" "}
                                {new Date(assessment.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={assessment.status === "COMPLETED" ? "default" : "secondary"}
                            >
                              {assessment.status === "COMPLETED" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {assessment.status.charAt(0) + assessment.status.slice(1).toLowerCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 mb-4">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Score:</span>
                            <span className={`text-lg font-bold ${
                              assessment.score !== null
                                ? assessment.score >= 70
                                  ? "text-emerald-600"
                                  : assessment.score >= 40
                                  ? "text-amber-600"
                                  : "text-red-600"
                                : "text-muted-foreground"
                            }`}>
                              {assessment.score !== null ? `${assessment.score}/100` : "N/A"}
                            </span>
                            {assessment.score !== null && (
                              <Progress value={assessment.score} className="flex-1 max-w-xs" />
                            )}
                          </div>
                          {assessment._count && (
                            <p className="text-xs text-muted-foreground">
                              {assessment._count.answers} questions answered
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
