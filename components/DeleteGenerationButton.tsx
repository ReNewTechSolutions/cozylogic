"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteGenerationButton({ generationId }: { generationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!confirm("Delete this design?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/generations/${generationId}/delete`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "delete_failed");

      router.refresh(); // ✅ refresh server components (dashboard list)
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}