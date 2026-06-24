"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, Loader2, Plus, BarChart3, ArrowUpRight, ArrowDownRight,
  Minus, Calendar, User,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface GrowthRecord {
  id: string;
  category: string;
  metric: string;
  score: number;
  notes: string | null;
  recordedAt: string;
  user: { id: string; name: string } | null;
}

const GROWTH_CATEGORIES = [
  { value: "communication", label: "Communication", color: "#3B82F6" },
  { value: "flexibility", label: "Flexibility", color: "#8B5CF6" },
  { value: "emotional_readiness", label: "Emotional Readiness", color: "#EC4899" },
  { value: "childcare", label: "Childcare", color: "#10B981" },
  { value: "financial", label: "Financial", color: "#F59E0B" },
];

const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  GROWTH_CATEGORIES.map((c) => [c.value, c.color])
);

export default function GrowthTrackingPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [grouped, setGrouped] = useState<Record<string, { name: string; data: { date: string; score: number }[] }[]>>({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "communication",
    metric: "communication_score",
    score: 5,
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/growth?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRecords(data.records || []);
      setGrouped(data.grouped || {});
    } catch {
      toast.error("Failed to load growth data");
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
      const res = await fetch("/api/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          category: formData.category,
          metric: formData.metric,
          score: formData.score,
          notes: formData.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Growth record added");
      setShowDialog(false);
      setFormData({ category: "communication", metric: "communication_score", score: 5, notes: "" });
      fetchData();
    } catch {
      toast.error("Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const getTrend = (category: string) => {
    const catRecords = records
      .filter((r) => r.category === category)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    if (catRecords.length < 2) return { icon: Minus, label: "Stable", color: "text-gray-500" };
    const first = catRecords[0].score;
    const last = catRecords[catRecords.length - 1].score;
    const diff = last - first;
    if (diff > 0.5) return { icon: TrendingUp, label: `+${diff.toFixed(1)}`, color: "text-emerald-600" };
    if (diff < -0.5) return { icon: ArrowDownRight, label: diff.toFixed(1), color: "text-red-600" };
    return { icon: Minus, label: "Stable", color: "text-gray-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Prepare chart data for each category
  const chartDataByCategory: Record<string, { date: string; [key: string]: number | string }[]> = {};
  for (const category of GROWTH_CATEGORIES) {
    const catGrouped = grouped[category.value];
    if (!catGrouped) continue;
    const allDates = new Set<string>();
    for (const user of catGrouped) {
      for (const d of user.data) allDates.add(d.date);
    }
    const sortedDates = [...allDates].sort();
    chartDataByCategory[category.value] = sortedDates.map((date) => {
      const point: Record<string, number | string> = { date };
      for (const user of catGrouped) {
        const match = user.data.find((d) => d.date === date);
        point[user.name] = match?.score ?? null as any;
      }
      return point as any;
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Growth Tracking</h1>
          <p className="text-muted-foreground">
            Track co-parenting skill development and progress over time
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Progress
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Growth Progress</DialogTitle>
              <DialogDescription>
                Rate current progress on a scale of 0-10
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v, metric: `${v}_score` })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROWTH_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Score</Label>
                  <span className="text-sm font-bold">{formData.score}/10</span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={0.5}
                  value={[formData.score]}
                  onValueChange={([val]) => setFormData({ ...formData, score: val })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {GROWTH_CATEGORIES.map((cat) => {
          const trend = getTrend(cat.value);
          const TrendIcon = trend.icon;
          const catRecords = records.filter((r) => r.category === cat.value);
          const avgScore =
            catRecords.length > 0
              ? Math.round((catRecords.reduce((s, r) => s + r.score, 0) / catRecords.length) * 10) / 10
              : 0;
          const latestRecord = catRecords.sort(
            (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
          )[0];

          return (
            <Card key={cat.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latestRecord?.score?.toFixed(1) || "--"}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon className={`h-4 w-4 ${trend.color}`} />
                  <span className={`text-xs ${trend.color}`}>{trend.label}</span>
                </div>
                <Progress value={avgScore * 10} className="mt-2 h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {catRecords.length} records
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Growth Charts */}
      <Tabs defaultValue={GROWTH_CATEGORIES[0].value}>
        <TabsList>
          {GROWTH_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {GROWTH_CATEGORIES.map((cat) => {
          const chartData = chartDataByCategory[cat.value];
          const hasData = chartData && chartData.length > 0;
          return (
            <TabsContent key={cat.value} value={cat.value} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{cat.label} Progress</CardTitle>
                  <CardDescription>Score trends over time for each parent</CardDescription>
                </CardHeader>
                <CardContent>
                  {hasData ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 10]} className="text-xs" />
                        <Tooltip />
                        <Legend />
                        {(grouped[cat.value] || []).map((user, i) => (
                          <Line
                            key={user.name}
                            type="monotone"
                            dataKey={user.name}
                            stroke={[cat.color, "#F59E0B", "#EC4899"][i % 3]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No data yet for this category</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Recent Records */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {records.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[record.category] || "#6B7280" }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{record.category.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="text-xs">{record.score}/10</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      {record.user?.name || "Unknown"}
                      <Calendar className="h-3 w-3 ml-2" />
                      {new Date(record.recordedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
