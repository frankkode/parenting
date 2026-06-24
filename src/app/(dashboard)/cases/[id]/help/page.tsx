"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LifeBuoy,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  MessageSquare,
  XCircle,
  ThumbsDown,
  ThumbsUp,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface HelpRequest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  urgency: string;
  responseNote: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  requester: { id: string; name: string; email: string; image?: string } | null;
  responder: { id: string; name: string; email: string; image?: string } | null;
}

export default function HelpPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [responseNote, setResponseNote] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "other",
    urgency: "medium",
  });

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/help-requests?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch help requests");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error("[FETCH_HELP_REQUESTS]", error);
      toast.error("Failed to load help requests");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCreateRequest = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          ...formData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create help request");
      }

      toast.success("Help request created");
      setShowCreateDialog(false);
      setFormData({ title: "", description: "", type: "other", urgency: "medium" });
      fetchRequests();
    } catch (error: any) {
      console.error("[CREATE_HELP_REQUEST]", error);
      toast.error(error.message || "Failed to create help request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (requestId: string, action: "accept" | "decline" | "complete") => {
    try {
      const statusMap = {
        accept: "accepted",
        decline: "declined",
        complete: "completed",
      };

      const res = await fetch(`/api/help-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusMap[action],
          responseNote: responseNote || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update request");

      const messages = {
        accept: "Request accepted — you're now assigned",
        decline: "Request declined with note",
        complete: "Request marked as completed",
      };
      toast.success(messages[action]);
      setSelectedRequest(null);
      setResponseNote("");
      fetchRequests();
    } catch (error) {
      console.error("[RESPOND_HELP_REQUEST]", error);
      toast.error("Failed to update help request");
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="warning">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Open</Badge>;
      case "accepted":
        return <Badge variant="info"><ArrowUpRight className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case "completed":
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "declined":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openRequests = requests.filter((r) => r.status === "open");
  const activeRequests = requests.filter((r) => r.status === "accepted");
  const completedRequests = requests.filter((r) => r.status === "completed");
  const declinedRequests = requests.filter((r) => r.status === "declined");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Request assistance from mediators or support team
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Help Request</DialogTitle>
              <DialogDescription>
                Describe what kind of support you need
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
                  placeholder="Brief title for your request"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe your situation in detail..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mediation">Mediation</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="scheduling">Scheduling</SelectItem>
                      <SelectItem value="emotional">Emotional Support</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, urgency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Urgency overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 text-sm">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {openRequests.length}
            </div>
            <p className="text-xs text-amber-600">Awaiting response</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700 text-sm">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {activeRequests.length}
            </div>
            <p className="text-xs text-blue-600">Being handled</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 text-sm">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {declinedRequests.length}
            </div>
            <p className="text-xs text-red-600">Not accepted</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-700 text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {completedRequests.length}
            </div>
            <p className="text-xs text-emerald-600">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Open ({openRequests.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            In Progress ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({declinedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4 mt-4">
          {openRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up</h3>
                <p className="text-sm text-muted-foreground">
                  No open help requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            openRequests.map((request) => (
              <HelpRequestCard
                key={request.id}
                request={request}
                getUrgencyBadge={getUrgencyBadge}
                getStatusBadge={getStatusBadge}
                onSelect={setSelectedRequest}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active requests.
            </p>
          ) : (
            activeRequests.map((request) => (
              <HelpRequestCard
                key={request.id}
                request={request}
                getUrgencyBadge={getUrgencyBadge}
                getStatusBadge={getStatusBadge}
                onSelect={setSelectedRequest}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="declined" className="space-y-4 mt-4">
          {declinedRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No declined requests.
            </p>
          ) : (
            declinedRequests.map((request) => (
              <HelpRequestCard
                key={request.id}
                request={request}
                getUrgencyBadge={getUrgencyBadge}
                getStatusBadge={getStatusBadge}
                onSelect={setSelectedRequest}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No completed requests.
            </p>
          ) : (
            completedRequests.map((request) => (
              <HelpRequestCard
                key={request.id}
                request={request}
                getUrgencyBadge={getUrgencyBadge}
                getStatusBadge={getStatusBadge}
                onSelect={setSelectedRequest}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => {
          if (!open) { setSelectedRequest(null); setResponseNote(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === "open"
                ? "Respond to Help Request"
                : selectedRequest?.status === "accepted"
                ? "Complete Help Request"
                : "Help Request Details"}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2 mb-4 pt-2">
                <p className="font-medium text-foreground">{selectedRequest?.title}</p>
                {selectedRequest?.description && (
                  <p className="text-sm text-muted-foreground">{selectedRequest?.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Type: {selectedRequest?.type?.replace(/_/g, " ")}</span>
                  <span>|</span>
                  <span>Urgency: {selectedRequest?.urgency}</span>
                  {selectedRequest?.requester?.name && (
                    <>
                      <span>|</span>
                      <span>From: {selectedRequest.requester.name}</span>
                    </>
                  )}
                </div>
                {selectedRequest?.responseNote && (
                  <div className="mt-2 p-3 rounded-lg bg-muted text-sm">
                    <span className="font-medium">Note: </span>
                    {selectedRequest.responseNote}
                  </div>
                )}
              </div>
              {(selectedRequest?.status === "open" || selectedRequest?.status === "accepted") && (
                <div className="space-y-2">
                  <Label htmlFor="responseNote">
                    {selectedRequest?.status === "open" ? "Response Note (optional)" : "Completion Note"}
                  </Label>
                  <Textarea
                    id="responseNote"
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder={
                      selectedRequest?.status === "open"
                        ? "Add any notes, conditions, or counter-proposal..."
                        : "Describe how this was resolved..."
                    }
                    rows={3}
                  />
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setResponseNote(""); }}>
              Close
            </Button>
            {selectedRequest?.status === "open" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedRequest && handleRespond(selectedRequest.id, "decline")}
                  className="gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Decline
                </Button>
                <Button
                  onClick={() => selectedRequest && handleRespond(selectedRequest.id, "accept")}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Accept Request
                </Button>
              </>
            )}
            {selectedRequest?.status === "accepted" && (
              <Button
                onClick={() => selectedRequest && handleRespond(selectedRequest.id, "complete")}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HelpRequestCard({
  request,
  getUrgencyBadge,
  getStatusBadge,
  onSelect,
}: {
  request: HelpRequest;
  getUrgencyBadge: (urgency: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  onSelect: (request: HelpRequest) => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect(request)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{request.title}</CardTitle>
            <CardDescription>
              {request.requester?.name && (
                <span>By {request.requester.name} &middot; </span>
              )}
              {formatRelativeTime(request.createdAt)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getUrgencyBadge(request.urgency)}
            {getStatusBadge(request.status)}
          </div>
        </div>
      </CardHeader>
      {request.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
