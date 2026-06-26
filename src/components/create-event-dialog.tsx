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
import { Loader2, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "pickup", label: "Pickup" },
  { value: "dropoff", label: "Drop-off" },
  { value: "appointment", label: "Appointment" },
  { value: "school", label: "School Event" },
  { value: "activity", label: "Activity" },
  { value: "holiday", label: "Holiday" },
  { value: "other", label: "Other" },
];

export default function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<{ id: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const handleCreate = async () => {
    if (!caseId || !title || !startDate) {
      toast.error("Please fill in case, title, and date");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          title,
          description: description || undefined,
          type,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : new Date(startDate).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create event");
      toast.success("Event created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setCaseId("");
      setStartDate("");
      setEndDate("");
      setType("other");
    } catch {
      toast.error("Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Event</DialogTitle>
          <DialogDescription>
            Add a new event to the shared calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Case</Label>
            <Select value={caseId} onValueChange={setCaseId}>
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

          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., School pickup, Doctor appointment"
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
