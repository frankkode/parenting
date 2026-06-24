"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Target,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";

interface ResponsibilityItem {
  id: string;
  title: string;
  category: string;
  parentAScore: number;
  parentBScore: number;
  recommended: string;
  status: string;
  createdAt: string;
}

interface CategorySummary {
  total: number;
  pending: number;
  completed: number;
}

export default function ResponsibilitiesPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [items, setItems] = useState<ResponsibilityItem[]>([]);
  const [summary, setSummary] = useState<Record<string, CategorySummary>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "other",
    parentAScore: 50,
    parentBScore: 50,
    recommended: "shared",
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/responsibilities?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch responsibilities");
      const data = await res.json();
      setItems(data.items || []);
      setSummary(data.summary || {});
    } catch (error) {
      console.error("[FETCH_RESPONSIBILITIES]", error);
      toast.error("Failed to load responsibilities");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/responsibilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          ...formData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create item");
      }

      toast.success("Responsibility item created");
      setShowCreateDialog(false);
      setFormData({
        title: "",
        category: "other",
        parentAScore: 50,
        parentBScore: 50,
        recommended: "shared",
      });
      fetchItems();
    } catch (error: any) {
      console.error("[CREATE_RESPONSIBILITY]", error);
      toast.error(error.message || "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: ResponsibilityItem) => {
    try {
      const newStatus = item.status === "completed" ? "pending" : "completed";
      const res = await fetch("/api/responsibilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update item");

      toast.success(
        newStatus === "completed"
          ? "Marked as completed"
          : "Reopened"
      );
      fetchItems();
    } catch (error) {
      console.error("[TOGGLE_STATUS]", error);
      toast.error("Failed to update item");
    }
  };

  const getRecommendedBadge = (recommended: string) => {
    switch (recommended) {
      case "parent_a":
        return (
          <Badge variant="info">Parent A</Badge>
        );
      case "parent_b":
        return <Badge variant="warning">Parent B</Badge>;
      case "shared":
        return <Badge variant="secondary">Shared</Badge>;
      default:
        return <Badge variant="outline">{recommended}</Badge>;
    }
  };

  const getTotalScore = (a: number, b: number) => {
    return Math.round(((a + b) / 200) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completedItems = items.filter((i) => i.status === "completed");
  const pendingItems = items.filter((i) => i.status !== "completed");
  const completionRate = items.length > 0
    ? Math.round((completedItems.length / items.length) * 100)
    : 0;

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Responsibilities</h1>
          <p className="text-muted-foreground">
            Track and manage parenting responsibilities and task distribution
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Responsibility</DialogTitle>
              <DialogDescription>
                Define a new responsibility or task for the parenting plan
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., School drop-off, Doctor appointments"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="extracurricular">Extracurricular</SelectItem>
                    <SelectItem value="daily_care">Daily Care</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent A Responsibility %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.parentAScore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentAScore: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent B Responsibility %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.parentBScore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentBScore: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Recommended Assignment</Label>
                <Select
                  value={formData.recommended}
                  onValueChange={(value) =>
                    setFormData({ ...formData, recommended: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="parent_a">Parent A</SelectItem>
                    <SelectItem value="parent_b">Parent B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateItem} disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {completedItems.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pendingItems.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Progress value={completionRate} className="h-2" />

      {/* Balance Score Visualization */}
      {items.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Responsibility Balance
                </CardTitle>
                <CardDescription>
                  Parent A vs Parent B responsibility distribution across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={categories.map((cat) => {
                      const catItems = items.filter((i) => i.category === cat);
                      const aAvg = catItems.length > 0
                        ? Math.round(catItems.reduce((s, i) => s + i.parentAScore, 0) / catItems.length)
                        : 0;
                      const bAvg = catItems.length > 0
                        ? Math.round(catItems.reduce((s, i) => s + i.parentBScore, 0) / catItems.length)
                        : 0;
                      return {
                        category: cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                        "Parent A": aAvg,
                        "Parent B": bAvg,
                        count: catItems.length,
                      };
                    })}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="category" width={80} className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Parent A" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Parent B" fill="#EC4899" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Overall Balance Score
                </CardTitle>
                <CardDescription>
                  How evenly responsibilities are distributed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalA = items.reduce((s, i) => s + i.parentAScore, 0);
                  const totalB = items.reduce((s, i) => s + i.parentBScore, 0);
                  const total = totalA + totalB;
                  const aPct = total > 0 ? Math.round((totalA / total) * 100) : 50;
                  const bPct = 100 - aPct;
                  const gap = Math.abs(aPct - bPct);
                  const balanceScore = 100 - gap;
                  const isBalanced = gap <= 15;

                  return (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${isBalanced ? "text-emerald-600" : gap <= 30 ? "text-amber-600" : "text-red-600"}`}>
                          {balanceScore}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isBalanced ? "Well Balanced" : gap <= 30 ? "Moderately Balanced" : "Imbalanced"}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            Parent A
                          </span>
                          <span className="font-bold">{aPct}%</span>
                        </div>
                        <Progress value={aPct} className="h-2 bg-pink-100 [&>div]:bg-blue-500" />
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-pink-500" />
                            Parent B
                          </span>
                          <span className="font-bold">{bPct}%</span>
                        </div>
                        <Progress value={bPct} className="h-2 bg-blue-100 [&>div]:bg-pink-500" />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold">{items.length}</div>
                          <div className="text-xs text-muted-foreground">Total Tasks</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">
                            {items.filter((i) => i.recommended === "shared").length}
                          </div>
                          <div className="text-xs text-muted-foreground">Shared</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{gap}%</div>
                          <div className="text-xs text-muted-foreground">Gap</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Per-item balance bars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Balance Details</CardTitle>
              <CardDescription>
                Per-task responsibility split between parents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => {
                  const aPct = item.parentAScore + item.parentBScore > 0
                    ? Math.round((item.parentAScore / (item.parentAScore + item.parentBScore)) * 100)
                    : 50;
                  const bPct = 100 - aPct;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate max-w-[60%]">{item.title}</span>
                        <span className="text-xs text-muted-foreground capitalize">{item.category.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex h-5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 flex items-center justify-center text-[10px] text-white font-medium transition-all"
                          style={{ width: `${aPct}%`, minWidth: aPct > 15 ? "auto" : "0" }}
                        >
                          {aPct > 15 ? `${aPct}%` : ""}
                        </div>
                        <div
                          className="bg-pink-500 flex items-center justify-center text-[10px] text-white font-medium transition-all"
                          style={{ width: `${bPct}%`, minWidth: bPct > 15 ? "auto" : "0" }}
                        >
                          {bPct > 15 ? `${bPct}%` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedItems.length})
          </TabsTrigger>
        </TabsList>

        {["all", "pending", "completed"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
            {tab === "all" && items.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Responsibilities Defined
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                    Add parenting responsibilities to track distribution
                    and completion progress.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </CardContent>
              </Card>
            )}

            {tab === "all" &&
              categories.map((category) => {
                const categoryItems = items.filter(
                  (i) => i.category === category
                );
                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="capitalize flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {category.replace("_", " ")}
                      </CardTitle>
                      <CardDescription>
                        {categoryItems.length} item(s)
                        {summary[category] && (
                          <span>
                            {" "}
                            &middot; {summary[category].completed} completed
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoryItems.map((item) => (
                        <ResponsibilityItemCard
                          key={item.id}
                          item={item}
                          onToggle={handleToggleStatus}
                          getRecommendedBadge={getRecommendedBadge}
                          getTotalScore={getTotalScore}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

            {(tab === "pending" || tab === "completed") && (
              <div className="space-y-3">
                {(tab === "pending" ? pendingItems : completedItems).length ===
                0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {tab === "pending"
                      ? "No pending items."
                      : "No completed items yet."}
                  </p>
                ) : (
                  (tab === "pending" ? pendingItems : completedItems).map(
                    (item) => (
                      <ResponsibilityItemCard
                        key={item.id}
                        item={item}
                        onToggle={handleToggleStatus}
                        getRecommendedBadge={getRecommendedBadge}
                        getTotalScore={getTotalScore}
                      />
                    )
                  )
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResponsibilityItemCard({
  item,
  onToggle,
  getRecommendedBadge,
  getTotalScore,
}: {
  item: ResponsibilityItem;
  onToggle: (item: ResponsibilityItem) => void;
  getRecommendedBadge: (recommended: string) => React.ReactNode;
  getTotalScore: (a: number, b: number) => number;
}) {
  const isCompleted = item.status === "completed";
  const totalScore = getTotalScore(item.parentAScore, item.parentBScore);

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
        isCompleted ? "bg-muted/30 opacity-75" : "hover:bg-muted/50"
      }`}
    >
      <button
        onClick={() => onToggle(item)}
        className="flex-shrink-0"
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium text-sm ${
              isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.title}
          </span>
          {getRecommendedBadge(item.recommended)}
        </div>

        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Parent A: {item.parentAScore}%</span>
            <span>Parent B: {item.parentBScore}%</span>
          </div>
          <Badge variant="outline" className="text-[10px] capitalize">
            {item.category.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <div className="text-sm font-bold">{totalScore}%</div>
          <div className="text-[10px] text-muted-foreground">balance</div>
        </div>
        <div className="w-16">
          <Progress value={totalScore} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}
