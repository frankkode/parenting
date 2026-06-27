"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  FileSignature,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  Send,
  RefreshCw,
  Download,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface SignatureData {
  id: string;
  fullName: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface Agreement {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  content: string;
  version: number;
  createdAt: string;
  acceptedAt: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  acceptedById: string | null;
  familyCase?: {
    parentAId: string;
    parentBId: string;
    parentA: { id: string; name: string | null; email: string };
    parentB: { id: string; name: string | null; email: string };
  };
  signatures: SignatureData[];
}

export default function AgreementsPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string; name?: string } | undefined;
  const currentUserId = user?.id || "";
  const isAdmin = user?.role === "ADMIN" || user?.role === "MEDIATOR";

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingAgreement, setViewingAgreement] = useState<Agreement | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Signature state
  const [signFullName, setSignFullName] = useState("");
  const [signing, setSigning] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "custom",
    content: "",
  });

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agreements?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch agreements");
      const data = await res.json();
      setAgreements(data);
    } catch (error) {
      console.error("[FETCH_AGREEMENTS]", error);
      toast.error("Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (currentUserId) fetchAgreements();
  }, [fetchAgreements, currentUserId]);

  const handleCreateAgreement = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          ...formData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agreement");
      }

      toast.success("Agreement created");
      setShowCreateDialog(false);
      setFormData({ title: "", description: "", type: "custom", content: "" });
      fetchAgreements();
    } catch (error: any) {
      console.error("[CREATE_AGREEMENT]", error);
      toast.error(error.message || "Failed to create agreement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgreementAction = async (agreementId: string, action: "accept" | "decline" | "counter") => {
    try {
      setAccepting(true);
      const statusMap = {
        accept: "accepted",
        decline: "declined",
        counter: "counter_proposal",
      };

      const res = await fetch(`/api/agreements/${agreementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusMap[action] }),
      });

      if (!res.ok) throw new Error("Failed to update agreement");

      const messages = {
        accept: "Agreement accepted",
        decline: "Agreement declined",
        counter: "Counter-proposal submitted",
      };
      toast.success(messages[action]);
      fetchAgreements();
      // Refresh the viewing agreement
      const updated = await res.json();
      setViewingAgreement(updated);
    } catch (error) {
      console.error("[AGREEMENT_ACTION]", error);
      toast.error("Failed to update agreement");
    } finally {
      setAccepting(false);
    }
  };

  const handleSign = async (agreementId: string) => {
    if (!signFullName.trim()) {
      toast.error("Please type your full name to sign");
      return;
    }
    try {
      setSigning(true);
      const res = await fetch(`/api/agreements/${agreementId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: signFullName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to sign");
      }

      toast.success("Agreement signed successfully");
      setSignFullName("");
      fetchAgreements();

      // Refresh the viewing agreement with full data
      const detailRes = await fetch(`/api/agreements/${agreementId}`);
      if (detailRes.ok) {
        setViewingAgreement(await detailRes.json());
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign agreement");
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadPdf = (agreementId: string) => {
    const link = document.createElement("a");
    link.href = `/api/agreements/${agreementId}/pdf`;
    link.download = "agreement.pdf";
    link.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case "draft":
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
      case "signed":
        return <Badge variant="success"><FileSignature className="h-3 w-3 mr-1" /> Signed</Badge>;
      case "declined":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Declined</Badge>;
      case "counter_proposal":
        return <Badge variant="info"><RefreshCw className="h-3 w-3 mr-1" /> Counter Proposal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasUserSigned = (agreement: Agreement) => {
    return agreement.signatures?.some((s) => s.user.id === currentUserId);
  };

  const allPartiesHaveSigned = (agreement: Agreement) => {
    const fc = agreement.familyCase;
    if (!fc) return false;
    const parentASigned = agreement.signatures?.some((s) => s.user.id === fc.parentAId);
    const parentBSigned = agreement.signatures?.some((s) => s.user.id === fc.parentBId);
    return parentASigned && parentBSigned;
  };

  const ROLE_LABELS: Record<string, string> = {
    PARENT_A: "Parent A",
    PARENT_B: "Parent B",
    ADMIN: "Administrator",
    MEDIATOR: "Mediator",
    WITNESS: "Witness",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const draftAgreements = agreements.filter((a) => a.status === "draft");
  const acceptedAgreements = agreements.filter(
    (a) => a.status === "accepted" || a.status === "signed"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agreements</h1>
          <p className="text-muted-foreground">
            Create, review, sign, and manage co-parenting agreements
          </p>
        </div>
        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Agreement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Agreement</DialogTitle>
                <DialogDescription>
                  Draft a new agreement for both parents to review and sign
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
                    placeholder="e.g., Holiday Schedule 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of this agreement"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custody">Custody</SelectItem>
                      <SelectItem value="visitation">Visitation</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Agreement Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Write the full agreement text here..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateAgreement} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({agreements.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({draftAgreements.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedAgreements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {agreements.length === 0 ? renderEmptyState() : agreements.map(renderAgreementCard)}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4 mt-4">
          {draftAgreements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No draft agreements.</p>
          ) : (
            draftAgreements.map(renderAgreementCard)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4 mt-4">
          {acceptedAgreements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No accepted agreements yet.</p>
          ) : (
            acceptedAgreements.map(renderAgreementCard)
          )}
        </TabsContent>
      </Tabs>

      {/* View Agreement Dialog */}
      <Dialog
        open={!!viewingAgreement}
        onOpenChange={(open) => {
          if (!open) {
            setViewingAgreement(null);
            setSignFullName("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {viewingAgreement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {viewingAgreement.title}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <Badge variant="outline" className="capitalize">
                      {viewingAgreement.type}
                    </Badge>
                    <Badge variant="outline">Version {viewingAgreement.version}</Badge>
                    {getStatusBadge(viewingAgreement.status)}
                  </div>
                </DialogDescription>
              </DialogHeader>

              {viewingAgreement.description && (
                <p className="text-sm text-muted-foreground">{viewingAgreement.description}</p>
              )}

              <Separator />

              <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
                {viewingAgreement.content}
              </div>

              <Separator />

              {/* Needs Signature Warning */}
              {!isAdmin && !hasUserSigned(viewingAgreement) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <PenLine className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">This agreement needs your signature</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Please scroll down to sign this agreement by typing your full legal name. The agreement is not finalized until both parents have signed.
                    </p>
                  </div>
                </div>
              )}

              {/* Signatures Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileSignature className="h-4 w-4" />
                  Electronic Signatures
                </h4>

                {viewingAgreement.signatures && viewingAgreement.signatures.length > 0 ? (
                  <div className="space-y-2">
                    {viewingAgreement.signatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {sig.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {ROLE_LABELS[sig.role] || sig.role} &middot; {formatDate(sig.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                          {sig.id.slice(0, 8)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No signatures yet.</p>
                )}

                {/* Sign button / form */}
                {!hasUserSigned(viewingAgreement) ? (
                  <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg">
                    <Label className="text-sm font-medium mb-2 block">
                      Type your full name to electronically sign this agreement
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Your full legal name"
                        value={signFullName}
                        onChange={(e) => setSignFullName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleSign(viewingAgreement.id)}
                        disabled={signing || !signFullName.trim()}
                      >
                        {signing ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <PenLine className="h-4 w-4 mr-1" />
                        )}
                        Sign
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      By typing your full name, you are providing your electronic signature and agreeing to the terms of this agreement.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">
                      You have signed this agreement
                    </span>
                  </div>
                )}
              </div>

              {/* Agreement verification / status */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Created by {viewingAgreement.createdBy?.name || "Unknown"}</span>
                  <span>{formatDate(viewingAgreement.createdAt)}</span>
                </div>
                {viewingAgreement.acceptedAt && (
                  <span>Accepted {formatDate(viewingAgreement.acceptedAt)}</span>
                )}
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                {/* PDF download - only when both parents have signed */}
                {allPartiesHaveSigned(viewingAgreement) && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPdf(viewingAgreement.id)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                )}

                {/* Status action buttons */}
                {viewingAgreement.status === "draft" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleAgreementAction(viewingAgreement.id, "decline")}
                      disabled={accepting}
                      className="gap-2"
                    >
                      {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                      Decline
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleAgreementAction(viewingAgreement.id, "counter")}
                      disabled={accepting}
                      className="gap-2"
                    >
                      {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Counter Proposal
                    </Button>
                    <Button
                      onClick={() => handleAgreementAction(viewingAgreement.id, "accept")}
                      disabled={accepting}
                      className="gap-2"
                    >
                      {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                      Accept Agreement
                    </Button>
                  </>
                )}
                {viewingAgreement.status === "counter_proposal" && (
                  <Button
                    onClick={() => handleAgreementAction(viewingAgreement.id, "accept")}
                    disabled={accepting}
                    className="gap-2"
                  >
                    {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                    Accept Counter Proposal
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderEmptyState() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Agreements</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            Create your first agreement to formalize parenting plans,
            schedules, and other arrangements.
          </p>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agreement
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderAgreementCard(agreement: Agreement) {
    return (
      <Card
        key={agreement.id}
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => setViewingAgreement(agreement)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{agreement.title}</CardTitle>
                <Badge variant="outline" className="text-xs">v{agreement.version}</Badge>
              </div>
              <CardDescription>
                {agreement.description || <span className="capitalize">{agreement.type} agreement</span>}
                {agreement.createdBy && (
                  <span> &middot; Created by {agreement.createdBy.name}</span>
                )}
                <span> &middot; {formatDate(agreement.createdAt)}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isAdmin && !hasUserSigned(agreement) && (
                <Badge variant="warning" className="text-xs">
                  Needs your signature
                </Badge>
              )}
              {agreement.signatures && agreement.signatures.length > 0 && (
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                  {agreement.signatures.length} signed
                </Badge>
              )}
              {getStatusBadge(agreement.status)}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }
}
