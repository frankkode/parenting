"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  StickyNote,
  Plus,
  Loader2,
  Edit3,
  Trash2,
  User,
  CalendarDays,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface SharedNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; image?: string } | null;
}

export default function NotesPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const { data: session, status } = useSession();
  const user = session?.user as { role: string } | undefined;
  const isAdmin = user?.role === "ADMIN" || user?.role === "MEDIATOR";

  // Redirect non-admin users
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/dashboard");
    }
  }, [status, isAdmin, router]);

  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<SharedNote | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/shared-notes?caseId=${caseId}`);
      if (!res.ok) throw new Error("Failed to fetch notes");

      // If the backend doesn't have shared-notes route yet, use a mock
      let data;
      try {
        data = await res.json();
      } catch {
        data = [];
      }
      setNotes(data);
    } catch (error) {
      console.error("[FETCH_NOTES]", error);
      // Don't show error - the endpoint might not exist yet
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/shared-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCaseId: caseId,
          ...formData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create note");
      }

      toast.success("Note created");
      setShowCreateDialog(false);
      setFormData({ title: "", content: "" });
      fetchNotes();
    } catch (error: any) {
      console.error("[CREATE_NOTE]", error);
      toast.error(error.message || "Failed to create note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !formData.title) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/shared-notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update note");
      }

      toast.success("Note updated");
      setShowEditDialog(false);
      setEditingNote(null);
      fetchNotes();
    } catch (error: any) {
      console.error("[EDIT_NOTE]", error);
      toast.error(error.message || "Failed to update note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/shared-notes/${noteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete note");

      toast.success("Note deleted");
      setShowEditDialog(false);
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error("[DELETE_NOTE]", error);
      toast.error("Failed to delete note");
    }
  };

  const openEditDialog = (note: SharedNote) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
    setShowEditDialog(true);
  };

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
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
          <h1 className="text-3xl font-bold tracking-tight">Shared Notes</h1>
          <p className="text-muted-foreground">
            Collaborative notes visible to all case participants
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Note</DialogTitle>
              <DialogDescription>
                Add a shared note visible to all case participants
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
                  placeholder="Note title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your note here..."
                  rows={8}
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
              <Button onClick={handleCreateNote} disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Shared notes help all participants stay informed. Create a note
              to document important information, decisions, or observations.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => openEditDialog(note)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                      {note.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {note.user?.name || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatRelativeTime(note.updatedAt)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(note);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditDialog(false);
            setEditingNote(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the shared note content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingNote(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => editingNote && handleDeleteNote(editingNote.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleEditNote} disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
