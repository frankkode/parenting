"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAgreementButton({ agreementId }: { agreementId: string }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this agreement? This will also remove all signatures. This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agreements/${agreementId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Agreement deleted");
      window.location.reload();
    } catch {
      toast.error("Failed to delete agreement");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
      title="Delete agreement"
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
