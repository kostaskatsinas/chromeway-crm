"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui";

export type FileRec = {
  id: string;
  originalName: string;
  mimeType: string;
  category?: string | null;
  caption?: string | null;
  thumbPath?: string | null;
  sizeBytes: number;
};

/** Entity-scoped gallery/uploader. */
export function FileGallery({ entityType, entityId, readOnly }: { entityType: string; entityId: string; readOnly?: boolean }) {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() =>
    api<FileRec[]>(`/api/files?entityType=${entityType}&entityId=${entityId}`)
      .then(setFiles)
      .catch(() => {}), [entityId, entityType]);

   
  useEffect(() => {
    if (entityId) load();
  }, [entityId, load]);

  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("entityType", entityType);
        fd.append("entityId", entityId);
        await api("/api/files", { formData: fd });
      }
      load();
    } finally {
      setBusy(false);
    }
  };

  const isImage = (f: FileRec) => f.mimeType.startsWith("image/");

  return (
    <div>
      {!readOnly && (
        <div
          className="border border-dashed border-line rounded-xl p-4 text-center text-[13px] text-ink-faint cursor-pointer hover:border-clay hover:text-clay transition-colors mb-3"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "…" : "⇪ Σύρετε αρχεία εδώ ή κάντε κλικ για μεταφόρτωση"}
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4" />
        </div>
      )}
      {files.length === 0 ? (
        <p className="text-xs text-ink-faint text-center py-3">Δεν υπάρχουν αρχεία</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {files.map((f) => (
            <a key={f.id} href={`/api/files/${f.id}/raw`} target="_blank" rel="noreferrer" className="group relative block aspect-square rounded-lg overflow-hidden bg-parchment">
              {isImage(f) && f.thumbPath ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={`/api/files/${f.id}/raw?variant=thumb`} alt={f.originalName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-2xl">{iconFor(f)}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function iconFor(f: FileRec) {
  if (f.mimeType.startsWith("video/")) return "▶";
  if (f.mimeType.includes("pdf")) return "▤";
  return "▣";
}

/** Standalone upload button used in headers etc. */
export function UploadButton({ entityType, entityId, label = "⇪ Φωτογραφίες", onDone }: { entityType: string; entityId: string; label?: string; onDone?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("entityType", entityType);
        fd.append("entityId", entityId);
        await api("/api/files", { formData: fd });
      }
      onDone?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "…" : label}
      </Button>
      <input ref={ref} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
    </>
  );
}
