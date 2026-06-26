"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Heart, Loader2, User, Send, CheckCircle2, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
}

const CATEGORY_LABELS: Record<string, string> = {
  LIVING_SITUATION: "Living",
  WORK_SITUATION: "Work",
  CHILDCARE_CAPACITY: "Childcare",
  FINANCIAL_CAPACITY: "Financial",
  EMOTIONAL_READINESS: "Emotional",
  CHILD_WELLBEING: "Wellbeing",
};

export default function DashboardWishes({ currentUserId }: Props) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wishes?userId=${currentUserId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWishes(data);
    } catch {
      // Silently fail for dashboard
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

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
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Co-Parenting Wishes
          </h2>
        </div>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // Don't show the section at all if there are no wishes
  if (wishes.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          Co-Parenting Wishes
        </h2>
        <Badge variant="secondary" className="text-xs">
          {wishes.length} {wishes.length === 1 ? "wish" : "wishes"}
        </Badge>
      </div>

      <div className="divide-y divide-gray-100">
        {wishes.map((wish) => {
          const myResponse = wish.responses.find((r) => r.user.id === currentUserId);
          const otherResponse = wish.responses.find((r) => r.user.id !== currentUserId);
          const isMyWish = wish.authorId === currentUserId;
          const isResponding = respondingTo === wish.id;

          return (
            <div key={wish.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[wish.category] || wish.category}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {wish.familyCase?.title}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {wish.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isMyWish ? "Your wish" : `From ${wish.author.name || wish.author.email}`}
                  </p>
                </div>

                {!isMyWish && !myResponse && !isResponding && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
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
                    className="flex-shrink-0"
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
              </div>

              {/* Show other parent's response */}
              {otherResponse && (
                <div className={cn("mt-3 p-3 rounded-lg flex items-start gap-2", getAgreementBg(otherResponse.agreement))}>
                  <User className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
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

                  <div>
                    <Textarea
                      placeholder="Add a comment (optional)..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

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
      </div>
    </div>
  );
}
