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
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertCircle, TrendingUp, X, Pencil, Trash2, Search, Library,
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_PREFIX = "assessment_answers_";

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
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, { value: string; score: number | null }>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("");

  // Question editing (admin only)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editFormText, setEditFormText] = useState("");
  const [editFormCategory, setEditFormCategory] = useState("");
  const [editFormType, setEditFormType] = useState("");
  const [editFormOptions, setEditFormOptions] = useState("");
  const [editFormSubcategory, setEditFormSubcategory] = useState("");
  const [editFormOrder, setEditFormOrder] = useState(0);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Add from bank
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankCategory, setBankCategory] = useState("ALL");
  const [addingQuestionId, setAddingQuestionId] = useState<string | null>(null);

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

  const handleStartAssessment = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (!res.ok) throw new Error("Failed to fetch assessment");
      const data = await res.json();
      setActiveAssessment(data);

      // Load assessment-specific questions (or fall back to all questions for older assessments)
      if (data.assessmentQuestions?.length > 0) {
        const aq = data.assessmentQuestions.map((aq: { question: Question; order: number }) => ({
          ...aq.question,
          order: aq.order,
        }));
        setQuestions(aq);
      } else {
        // Backward compat: older assessment, fetch all questions
        await fetchQuestions();
      }

      // Start from server answers
      const existing: Record<string, { value: string; score: number | null }> = {};
      if (data.answers) {
        for (const ans of data.answers) {
          existing[ans.questionId] = { value: ans.value, score: ans.score };
        }
      }

      // Merge in localStorage answers (more recent than server)
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + assessmentId);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, { value: string; score: number | null }>;
          for (const [qId, ans] of Object.entries(parsed)) {
            existing[qId] = ans;
          }
        }
      } catch { /* ignore corrupt localStorage */ }

      // Initialize unanswered SLIDER questions to default of 5
      const currentQuestions = data.assessmentQuestions?.length > 0
        ? data.assessmentQuestions.map((aq: { question: Question }) => aq.question)
        : questions;
      for (const q of currentQuestions) {
        if (q.type === "SLIDER" && !existing[q.id]) {
          existing[q.id] = { value: "5", score: 5 };
        }
      }

      setAnswers(existing);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_PREFIX + assessmentId, JSON.stringify(existing));
      } catch { /* quota exceeded */ }

      // Restore skipped questions
      const skipped = new Set<string>();
      for (const [qId, ans] of Object.entries(existing)) {
        if (ans.value === "__SKIPPED__") {
          skipped.add(qId);
        }
      }
      setSkippedQuestions(skipped);
    } catch {
      toast.error("Failed to load assessment");
    }
  };

  const fetchBankQuestions = async () => {
    setBankLoading(true);
    setBankQuestions([]);
    try {
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBankQuestions(data);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setBankLoading(false);
    }
  };

  const handleAddQuestionToAssessment = async (questionId: string) => {
    if (!activeAssessment) return;
    setAddingQuestionId(questionId);
    try {
      const res = await fetch(`/api/assessments/${activeAssessment.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (!res.ok) throw new Error("Failed to add");
      toast.success("Question added to assessment");
      // Add the question to the local list
      const newQ = bankQuestions.find((q) => q.id === questionId);
      if (newQ) {
        setQuestions((prev) => [...prev, newQ]);
      }
    } catch {
      toast.error("Failed to add question");
    } finally {
      setAddingQuestionId(null);
    }
  };

  const handleToggleSkip = (questionId: string) => {
    setSkippedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
        setAnswers((a) => {
          const copy = { ...a };
          delete copy[questionId];
          try { localStorage.setItem(STORAGE_PREFIX + activeAssessment!.id, JSON.stringify(copy)); } catch {}
          return copy;
        });
      } else {
        next.add(questionId);
        setAnswers((a) => {
          const updated = { ...a, [questionId]: { value: "__SKIPPED__", score: null } };
          try { localStorage.setItem(STORAGE_PREFIX + activeAssessment!.id, JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      return next;
    });
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    try {
      setPublishing(assessmentId);
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      toast.success("Assessment published — parent can now start answering");
      fetchAssessments();
    } catch {
      toast.error("Failed to publish assessment");
    } finally {
      setPublishing(null);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      setDeleting(assessmentId);
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Assessment deleted");
      setDeleteConfirm(null);
      fetchAssessments();
    } catch {
      toast.error("Failed to delete assessment");
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveAnswer = async (questionId: string, value: string, score: number | null) => {
    if (!activeAssessment) return;
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: { value, score } };
      // Persist to localStorage so answers survive refreshes
      try {
        localStorage.setItem(STORAGE_PREFIX + activeAssessment.id, JSON.stringify(updated));
      } catch { /* quota exceeded */ }
      // Also auto-save to API in background
      fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: activeAssessment.id, questionId, value, score }),
      }).catch(() => { /* ignore network errors on autosave */ });
      return updated;
    });
  };

  // Functional updater for MULTI checkboxes — avoids stale closure on rapid clicks
  const handleMultiChange = (questionId: string, opt: string, add: boolean) => {
    if (!activeAssessment) return;
    setAnswers((prev) => {
      const raw = prev[questionId]?.value ?? "";
      let selected: string[] = [];
      try {
        selected = raw
          ? raw.startsWith("[")
            ? JSON.parse(raw)
            : raw.split(",").map((s: string) => s.trim())
          : [];
      } catch {
        selected = raw ? raw.split(",").map((s: string) => s.trim()) : [];
      }
      const next = add
        ? [...selected.filter((s) => s !== opt), opt]
        : selected.filter((s) => s !== opt);
      const value = JSON.stringify(next);
      const updated = { ...prev, [questionId]: { value, score: null } };
      try {
        localStorage.setItem(STORAGE_PREFIX + activeAssessment.id, JSON.stringify(updated));
      } catch { /* quota exceeded */ }
      fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: activeAssessment.id, questionId, value, score: null }),
      }).catch(() => {});
      return updated;
    });
  };

  // Admin/mediator: delete a single answer
  const handleDeleteAnswer = async (questionId: string) => {
    if (!activeAssessment || !isAdmin) return;
    // Find the answer ID to delete
    const answerId = activeAssessment.answers?.find(
      (a) => a.questionId === questionId
    )?.id;
    if (!answerId) {
      // No server-side answer yet; just clear from local state
      setAnswers((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        try { localStorage.setItem(STORAGE_PREFIX + activeAssessment.id, JSON.stringify(copy)); } catch {}
        return copy;
      });
      setSkippedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`/api/answers?answerId=${answerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete answer");
      setAnswers((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        try { localStorage.setItem(STORAGE_PREFIX + activeAssessment.id, JSON.stringify(copy)); } catch {}
        return copy;
      });
      setSkippedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      toast.success("Answer cleared");
    } catch {
      toast.error("Failed to clear answer");
    }
  };

  const openEditQuestionDialog = (q: Question) => {
    setEditingQuestion(q);
    setEditFormText(q.text);
    setEditFormCategory(q.category);
    setEditFormType(q.type);
    setEditFormOptions(q.options ? q.options.join("\n") : "");
    setEditFormSubcategory(q.subcategory || "");
    setEditFormOrder(q.order);
  };

  const handleSaveQuestion = async () => {
    if (!editFormText.trim()) {
      toast.error("Please enter question text");
      return;
    }
    if (
      (editFormType === "SELECT" || editFormType === "MULTI") &&
      !editFormOptions.trim()
    ) {
      toast.error("Please enter options for choice questions");
      return;
    }
    setSavingQuestion(true);
    try {
      const optionsArray =
        editFormType === "SELECT" || editFormType === "MULTI"
          ? editFormOptions.split("\n").filter((o) => o.trim())
          : null;
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingQuestion!.id,
          text: editFormText,
          category: editFormCategory,
          type: editFormType,
          options: optionsArray,
          order: editFormOrder,
          subcategory: editFormSubcategory.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Question updated");
      setEditingQuestion(null);
      fetchQuestions();
    } catch {
      toast.error("Failed to save question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!activeAssessment) return;
    setSavingQuestion(true);
    try {
      const res = await fetch(
        `/api/assessments/${activeAssessment.id}/questions?questionId=${questionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove");
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      // Also remove any local answers for this question
      setAnswers((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
      setSkippedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setQuestionToDelete(null);
      toast.success("Question removed from assessment");
    } catch {
      toast.error("Failed to remove question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleSubmitAllAnswers = async () => {
    if (!activeAssessment || !allCategoriesComplete) return;
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
        .filter((a) => a.score !== null && a.value !== "__SKIPPED__")
        .reduce((sum, a) => sum + (a.score || 0), 0);
      const scoredCount = Object.values(answers).filter((a) => a.score !== null && a.value !== "__SKIPPED__").length;
      const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : null;

      await fetch(`/api/assessments/${activeAssessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", score: avgScore }),
      });

      toast.success("Assessment completed");
      try { localStorage.removeItem(STORAGE_PREFIX + activeAssessment.id); } catch {}
      setActiveAssessment(null);
      setAnswers({});
      setSkippedQuestions(new Set());
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

  // Compute per-category stats
  const categoryStats = Object.entries(groupedQuestions).map(([cat, qs]) => {
    const total = qs.length;
    const answered = qs.filter((q) => answers[q.id] && answers[q.id].value !== "__SKIPPED__").length;
    const skipped = qs.filter((q) => skippedQuestions.has(q.id)).length;
    const addressed = answered + skipped;
    const complete = addressed === total;
    return { cat, total, answered, skipped, addressed, complete };
  });

  const allCategoriesComplete = categoryStats.length > 0 && categoryStats.every((c) => c.complete);
  const addressedCount = categoryStats.reduce((sum, c) => sum + c.addressed, 0);

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Complete Your Assessment
                </CardTitle>
                <CardDescription>
                  {questions.length} questions — rate each on a scale of 0-10
                </CardDescription>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    fetchBankQuestions();
                    setShowBankDialog(true);
                  }}
                >
                  <Library className="h-4 w-4 mr-1" />
                  Add from Bank
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab || Object.keys(groupedQuestions)[0]} onValueChange={setActiveTab}>
              <TabsList className="w-full flex flex-wrap h-auto gap-1">
                {Object.entries(groupedQuestions).map(([cat, qs]) => {
                  const stat = categoryStats.find((s) => s.cat === cat);
                  const isComplete = stat?.complete;
                  const isPartial = stat && stat.addressed > 0 && !stat.complete;
                  return (
                    <TabsTrigger key={cat} value={cat} className="text-xs gap-1.5">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          isComplete
                            ? "bg-emerald-500"
                            : isPartial
                            ? "bg-amber-400"
                            : "bg-gray-300"
                        }`}
                      />
                      {CATEGORY_LABELS[cat] || cat} ({qs.length})
                    </TabsTrigger>
                  );
                })}
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
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {answers[q.id]?.score !== null && answers[q.id]?.score !== undefined && (
                            <Badge variant="secondary" className="ml-0">
                              {answers[q.id].score}/10
                            </Badge>
                          )}
                          {isAdmin && activeAssessment && answers[q.id] && answers[q.id].value !== "__SKIPPED__" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnswer(q.id)}
                              className="text-xs text-orange-500 hover:text-orange-700 font-medium ml-1"
                            >
                              Clear
                            </button>
                          )}
                          {isAdmin && activeAssessment && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditQuestionDialog(q)}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-1 inline-flex items-center gap-0.5"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              {questionToDelete === q.id ? (
                                <span className="inline-flex items-center gap-0.5 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(q.id)}
                                    disabled={savingQuestion}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setQuestionToDelete(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setQuestionToDelete(q.id)}
                                  className="text-xs text-orange-400 hover:text-orange-600 font-medium ml-1 inline-flex items-center gap-0.5"
                                  title="Remove from this assessment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
                      ) : q.type === "SELECT" || q.type === "SINGLE_CHOICE" ? (
                        <Select
                          value={answers[q.id]?.value ?? ""}
                          onValueChange={(val) =>
                            handleSaveAnswer(q.id, val, null)
                          }
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select an option..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(q.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : q.type === "MULTI" || q.type === "MULTIPLE_CHOICE" ? (
                        <div className="flex flex-wrap gap-3">
                          {(q.options || []).map((opt) => {
                            // Parse stored multi-value (comma-separated or JSON array)
                            const raw = answers[q.id]?.value ?? "";
                            let selected: string[] = [];
                            try {
                              selected = raw ? (raw.startsWith("[") ? JSON.parse(raw) : raw.split(",").map((s: string) => s.trim())) : [];
                            } catch { selected = raw ? raw.split(",").map((s: string) => s.trim()) : []; }
                            const isChecked = selected.includes(opt);
                            return (
                              <div
                                key={opt}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`${q.id}-${opt}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleMultiChange(q.id, opt, checked === true)
                                  }
                                />
                                <Label
                                  htmlFor={`${q.id}-${opt}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {opt}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
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
                      {/* Skip / Unskip button */}
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        {skippedQuestions.has(q.id) ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSkip(q.id)}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            Skipped — click to answer
                          </button>
                        ) : !answers[q.id] ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSkip(q.id)}
                            className="text-xs text-gray-400 hover:text-gray-500 font-medium"
                          >
                            Skip this question
                          </button>
                        ) : null}
                      </div>
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

            <div className="mt-6 pt-4 border-t space-y-4">
              {/* Category progress summary */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Progress: {addressedCount}/{questions.length} questions addressed
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {categoryStats.map((s) => (
                    <button
                      type="button"
                      key={s.cat}
                      onClick={() => setActiveTab(s.cat)}
                      className={`flex items-center justify-between rounded-md px-3 py-1.5 text-xs cursor-pointer transition-colors hover:ring-2 hover:ring-offset-1 hover:ring-current ${
                        s.complete
                          ? "bg-emerald-50 text-emerald-700"
                          : s.addressed > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      <span className="font-medium">{CATEGORY_LABELS[s.cat] || s.cat}</span>
                      <span>
                        {s.addressed}/{s.total}
                        {s.skipped > 0 && ` (${s.skipped} skipped)`}
                        {s.complete && " ✓"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <div className="flex items-center justify-between">
                {!allCategoriesComplete ? (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Complete all categories above before submitting
                  </p>
                ) : (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    All categories complete — ready to submit
                  </p>
                )}
                <Button
                  onClick={handleSubmitAllAnswers}
                  disabled={saving || !allCategoriesComplete}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Submit Assessment
                </Button>
              </div>
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
                              {assessment.status.replace(/_/g, " ").charAt(0) + assessment.status.replace(/_/g, " ").slice(1).toLowerCase()}
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
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                            {isAdmin && assessment.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePublishAssessment(assessment.id)}
                                disabled={publishing === assessment.id}
                              >
                                {publishing === assessment.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                Publish
                              </Button>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartAssessment(assessment.id)}
                                >
                                  Edit
                                </Button>
                                {deleteConfirm === assessment.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteAssessment(assessment.id)}
                                      disabled={deleting === assessment.id}
                                    >
                                      {deleting === assessment.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : null}
                                      Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteConfirm(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteConfirm(assessment.id)}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </>
                            )}
                            {!isAdmin && assessment.userId === user?.id && assessment.status !== "COMPLETED" && (
                              <Button
                                size="sm"
                                onClick={() => handleStartAssessment(assessment.id)}
                              >
                                <ClipboardCheck className="h-3 w-3 mr-1" />
                                {assessment.status === "IN_PROGRESS" ? "Continue" : "Start"} Assessment
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* ─── Add from Bank Dialog ────────────────── */}
      {showBankDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowBankDialog(false)}
          />
          <div className="relative z-10 bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Library className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Add Questions from Bank</h3>
              </div>
              <button
                onClick={() => setShowBankDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["ALL", ...Object.keys(CATEGORY_LABELS)].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBankCategory(cat)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      bankCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat === "ALL" ? "All" : CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Question list */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {bankLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No questions found in the bank.</p>
                </div>
              ) : (
                (() => {
                  const filtered = bankQuestions.filter((q) => {
                    const matchSearch = !bankSearch ||
                      q.text.toLowerCase().includes(bankSearch.toLowerCase());
                    const matchCat = bankCategory === "ALL" || q.category === bankCategory;
                    return matchSearch && matchCat;
                  });
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No questions match your search or filter.</p>
                      </div>
                    );
                  }
                  const alreadyInSet = new Set(questions.map((aq) => aq.id));
                  const newCount = filtered.filter((q) => !alreadyInSet.has(q.id)).length;
                  return (
                    <div className="space-y-1">
                      {newCount > 0 && (
                        <p className="text-xs text-gray-400 pb-1">{newCount} question{newCount !== 1 ? "s" : ""} available to add</p>
                      )}
                      {filtered.map((q) => {
                        const alreadyAdded = alreadyInSet.has(q.id);
                        return (
                          <div
                            key={q.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              alreadyAdded
                                ? "bg-gray-50 border-gray-100 opacity-60"
                                : "hover:bg-gray-50 border-gray-100"
                            }`}
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-900">{q.text}</p>
                                {alreadyAdded && (
                                  <Badge variant="secondary" className="text-xs shrink-0">Already added</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">
                                  {CATEGORY_LABELS[q.category] || q.category}
                                </span>
                                <span className="text-xs text-gray-300">{q.type}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={alreadyAdded ? "ghost" : "outline"}
                              onClick={() => handleAddQuestionToAssessment(q.id)}
                              disabled={alreadyAdded || addingQuestionId === q.id}
                            >
                              {addingQuestionId === q.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : alreadyAdded ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              <span className="ml-1">{alreadyAdded ? "Added" : "Add"}</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowBankDialog(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Question Dialog (admin) ─────────── */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingQuestion(null)}
          />
          <div className="relative z-10 bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Edit Question</h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <textarea
                  value={editFormText}
                  onChange={(e) => setEditFormText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editFormCategory}
                    onChange={(e) => setEditFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type
                  </label>
                  <select
                    value={editFormType}
                    onChange={(e) => setEditFormType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="SLIDER">Rating (0-10 Slider)</option>
                    <option value="BOOLEAN">Yes/No</option>
                    <option value="TEXT">Open Text</option>
                    <option value="SELECT">Single Choice</option>
                    <option value="MULTI">Multiple Choice</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editFormSubcategory}
                  onChange={(e) => setEditFormSubcategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={editFormOrder}
                  onChange={(e) => setEditFormOrder(parseInt(e.target.value) || 0)}
                  min={1}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {(editFormType === "SELECT" || editFormType === "MULTI") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    value={editFormOptions}
                    onChange={(e) => setEditFormOptions(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={savingQuestion}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {savingQuestion ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
