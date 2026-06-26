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
import { Loader2, Send, Plus } from "lucide-react";
import { toast } from "sonner";

interface CaseOption {
  id: string;
  title: string;
  parentA: { id: string; name: string | null };
  parentB: { id: string; name: string | null };
  mediator: { id: string; name: string | null } | null;
}

export default function ComposeMessageDialog() {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/cases")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setCases(data);
        })
        .catch(() => {});
    }
  }, [open]);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const recipients: { id: string; name: string }[] = [];
  if (selectedCase) {
    if (selectedCase.parentA) recipients.push({ id: selectedCase.parentA.id, name: selectedCase.parentA.name ?? "Parent A" });
    if (selectedCase.parentB) recipients.push({ id: selectedCase.parentB.id, name: selectedCase.parentB.name ?? "Parent B" });
    if (selectedCase.mediator) recipients.push({ id: selectedCase.mediator.id, name: selectedCase.mediator.name ?? "Mediator" });
  }

  const handleSend = async () => {
    if (!selectedCaseId || !recipientId || !content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: selectedCaseId,
          recipientId,
          subject: subject || undefined,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      toast.success("Message sent");
      setOpen(false);
      setSubject("");
      setContent("");
      setSelectedCaseId("");
      setRecipientId("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Compose Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send a message to a co-parent or mediator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Case</Label>
            <Select value={selectedCaseId} onValueChange={(v) => { setSelectedCaseId(v); setRecipientId(""); }}>
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

          {selectedCase && (
            <div>
              <Label>Recipient</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject (optional)"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
