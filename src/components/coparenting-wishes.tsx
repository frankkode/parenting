"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Heart, Loader2, User, Send, Trash2, CheckCircle2,
  AlertCircle, ThumbsUp, Plus, X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  responses: WishResponse[];
}

interface Props {
  caseId: string;
  currentUserId: string;
  isAdmin: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living Situation",
  WORK_SITUATION: "Work Situation",
  CHILDCARE_CAPACITY: "Childcare Capacity",
  FINANCIAL_CAPACITY: "Financial Capacity",
  EMOTIONAL_READINESS: "Emotional Readiness",
  CHILD_WELLBEING: "Child Wellbeing",
};

export default function CoparentingWishes({ caseId, currentUserId, isAdmin }: Props) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newWishContent, setNewWishContent] = useState("");
  const [newWishCategory, setNewWishCategory] = useState("CHILDCARE_CAPACITY");
  const [creatingWish, setCreatingWish] = useState(false);

  const CATEGORIES = [
    { value: "CHILDCARE_CAPACITY", label: "Childcare" },
    { value: "FINANCIAL_CAPACITY", label: "Financial" },
    { value: "EMOTIONAL_READINESS", label: "Emotional" },
    { value: "CHILD_WELLBEING", label: "Wellbeing" },
    { value: "LIVING_SITUATION", label: "Living" },
    { value: "WORK_SITUATION", label: "Work" },
  ];

  const handleCreateWish = async () => {
    if (!newWishContent.trim()) {
      toast.error("Please enter wish content");
      return;
    }
    setCreatingWish(true);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          content: newWishContent.trim(),
          category: newWishCategory,
          source: "MANUAL",
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("Wish created");
      setShowCreate(false);
      setNewWishContent("");
      fetchWishes();
    } catch {
      toast.error("Failed to create wish");
    } finally {
      setCreatingWish(false);
    }
  };

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wishes?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWishes(data);
    } catch {
      toast.error("Failed to load wishes");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

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
      toast.success("Your response has been saved");
      setRespondingTo(null);
      setComment("");
      fetchWishes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    setDeletingId(wishId);
    try {
      const res = await fetch(`/api/wishes?id=${wishId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Wish removed");
      fetchWishes();
    } catch {
      toast.error("Failed to delete wish");
    } finally {
      setDeletingId(null);
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Co-Parenting Wishes
          </h2>
          <p className="text-sm text-gray-500">
            Each parent's wishes extracted from their statements. Rate your agreement and leave a comment.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Wish
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Add a Wish</span>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium">Wish Content</Label>
                <Textarea
                  placeholder="Enter wish..."
                  value={newWishContent}
                  onChange={(e) => setNewWishContent(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select value={newWishCategory} onValueChange={setNewWishCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateWish} disabled={creatingWish}>
                {creatingWish ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wishes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Heart className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Wishes Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              When parents submit their statements, their key points will appear here for the other parent to review and respond to.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {wishes.map((wish) => {
            const myResponse = wish.responses.find((r) => r.user.id === currentUserId);
            const otherResponse = wish.responses.find((r) => r.user.id !== currentUserId);
            const isMyWish = wish.authorId === currentUserId;
            const isResponding = respondingTo === wish.id;

            return (
              <Card key={wish.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {CATEGORY_LABELS[wish.category] || wish.category}
                        </Badge>
                        {wish.source === "STATEMENT" && (
                          <Badge variant="secondary" className="text-xs">
                            From Statement
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">
                        {wish.content}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Proposed by {wish.author.name || wish.author.email} &middot;{" "}
                        {formatDate(wish.createdAt)}
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteWish(wish.id)}
                        disabled={deletingId === wish.id}
                      >
                        {deletingId === wish.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Show existing responses */}
                  {wish.responses.length > 0 && (
                    <div className="space-y-2">
                      {wish.responses.map((resp) => (
                        <div
                          key={resp.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            getAgreementBg(resp.agreement)
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm font-medium">
                                {resp.user.name || resp.user.email}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn("text-xs", getAgreementColor(resp.agreement))}
                              >
                                {resp.agreement}/10
                              </Badge>
                            </div>
                            {resp.comment && (
                              <p className="text-sm text-gray-600 mt-1">{resp.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show agreement score if both responded */}
                  {wish.responses.length >= 2 && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <ThumbsUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-700">
                        Average agreement:{" "}
                        {Math.round(
                          wish.responses.reduce((s, r) => s + r.agreement, 0) /
                            wish.responses.length
                        )}
                        /10
                      </span>
                    </div>
                  )}

                  {/* Divider before response form */}
                  {isResponding && <Separator />}

                  {/* Response form */}
                  {isResponding ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Your agreement: {sliderValue}/10
                          </label>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              getAgreementColor(sliderValue)
                            )}
                          >
                            {sliderValue <= 3
                              ? "Strongly Disagree"
                              : sliderValue <= 5
                              ? "Neutral"
                              : sliderValue <= 7
                              ? "Agree"
                              : "Strongly Agree"}
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
                          <span>5 - Neutral</span>
                          <span>10 - Fully Agree</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Comment <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <Textarea
                          placeholder="Add a comment about why you agree or disagree..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRespondingTo(null);
                            setComment("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitResponse(wish.id)}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Submit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isMyWish && !myResponse && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRespondingTo(wish.id);
                            setSliderValue(5);
                            setComment("");
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      )}
                      {myResponse && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRespondingTo(wish.id);
                            setSliderValue(myResponse.agreement);
                            setComment(myResponse.comment || "");
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" />
                          Edit your response ({myResponse.agreement}/10)
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
