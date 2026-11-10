import * as React from "react";
import { S, update, useStore, toast } from "@/lib/store";
import { findTask, quad, setDone, setQ, QLABEL, normalizeTop } from "@/lib/model";
import { hm, todayStr, uid, weekStart } from "@/lib/date";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { qColor } from "./bits";
import { CompanySelect, FnSelect, OrderSelect } from "./pickers";
import { setUI, useUI } from "./ui-state";
import { Trash2 } from "lucide-react";

export function TaskSheet() {
  const ui = useUI(); useStore();
  const t = findTask(S, ui.taskSheet);
  const [title, setTitle] = React.useState("");
  React.useEffect(() => { if (t) setTitle(t.t); }, [ui.taskSheet]);
  const close = () => { if (t && title.trim() && title.trim() !== t.t) update(() => (t.t = title.trim())); setUI({ taskSheet: null }); };
  if (!t) return null;
  const q = quad(t);
  const spent = S.focus.filter((f) => f.taskId === t.id).reduce((n, f) => n + (f.mins || 0), 0);
  const logTime = (mins: number) => update((S) => { S.focus.push({ id: uid(), at: new Date().toISOString(), mins, taskId: t.id, company: t.company || null, fn: t.fn || null, label: t.t, kind: "manual", p: t.p }); toast(`Logged ${hm(mins)}.`); });
  return (
    <Sheet open onOpenChange={(o) => !o && close()}>
      <SheetContent>
        <div className="pr-6"><SheetTitle>Task</SheetTitle><SheetDescription>Where it belongs, how urgent it is, and when you'll do it.</SheetDescription></div>
        <div className="flex items-start gap-3">
          <Checkbox className="mt-2.5" checked={t.done} onCheckedChange={(v) => update(() => setDone(t, !!v))} />
          <Textarea value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && update(() => (t.t = title.trim()))} className="min-h-[60px] text-base" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Company</Label><CompanySelect value={t.company} onChange={(v) => update(() => { t.company = v; t.p = v || t.fn ? "fin" : t.p === "fin" ? "oth" : t.p; if (t.order && S.work.orders.find((o) => o.id === t.order)?.company !== v) t.order = null; })} /></div>
          <div className="space-y-1.5"><Label>Function</Label><FnSelect value={t.fn} onChange={(v) => update(() => { t.fn = v; if (v) t.p = "fin"; })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Sales order (optional)</Label><OrderSelect value={t.order} company={t.company} onChange={(v) => update(() => { t.order = v; const o = S.work.orders.find((x) => x.id === v); if (o) { t.company = o.company; t.p = "fin"; } })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Priority</Label>
          <div className="grid grid-cols-4 gap-1.5">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => update(() => setQ(t, q === n ? 0 : n))} className={cn("rounded-md border px-1 py-1.5 text-xs font-semibold", q === n ? qColor[n] : "text-muted-foreground hover:bg-accent")}>Q{n}<div className="text-[10px] font-medium">{QLABEL[n]}</div></button>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Day</Label><Input type="date" value={t.date || ""} onChange={(e) => update((S) => { const old = t.date; t.date = e.target.value || null; t.top = 0; if (old) normalizeTop(S, old); if (t.date) t.week = null; })} /></div>
          <div className="space-y-1.5"><Label>Or just the week of</Label><Input type="date" value={t.week || ""} onChange={(e) => update(() => { t.week = e.target.value ? weekStart(e.target.value) : null; if (t.week) { t.date = null; t.top = 0; } })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Time spent{spent ? `: ${hm(spent)}` : ""}</Label>
          <div className="flex flex-wrap gap-1.5">{[15, 30, 60, 120].map((m) => <Button key={m} variant="outline" size="xs" onClick={() => logTime(m)}>+ {hm(m)}</Button>)}</div>
          <p className="text-xs text-muted-foreground">Focus timer blocks on this task are added automatically.</p>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea defaultValue={t.notes || ""} onBlur={(e) => e.target.value !== (t.notes || "") && update(() => (t.notes = e.target.value))} placeholder="Context, numbers, who to call…" /></div>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button variant="ghost" className="text-destructive" onClick={() => { update((S) => { S.tasks = S.tasks.filter((x) => x.id !== t.id); }); setUI({ taskSheet: null }); }}><Trash2 />Delete</Button>
          <div className="flex-1" />
          <Button onClick={close}>Done</Button>
        </div>
      </SheetContent>
    </Sheet>);
}
