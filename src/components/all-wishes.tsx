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
  Trash2, ExternalLink, Plus, X, RotateCcw, AlertCircle, ArrowRight,
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
  familyCase: { id: string; title: string; parentAId: string; parentBId: string };
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

  // Reset wishes state
  const [resettingCaseId, setResettingCaseId] = useState<string | null>(null);

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

  const handleResetWishes = async (caseId: string) => {
    if (!confirm("Are you sure? This will delete ALL wishes and responses for this case. This cannot be undone.")) return;
    setResettingCaseId(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}/reset-wishes`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset");
      const data = await res.json();
      toast.success(`${data.deletedCount} wishes deleted`);
      fetchWishes();
    } catch {
      toast.error("Failed to reset wishes");
    } finally {
      setResettingCaseId(null);
    }
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
        <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Wish
        </Button>
      </div>

      {/* Create Wish Form */}
      {showCreateForm && (
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
        Object.entries(wishesByCase).map(([caseId, group]) => {
          // Split wishes: mine vs theirs (counter-wishes I need to respond to)
          const myWishes = group.wishes.filter((w) => w.authorId === currentUserId);
          const counterWishes = group.wishes.filter((w) => w.authorId !== currentUserId);
          // Admin sees all together
          const showSplit = !isAdmin;

          return (
            <Card key={caseId} className="overflow-hidden">
              <CardHeader className="pb-3 bg-gray-50/50 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {group.caseTitle}
                    </CardTitle>
                    <CardDescription>
                      {group.wishes.length} {group.wishes.length === 1 ? "wish" : "wishes"} — {myWishes.length} yours, {counterWishes.length} to review
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:border-red-200"
                        onClick={() => handleResetWishes(caseId)}
                        disabled={resettingCaseId === caseId}
                      >
                        {resettingCaseId === caseId ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        )}
                        Reset All
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/cases/${caseId}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Case
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {showSplit ? (
                  /* Two-column layout for parents: My Wishes | Needs My Response */
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    {/* Left: My Wishes */}
                    <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-blue-900">Your Wishes</h3>
                          <p className="text-xs text-blue-600/70">Shared with co-parent</p>
                        </div>
                        <Badge variant="secondary" className="ml-auto text-xs">{myWishes.length}</Badge>
                      </div>
                      {myWishes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-blue-100 rounded-xl bg-white/60">
                          <Heart className="h-8 w-8 text-blue-200 mb-2" />
                          <p className="text-sm text-blue-400 font-medium">No wishes yet</p>
                          <p className="text-xs text-blue-300 mt-0.5">Your wishes appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {myWishes.map((wish) => (
                            <WishCard
                              key={wish.id}
                              wish={wish}
                              currentUserId={currentUserId}
                              isAdmin={isAdmin}
                              isOwn={true}
                              respondingTo={respondingTo}
                              sliderValue={sliderValue}
                              comment={comment}
                              submitting={submitting}
                              onRespond={(id) => { setRespondingTo(id); setSliderValue(5); setComment(""); }}
                              onEditResponse={(r) => { setRespondingTo(r.wishId); setSliderValue(r.agreement); setComment(r.comment || ""); }}
                              onSubmit={handleSubmitResponse}
                              onDelete={handleDeleteWish}
                              onCancelResponse={() => setRespondingTo(null)}
                              onSliderChange={setSliderValue}
                              onCommentChange={setComment}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Needs My Response */}
                    <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-amber-900">Needs Your Response</h3>
                          <p className="text-xs text-amber-600/70">From your co-parent</p>
                        </div>
                        <Badge variant="warning" className="ml-auto text-xs">{counterWishes.length}</Badge>
                      </div>
                      {counterWishes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-amber-100 rounded-xl bg-white/60">
                          <CheckCircle2 className="h-8 w-8 text-amber-200 mb-2" />
                          <p className="text-sm text-amber-400 font-medium">All caught up</p>
                          <p className="text-xs text-amber-300 mt-0.5">No pending wishes to review</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {counterWishes.map((wish) => (
                            <WishCard
                              key={wish.id}
                              wish={wish}
                              currentUserId={currentUserId}
                              isAdmin={isAdmin}
                              isOwn={false}
                              respondingTo={respondingTo}
                              sliderValue={sliderValue}
                              comment={comment}
                              submitting={submitting}
                              onRespond={(id) => { setRespondingTo(id); setSliderValue(5); setComment(""); }}
                              onEditResponse={(r) => { setRespondingTo(r.wishId); setSliderValue(r.agreement); setComment(r.comment || ""); }}
                              onSubmit={handleSubmitResponse}
                              onDelete={handleDeleteWish}
                              onCancelResponse={() => setRespondingTo(null)}
                              onSliderChange={setSliderValue}
                              onCommentChange={setComment}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Admin view: single list */
                  <div className="space-y-3">
                    {group.wishes.map((wish) => {
                      const isMyWish = wish.authorId === currentUserId;
                      return (
                        <WishCard
                          key={wish.id}
                          wish={wish}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                          isOwn={isMyWish}
                          respondingTo={respondingTo}
                          sliderValue={sliderValue}
                          comment={comment}
                          submitting={submitting}
                          onRespond={(id) => { setRespondingTo(id); setSliderValue(5); setComment(""); }}
                          onEditResponse={(r) => { setRespondingTo(r.wishId); setSliderValue(r.agreement); setComment(r.comment || ""); }}
                          onSubmit={handleSubmitResponse}
                          onDelete={handleDeleteWish}
                          onCancelResponse={() => setRespondingTo(null)}
                          onSliderChange={setSliderValue}
                          onCommentChange={setComment}
                        />
                      );
                    })}
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

// Extract wish card as a sub-component
function WishCard({
  wish,
  currentUserId,
  isAdmin,
  isOwn,
  respondingTo,
  sliderValue,
  comment,
  submitting,
  onRespond,
  onEditResponse,
  onSubmit,
  onDelete,
  onCancelResponse,
  onSliderChange,
  onCommentChange,
}: {
  wish: Wish;
  currentUserId: string;
  isAdmin: boolean;
  isOwn: boolean;
  respondingTo: string | null;
  sliderValue: number;
  comment: string;
  submitting: boolean;
  onRespond: (id: string) => void;
  onEditResponse: (r: WishResponse & { wishId: string }) => void;
  onSubmit: (wishId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCancelResponse: () => void;
  onSliderChange: (v: number) => void;
  onCommentChange: (v: string) => void;
}) {
  const myResponse = wish.responses.find((r) => r.user.id === currentUserId);
  const otherResponse = wish.responses.find((r) => r.user.id !== currentUserId);
  const isResponding = respondingTo === wish.id;
  const hasResponded = !!myResponse;

  const getAgreementColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  };

  const getAgreementBg = (score: number) => {
    if (score >= 8) return "bg-emerald-50 border-emerald-200";
    if (score >= 5) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  // Determine which parent: parentA = rose, parentB = indigo, other = neutral
  const isParentA = wish.authorId === wish.familyCase.parentAId;
  const isParentB = wish.authorId === wish.familyCase.parentBId;

  // Card styling — distinct colors per parent
  const cardClass = isOwn
    ? isParentA
      ? "border-rose-100 bg-rose-50/50 hover:border-rose-200"
      : isParentB
      ? "border-indigo-100 bg-indigo-50/50 hover:border-indigo-200"
      : "border-blue-100 bg-blue-50/40 hover:border-blue-200"
    : !hasResponded
    ? isParentA
      ? "border-rose-300 bg-rose-100/60 hover:border-rose-400 ring-2 ring-rose-200/60"
      : isParentB
      ? "border-indigo-300 bg-indigo-100/60 hover:border-indigo-400 ring-2 ring-indigo-200/60"
      : "border-amber-200 bg-amber-50/40 hover:border-amber-300 ring-1 ring-amber-200/50"
    : isParentA
    ? "border-rose-100 bg-rose-50/30 hover:border-rose-200"
    : isParentB
    ? "border-indigo-100 bg-indigo-50/30 hover:border-indigo-200"
    : "border-emerald-100 bg-emerald-50/40 hover:border-emerald-200";

  // Parent label color
  const parentLabelClass = isParentA
    ? "text-rose-700 bg-rose-100"
    : isParentB
    ? "text-indigo-700 bg-indigo-100"
    : "";

  return (
    <div className={cn("border rounded-xl p-4 transition-all", cardClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {!isOwn && !hasResponded && (
              <Badge variant="warning" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                Action needed
              </Badge>
            )}
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
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {isOwn ? "Your wish" : `From ${wish.author.name || wish.author.email}`}
            {parentLabelClass && (
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 border-0", parentLabelClass)}>
                {isParentA ? "Parent A" : isParentB ? "Parent B" : ""}
              </Badge>
            )}
            &middot; {formatDate(wish.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isOwn && !myResponse && !isResponding && (
            <Button
              size="sm"
              onClick={() => onRespond(wish.id)}
              className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Respond
            </Button>
          )}
          {myResponse && !isResponding && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditResponse({ ...myResponse, wishId: wish.id })}
              className="gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className={getAgreementColor(myResponse.agreement)}>
                {myResponse.agreement}/10
              </span>
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-600"
              onClick={() => onDelete(wish.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Other parent's response */}
      {otherResponse && (
        <div className={cn("mt-3 p-3 rounded-lg border flex items-start gap-2", getAgreementBg(otherResponse.agreement))}>
          <User className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
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
              onValueChange={([v]) => onSliderChange(v)}
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
            onChange={(e) => onCommentChange(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancelResponse}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSubmit(wish.id)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep at bottom — constants used by WishCard
const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living",
  WORK_SITUATION: "Work",
  CHILDCARE_CAPACITY: "Childcare",
  FINANCIAL_CAPACITY: "Financial",
  EMOTIONAL_READINESS: "Emotional",
  CHILD_WELLBEING: "Wellbeing",
};
