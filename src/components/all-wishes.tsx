"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Heart, Loader2, User, Send, CheckCircle2, MessageSquare,
  Trash2, ExternalLink, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";

interface WishResponse {
  id: string;
  agreement: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface Wish {
  id: string;
  content: string;
  category: string;
  source: string;
  authorId: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
  familyCase: { id: string; title: string };
  responses: WishResponse[];
}

interface CaseOption {
  id: string;
  title: string;
  parentA: { id: string; name: string | null };
  parentB: { id: string; name: string | null };
}

interface Props {
  currentUserId: string;
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: "CHILDCARE_CAPACITY", label: "Childcare" },
  { value: "FINANCIAL_CAPACITY", label: "Financial" },
  { value: "EMOTIONAL_READINESS", label: "Emotional" },
  { value: "CHILD_WELLBEING", label: "Wellbeing" },
  { value: "LIVING_SITUATION", label: "Living" },
  { value: "WORK_SITUATION", label: "Work" },
];

const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living",
  WORK_SITUATION: "Work",
  CHILDCARE_CAPACITY: "Childcare",
  FINANCIAL_CAPACITY: "Financial",
  EMOTIONAL_READINESS: "Emotional",
  CHILD_WELLBEING: "Wellbeing",
};

export default function AllWishesPage({ currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Create wish state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("CHILDCARE_CAPACITY");
  const [creatingWish, setCreatingWish] = useState(false);

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    try {
      const url = isAdmin ? "/api/wishes" : `/api/wishes?userId=${currentUserId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWishes(data);
    } catch {
      toast.error("Failed to load wishes");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isAdmin]);

  const fetchCases = useCallback(async () => {
    try {
      const url = isAdmin ? "/api/cases" : `/api/cases`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch cases");
      const data = await res.json();
      setCases(data);
      if (data.length > 0) {
        setSelectedCaseId(data[0].id);
        setSelectedParentId(data[0].parentA?.id || "");
      }
    } catch {
      // Silently fail — case selector will be empty
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchWishes();
    fetchCases();
  }, [fetchWishes, fetchCases]);

  const handleCreateWish = async () => {
    if (!selectedCaseId || !newContent.trim()) {
      toast.error("Please select a case and enter wish content");
      return;
    }
    setCreatingWish(true);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: selectedCaseId,
          authorId: selectedParentId || undefined,
          content: newContent.trim(),
          category: newCategory,
          source: "MANUAL",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create wish");
      }
      toast.success("Wish created");
      setShowCreateForm(false);
      setNewContent("");
      setNewCategory("CHILDCARE_CAPACITY");
      fetchWishes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create wish");
    } finally {
      setCreatingWish(false);
    }
  };

  const handleSubmitResponse = async (wishId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/wishes/${wishId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreement: sliderValue, comment: comment || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      toast.success("Response saved");
      setRespondingTo(null);
      setComment("");
      fetchWishes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    try {
      const res = await fetch(`/api/wishes?id=${wishId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Wish removed");
      fetchWishes();
    } catch {
      toast.error("Failed to delete wish");
    }
  };

  const getAgreementColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  };

  const getAgreementBg = (score: number) => {
    if (score >= 8) return "bg-emerald-50";
    if (score >= 5) return "bg-amber-50";
    return "bg-red-50";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Group wishes by case for display
  const wishesByCase: Record<string, { caseTitle: string; wishes: Wish[] }> = {};
  for (const w of wishes) {
    const cid = w.familyCase?.id || "unknown";
    if (!wishesByCase[cid]) {
      wishesByCase[cid] = { caseTitle: w.familyCase?.title || "Case", wishes: [] };
    }
    wishesByCase[cid].wishes.push(w);
  }

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            Co-Parenting Wishes
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin
              ? "All wishes from all cases. Monitor co-parenting alignment."
              : "Review and respond to your co-parent's wishes. Rate your agreement and leave comments."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Wish
          </Button>
        )}
      </div>

      {/* Create Wish Form */}
      {showCreateForm && isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Add a Co-Parenting Wish</span>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Manually add a wish extracted from a parent's statement so the other parent can respond.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Case</label>
                <Select value={selectedCaseId} onValueChange={(v) => {
                  setSelectedCaseId(v);
                  const c = cases.find((c) => c.id === v);
                  if (c) setSelectedParentId(c.parentA?.id || "");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} ({c.parentA?.name || "Parent A"} & {c.parentB?.name || "Parent B"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">From Parent</label>
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCase && (
                      <>
                        <SelectItem value={selectedCase.parentA?.id || ""}>
                          {selectedCase.parentA?.name || "Parent A"}
                        </SelectItem>
                        <SelectItem value={selectedCase.parentB?.id || ""}>
                          {selectedCase.parentB?.name || "Parent B"}
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Wish Content</label>
              <Textarea
                placeholder="Enter the wish or concern the parent expressed..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateWish} disabled={creatingWish}>
                {creatingWish ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Create Wish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wishes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Heart className="h-14 w-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Wishes Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              When parents submit their statements, their key points will appear here for the other parent to review and respond to.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(wishesByCase).map(([caseId, group]) => (
          <Card key={caseId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {group.caseTitle}
                  </CardTitle>
                  <CardDescription>
                    {group.wishes.length} {group.wishes.length === 1 ? "wish" : "wishes"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/cases/${caseId}/analysis`)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Case
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.wishes.map((wish) => {
                const myResponse = wish.responses.find((r) => r.user.id === currentUserId);
                const otherResponse = wish.responses.find((r) => r.user.id !== currentUserId);
                const isMyWish = wish.authorId === currentUserId;
                const isResponding = respondingTo === wish.id;

                return (
                  <div key={wish.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[wish.category] || wish.category}
                          </Badge>
                          {wish.source === "STATEMENT" && (
                            <Badge variant="secondary" className="text-xs">From Statement</Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {wish.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isMyWish ? "Your wish" : `From ${wish.author.name || wish.author.email}`} &middot; {formatDate(wish.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isMyWish && !myResponse && !isResponding && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRespondingTo(wish.id);
                              setSliderValue(5);
                              setComment("");
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Respond
                          </Button>
                        )}
                        {myResponse && !isResponding && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRespondingTo(wish.id);
                              setSliderValue(myResponse.agreement);
                              setComment(myResponse.comment || "");
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            <span className={getAgreementColor(myResponse.agreement)}>
                              {myResponse.agreement}/10
                            </span>
                          </Button>
                        )}
                        {(isAdmin || isMyWish) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteWish(wish.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Other parent's response */}
                    {otherResponse && (
                      <div className={cn("mt-3 p-3 rounded-lg flex items-start gap-2", getAgreementBg(otherResponse.agreement))}>
                        <User className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {otherResponse.user.name || otherResponse.user.email}
                            </span>
                            <Badge variant="secondary" className={cn("text-xs", getAgreementColor(otherResponse.agreement))}>
                              {otherResponse.agreement}/10
                            </Badge>
                          </div>
                          {otherResponse.comment && (
                            <p className="text-sm text-gray-600 mt-0.5">{otherResponse.comment}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Response form */}
                    {isResponding && (
                      <div className="mt-3 space-y-3">
                        <Separator />
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              Your agreement: {sliderValue}/10
                            </label>
                            <span className={cn("text-sm font-semibold", getAgreementColor(sliderValue))}>
                              {sliderValue <= 3 ? "Disagree" : sliderValue <= 5 ? "Neutral" : sliderValue <= 7 ? "Agree" : "Strongly Agree"}
                            </span>
                          </div>
                          <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[sliderValue]}
                            onValueChange={([v]) => setSliderValue(v)}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0 - Disagree</span>
                            <span>10 - Fully Agree</span>
                          </div>
                        </div>
                        <Textarea
                          placeholder="Add a comment (optional)..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSubmitResponse(wish.id)} disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                            Submit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
