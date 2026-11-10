import * as React from "react";
import { update, uploadFile, toast } from "@/lib/store";
import type { Doc } from "@/lib/model";
import { fmtDay, uid } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, FileSpreadsheet, FileImage, Link2, Loader2, Paperclip, Trash2, Upload } from "lucide-react";

const icon = (d: Doc) => { const n = d.name.toLowerCase(); return /\.(png|jpe?g|gif|webp|heic)$/.test(n) ? FileImage : /\.(xlsx?|csv)$/.test(n) || d.url.includes("spreadsheets") ? FileSpreadsheet : d.kind === "link" && !/\.\w{2,4}$/.test(n) ? Link2 : FileText; };
const kb = (n?: number) => (!n ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Documents attached to a lead or sales order. Files go to Google Drive via the Sheet's Apps Script; links work without it. */
export function Docs({ owner, folder }: { owner: { docs?: Doc[] }; folder: string }) {
  const [busy, setBusy] = React.useState(0); const [upgrade, setUpgrade] = React.useState(false);
  const [link, setLink] = React.useState<{ name: string; url: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const docs = owner.docs || [];
  const add = (d: Omit<Doc, "id" | "at">) => update(() => { (owner.docs = owner.docs || []).push({ ...d, id: uid(), at: new Date().toISOString() }); });
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      setBusy((n) => n + 1);
      try { const r = await uploadFile(f, folder); add({ name: f.name, url: r.url, kind: "drive", size: f.size }); setUpgrade(false); }
      catch (e: any) { if (e.message === "UPGRADE") setUpgrade(true); else toast(`Couldn't upload ${f.name}: ${e.message}`); }
      finally { setBusy((n) => n - 1); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  return (
    <div className="space-y-2">
      {docs.length > 0 && <div className="divide-y rounded-md border">
        {docs.map((d) => { const I = icon(d); return (
          <div key={d.id} className="flex items-center gap-2.5 px-3 py-2">
            <I className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{d.name}</a>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline num">{[kb(d.size), fmtDay(d.at.slice(0, 10))].filter(Boolean).join(" · ")}</span>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d.name}`} onClick={() => confirm(`Remove “${d.name}” from this list? ${d.kind === "drive" ? "The file stays in your Google Drive." : ""}`) && update(() => { owner.docs = docs.filter((x) => x.id !== d.id); })}><Trash2 /></Button>
          </div>); })}
      </div>}
      {upgrade && <div className="rounded-md border border-q2/40 bg-q2/10 p-3 text-xs leading-relaxed">Uploading needs the updated Apps Script in your Google Sheet (a one-time, two-minute step I've sent you). Until then, upload the file to Google Drive and paste its link below.</div>}
      {link ? (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); let u = link.url.trim(); if (!u) return; if (!/^https?:\/\//.test(u)) u = "https://" + u; add({ name: link.name.trim() || u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60), url: u, kind: "link" }); setLink(null); }}>
          <Input autoFocus value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="Paste a link (Google Drive, Dropbox…)" className="min-w-0 flex-1 basis-full sm:basis-0" />
          <Input value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder="Name, e.g. BOQ rev 2" className="min-w-0 flex-1" />
          <Button type="submit" size="sm">Attach</Button><Button type="button" variant="ghost" size="sm" onClick={() => setLink(null)}>Cancel</Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <Button variant="outline" size="sm" disabled={busy > 0} onClick={() => fileRef.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <Upload />}{busy ? "Uploading…" : "Upload file"}</Button>
          <Button variant="outline" size="sm" onClick={() => setLink({ name: "", url: "" })}><Paperclip />Attach a link</Button>
        </div>)}
      {!docs.length && !link && <p className="text-xs text-muted-foreground">Quotes, BOQs, drawings, LOIs, emails. Uploads are saved to Google Drive › VJP Life Planner › {folder.split("/")[0]}.</p>}
    </div>);
}
