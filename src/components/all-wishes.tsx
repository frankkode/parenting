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
  Heart, Loader2, User, Send, CheckCircle2, MessageSquare,
  Trash2, ExternalLink,
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

interface Props {
  currentUserId: string;
  isAdmin: boolean;
}

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

  return (
    <div className="space-y-6">
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
