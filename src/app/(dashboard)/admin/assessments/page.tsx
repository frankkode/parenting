"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Plus,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type QuestionType = "SLIDER" | "TEXT" | "BOOLEAN" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

interface Question {
  id: string;
  text: string;
  category: string;
  subcategory: string | null;
  type: QuestionType;
  options: string[] | null;
  order: number;
}

interface CategoryGroup {
  category: string;
  questions: Question[];
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "SLIDER", label: "Rating (0-10 Slider)" },
  { value: "BOOLEAN", label: "Yes/No" },
  { value: "TEXT", label: "Open Text" },
  { value: "SINGLE_CHOICE", label: "Single Choice" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
];

const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living Situation",
  WORK_SITUATION: "Work Situation",
  CHILDCARE_CAPACITY: "Childcare Capacity",
  FINANCIAL_CAPACITY: "Financial Capacity",
  EMOTIONAL_READINESS: "Emotional Readiness",
  CHILD_WELLBEING: "Child Wellbeing",
};

export default function AdminAssessmentsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form fields
  const [formText, setFormText] = useState("");
  const [formCategory, setFormCategory] = useState("LIVING_SITUATION");
  const [formType, setFormType] = useState<QuestionType>("SLIDER");
  const [formOptions, setFormOptions] = useState("");
  const [formOrder, setFormOrder] = useState(0);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setQuestions(data);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const categories = [...new Set(questions.map((q) => q.category))];

  // Group questions by category
  const categoryGroups: CategoryGroup[] = categories
    .map((cat) => ({
      category: cat,
      questions: questions
        .filter((q) => q.category === cat)
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const filteredGroups = categoryGroups
    .map((group) => ({
      ...group,
      questions: group.questions.filter(
        (q) =>
          !searchQuery ||
          q.text.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(
      (group) =>
        (selectedCategory === "ALL" || group.category === selectedCategory) &&
        group.questions.length > 0
    );

  const openCreateForm = () => {
    setEditingQuestion(null);
    setFormText("");
    setFormCategory("LIVING_SITUATION");
    setFormType("SLIDER");
    setFormOptions("");
    setFormOrder(questions.length + 1);
    setShowForm(true);
  };

  const openEditForm = (question: Question) => {
    setEditingQuestion(question);
    setFormText(question.text);
    setFormCategory(question.category);
    setFormType(question.type);
    setFormOptions(question.options ? question.options.join("\n") : "");
    setFormOrder(question.order);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formText.trim()) {
      toast.error("Please enter question text");
      return;
    }
    if (
      (formType === "SINGLE_CHOICE" || formType === "MULTIPLE_CHOICE") &&
      !formOptions.trim()
    ) {
      toast.error("Please enter options for choice questions");
      return;
    }

    setIsSubmitting(true);

    try {
      const optionsArray =
        formType === "SINGLE_CHOICE" || formType === "MULTIPLE_CHOICE"
          ? formOptions.split("\n").filter((o) => o.trim())
          : null;

      if (editingQuestion) {
        const res = await fetch("/api/questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingQuestion.id,
            text: formText,
            category: formCategory,
            type: formType,
            options: optionsArray,
            order: formOrder,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Question updated");
      } else {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: formText,
            category: formCategory,
            type: formType,
            options: optionsArray,
            order: formOrder,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Question added");
      }

      setShowForm(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch {
      toast.error("Failed to save question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setDeleteConfirm(null);
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const renderQuestionPreview = (type: QuestionType) => {
    switch (type) {
      case "SLIDER":
        return (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            {[0, 2, 4, 6, 8, 10].map((n) => (
              <span
                key={n}
                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-xs"
              >
                {n}
              </span>
            ))}
          </div>
        );
      case "BOOLEAN":
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="px-3 py-1 rounded border border-gray-200">Yes</span>
            <span className="px-3 py-1 rounded border border-gray-200">No</span>
          </div>
        );
      case "TEXT":
        return (
          <div className="h-8 bg-gray-50 rounded border border-gray-200" />
        );
      case "SINGLE_CHOICE":
      case "MULTIPLE_CHOICE":
        return (
          <div className="flex flex-wrap gap-1 text-sm text-gray-500">
            {(formOptions
              ? formOptions.split("\n").filter((o) => o.trim())
              : editingQuestion?.options || ["Option 1", "Option 2"]
            )
              .slice(0, 4)
              .map((opt, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded border border-gray-200 text-xs"
                >
                  {opt}
                </span>
              ))}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment Configuration
          </h1>
          <p className="text-gray-500 mt-1">Loading questions...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
              {[1, 2].map((j) => (
                <div key={j} className="h-12 bg-gray-100 rounded mb-2" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment Configuration
          </h1>
          <p className="text-gray-500 mt-1">
            Manage assessment questions and categories
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {["ALL", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {cat === "ALL" ? "All Categories" : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Questions by Category */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div
              key={group.category}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  {CATEGORY_LABELS[group.category] || group.category}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {group.questions.map((question) => (
                  <div
                    key={question.id}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono w-6">
                            #{question.order}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                              question.type === "SLIDER"
                                ? "bg-blue-50 text-blue-700"
                                : question.type === "BOOLEAN"
                                ? "bg-emerald-50 text-emerald-700"
                                : question.type === "TEXT"
                                ? "bg-violet-50 text-violet-700"
                                : "bg-amber-50 text-amber-700"
                            )}
                          >
                            {QUESTION_TYPES.find(
                              (t) => t.value === question.type
                            )?.label || question.type}
                          </span>
                          {question.subcategory && (
                            <span className="text-xs text-gray-400 capitalize">
                              {question.subcategory.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {question.text}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.options.map((opt, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEditForm(question)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        {deleteConfirm === question.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(question.id)}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-sm font-medium text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(question.id)}
                            className="text-sm font-medium text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {searchQuery
              ? "No Questions Match Your Search"
              : "No Questions Configured"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search or filter criteria."
              : 'Click "Add Question" to start building your assessment.'}
          </p>
        </div>
      )}

      {/* Add/Edit Question Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative z-10 bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingQuestion ? "Edit Question" : "Add Question"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Enter the question text..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as QuestionType)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                  min={1}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Options for Choice questions */}
              {(formType === "SINGLE_CHOICE" ||
                formType === "MULTIPLE_CHOICE") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter each option on a new line
                  </p>
                </div>
              )}

              {/* Type Preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Preview:
                </p>
                {renderQuestionPreview(formType)}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : editingQuestion ? (
                  "Save Changes"
                ) : (
                  "Add Question"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
