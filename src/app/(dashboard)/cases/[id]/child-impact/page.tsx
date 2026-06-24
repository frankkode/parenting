"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Heart, Plus, Loader2, AlertTriangle, ShieldCheck, GraduationCap,
  Users, Car, Activity,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Child {
  id: string;
  name: string;
  age: number;
  school: string | null;
  grade: string | null;
}

interface ChildImpactData {
  id: string;
  childId: string | null;
  category: string;
  score: number;
  notes: string | null;
  assessedAt: string;
  child: { id: string; name: string; age: number } | null;
}

interface ImpactSummary {
  avgScore: number;
  count: number;
  risk: string;
}

const IMPACT_CATEGORIES = [
  { value: "school_stability", label: "School Stability", icon: GraduationCap, description: "Impact on education continuity" },
  { value: "social_life", label: "Social Life", icon: Users, description: "Impact on friendships and social development" },
  { value: "travel_burden", label: "Travel Burden", icon: Car, description: "Travel time between households" },
  { value: "stress_level", label: "Stress Level", icon: Activity, description: "Emotional stress indicators" },
  { value: "routine_stability", label: "Routine Stability", icon: ShieldCheck, description: "Daily routine consistency" },
];

const RISK_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ChildImpactPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [impacts, setImpacts] = useState<ChildImpactData[]>([]);
  const [summary, setSummary] = useState<Record<string, ImpactSummary>>({});
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    childId: "",
    category: "school_stability",
    score: 5,
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [impactRes, childRes] = await Promise.all([
        fetch(`/api/child-impact?caseId=${caseId}`),
        fetch(`/api/cases/${caseId}`),
      ]);
      if (impactRes.ok) {
        const data = await impactRes.json();
        setImpacts(data.impacts || []);
        setSummary(data.summary || {});
      }
      if (childRes.ok) {
        const caseData = await childRes.json();
        setChildren(caseData.children || []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/child-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          childId: formData.childId || null,
          category: formData.category,
          score: formData.score,
          notes: formData.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Impact assessment added");
      setShowDialog(false);
      setFormData({ childId: "", category: "school_stability", score: 5, notes: "" });
      fetchData();
    } catch {
      toast.error("Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high": return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> High Risk</Badge>;
      case "medium": return <Badge variant="secondary"><Activity className="h-3 w-3 mr-1" /> Medium</Badge>;
      case "low": return <Badge variant="default"><ShieldCheck className="h-3 w-3 mr-1" /> Low Risk</Badge>;
      default: return null;
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Child Impact Assessment</h1>
          <p className="text-muted-foreground">
            Evaluate how the co-parenting arrangement affects each child across key dimensions
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Impact Assessment</DialogTitle>
              <DialogDescription>
                Rate the impact on a scale of 0-10 (0 = severe negative impact, 10 = excellent conditions)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Child</Label>
                <Select value={formData.childId} onValueChange={(v) => setFormData({ ...formData, childId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select child (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Children</SelectItem>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>{child.name} (age {child.age})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPACT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Impact Score</Label>
                  <span className="text-sm font-bold">{formData.score}/10</span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[formData.score]}
                  onValueChange={([val]) => setFormData({ ...formData, score: val })}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 - Severe</span>
                  <span>5 - Neutral</span>
                  <span>10 - Excellent</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {IMPACT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const s = summary[cat.value];
          return (
            <Card key={cat.value} className={s ? RISK_COLORS[s.risk] || "" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {s ? (
                  <>
                    <div className="text-2xl font-bold">{s.avgScore}<span className="text-sm font-normal">/10</span></div>
                    <div className="mt-1">{getRiskBadge(s.risk)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{s.count} assessments</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Impact List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Assessment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {impacts.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Impact Assessments Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start assessing how the arrangement affects the children
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add First Assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {IMPACT_CATEGORIES.map((cat) => {
                const catImpacts = impacts.filter((i) => i.category === cat.value);
                if (catImpacts.length === 0) return null;
                const Icon = cat.icon;
                return (
                  <div key={cat.value}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{cat.label}</span>
                    </div>
                    {catImpacts.map((impact) => (
                      <div key={impact.id} className="flex items-center gap-4 p-3 rounded-lg border mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {impact.child?.name || "All Children"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Score: {impact.score}/10
                            </Badge>
                          </div>
                          {impact.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{impact.notes}</p>
                          )}
                        </div>
                        <Progress value={impact.score * 10} className="w-24" />
                      </div>
                    ))}
                    <Separator className="my-3" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
