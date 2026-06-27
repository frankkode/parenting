"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface CaseOption {
  id: string;
  title: string;
}

export default function CreateAgreementButton() {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("custom");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/cases")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCases(data);
            if (data.length > 0 && !selectedCaseId) {
              setSelectedCaseId(data[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const handleCreate = async () => {
    if (!selectedCaseId || !title || !content) {
      toast.error("Case, title, and content are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: selectedCaseId,
          title,
          description: description || undefined,
          type,
          content,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agreement");
      }
      toast.success("Agreement created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setContent("");
      setType("custom");
      // Refresh the page
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to create agreement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Label>Case *</Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a case..." />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Holiday Schedule 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this agreement"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full agreement text here..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
