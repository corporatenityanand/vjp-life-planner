import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { Lead, LEAD_STAGES, OPEN_STAGES, companyName, newTask } from "@/lib/model";
import { fmtDay, todayStr, uid, weekStart } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CompanyDot, Empty, Stat } from "@/components/bits";
import { CompanySelect } from "@/components/pickers";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskRow } from "@/components/TaskRow";
import { Docs } from "@/components/Docs";
import { setUI, useUI } from "@/components/ui-state";
import { ArrowRight, CalendarDays, Check, Mail, Paperclip, Phone, Plus, Trophy, Users, X } from "lucide-react";

export const leads = () => (S.work.leads = S.work.leads || []);
const stageName = (s: string) => LEAD_STAGES.find(([k]) => k === s)?.[1] || s;
const unit = () => S.work.unit || "Cr";
const money = (v?: number | null) => (v ? `₹${(+v).toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${unit()}` : "");
const daysSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 864e5));
const stageSince = (l: Lead) => [...l.log].reverse().find((x) => x.stage)?.at || l.created;

export function setStage(l: Lead, stage: string, note?: string) {
  if (l.stage === stage) return;
  update(() => { l.stage = stage; l.log.push({ at: new Date().toISOString(), stage, text: note || `Moved to ${stageName(stage)}` }); });
}

/* ---------- lead sheet ---------- */
function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <div className={cn("space-y-1.5", className)}><Label>{label}</Label>{children}</div>; }

function LeadSheet() {
  const ui = useUI(); useStore();
  const l = leads().find((x) => x.id === ui.leadSheet);
  const [note, setNote] = React.useState("");
  React.useEffect(() => setNote(""), [ui.leadSheet]);
  if (!l) return null;
  const set = (p: Partial<Lead>) => update(() => Object.assign(l, p));
  const tasks = S.tasks.filter((t) => t.lead === l.id);
  const meets = S.net.meetings.filter((m) => m.lead === l.id).sort((a, b) => (b.date || b.week || "").localeCompare(a.date || a.week || ""));
  const idx = LEAD_STAGES.findIndex(([k]) => k === l.stage);
  const win = () => {
    if (l.order && S.work.orders.some((o) => o.id === l.order)) { setUI({ leadSheet: null, orderSheet: l.order }); return; }
    const id = "o-" + uid();
    update((S) => {
      S.work.orders.unshift({ id, company: l.company, title: l.title, client: l.org, kind: "WO", value: l.value ?? null, status: "ongoing", created: new Date().toISOString(), lead: l.id, docs: (l.docs || []).map((d) => ({ ...d })), notes: l.notes });
      l.order = id; if (l.stage !== "won") { l.stage = "won"; l.log.push({ at: new Date().toISOString(), stage: "won", text: "Won. Sales order created." }); }
    });
    toast("Won. A sales order was created with the lead's documents.");
  };
  return (
    <Sheet open onOpenChange={(v) => !v && setUI({ leadSheet: null })}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <div className="pr-6"><SheetTitle>Lead</SheetTitle><SheetDescription>{companyName(S, l.company)} · added {fmtDay(l.created.slice(0, 10))} · {daysSince(stageSince(l))} days in {stageName(l.stage)}</SheetDescription></div>
        <Input defaultValue={l.title} key={l.id} onBlur={(e) => e.target.value.trim() && set({ title: e.target.value.trim() })} placeholder="What's the opportunity? e.g. Ring road package 3 earthwork" className="text-lg font-semibold" />

        <div>
          <div className="flex flex-wrap gap-1">
            {LEAD_STAGES.filter(([k]) => OPEN_STAGES.includes(k)).map(([k, lab], i) => (
              <button key={k} onClick={() => setStage(l, k)} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", l.stage === k ? "border-brand bg-brand text-white" : idx > i && OPEN_STAGES.includes(l.stage) ? "border-brand/40 text-foreground" : "text-muted-foreground")}>{idx > i && OPEN_STAGES.includes(l.stage) && <Check className="h-3 w-3" />}{lab}</button>))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="brand" onClick={win}><Trophy />{l.order ? "Open its sales order" : "Won: create sales order"}</Button>
            {l.stage !== "lost" ? <Button size="sm" variant="outline" onClick={() => { const r = prompt("Why was it lost? (price, timing, went to competitor…)"); if (r !== null) { update(() => { l.lostReason = r; }); setStage(l, "lost", r ? `Lost: ${r}` : "Lost"); } }}><X />Mark lost</Button>
              : <Button size="sm" variant="outline" onClick={() => setStage(l, "contacted", "Reopened")}>Reopen</Button>}
          </div>
          {l.stage === "lost" && l.lostReason && <p className="mt-2 text-sm text-muted-foreground">Lost: {l.lostReason}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <F label="Company"><CompanySelect value={l.company} allowNone={false} onChange={(v) => v && update(() => { l.company = v; S.tasks.forEach((t) => { if (t.lead === l.id) t.company = v; }); })} /></F>
          <F label={`Expected value (₹ ${unit()})`}><Input type="number" step="any" defaultValue={l.value ?? ""} key={l.id + "v"} onBlur={(e) => set({ value: e.target.value === "" ? null : +e.target.value })} /></F>
          <F label="Client / organisation"><Input defaultValue={l.org || ""} key={l.id + "o"} onBlur={(e) => set({ org: e.target.value })} placeholder="e.g. NHAI, L&T" /></F>
          <F label="Source"><Input defaultValue={l.source || ""} key={l.id + "s"} onBlur={(e) => set({ source: e.target.value })} placeholder="Referral, tender portal, meeting…" list="lead-sources" />
            <datalist id="lead-sources">{Array.from(new Set(["Referral", "Tender portal", "Networking meeting", "Existing client", "Cold call", ...leads().map((x) => x.source).filter(Boolean) as string[]])).map((s) => <option key={s} value={s} />)}</datalist></F>
          <F label="Contact person"><Input defaultValue={l.contact || ""} key={l.id + "c"} onBlur={(e) => set({ contact: e.target.value })} /></F>
          <F label="Phone"><div className="flex gap-1"><Input type="tel" defaultValue={l.phone || ""} key={l.id + "p"} onBlur={(e) => set({ phone: e.target.value })} />{l.phone && <Button asChild variant="outline" size="icon"><a href={`tel:${l.phone}`} aria-label="Call"><Phone /></a></Button>}</div></F>
          <F label="Email" className="col-span-2 sm:col-span-1"><div className="flex gap-1"><Input type="email" defaultValue={l.email || ""} key={l.id + "e"} onBlur={(e) => set({ email: e.target.value })} />{l.email && <Button asChild variant="outline" size="icon"><a href={`mailto:${l.email}`} aria-label="Email"><Mail /></a></Button>}</div></F>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold">Next step</div>
          <div className="flex flex-wrap gap-2">
            <Input defaultValue={l.next || ""} key={l.id + "n"} onBlur={(e) => set({ next: e.target.value })} placeholder="e.g. Send revised quote" className="min-w-0 flex-1 basis-full sm:basis-0" />
            <Input type="date" defaultValue={l.nextDate || ""} key={l.id + "d"} onChange={(e) => set({ nextDate: e.target.value || null })} className="w-auto" />
            <Button variant="outline" disabled={!l.next} onClick={() => { update((S) => newTask(S, l.next!, { company: l.company, lead: l.id, date: l.nextDate || null, week: l.nextDate ? null : weekStart(todayStr()) })); toast("Added to your tasks."); }}><Plus />Make it a task</Button>
          </div>
        </div>

        <section className="space-y-2">
          <div className="flex items-center"><h3 className="mr-auto text-sm font-semibold">Documents <span className="font-normal text-muted-foreground num">{(l.docs || []).length || ""}</span></h3></div>
          <Docs owner={l} folder={`Leads/${l.title.replace(/[\\/]/g, "-")}`} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Tasks <span className="font-normal text-muted-foreground">{tasks.filter((t) => !t.done).length} open</span></h3>
          <QuickAdd preset={{ company: l.company, lead: l.id, fn: null }} showPickers={false} placeholder="Add a task for this lead…" />
          <div className="divide-y">{tasks.sort((a, b) => Number(a.done) - Number(b.done)).map((t) => <TaskRow key={t.id} t={t} hide={["company", "fn"]} />)}</div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center"><h3 className="mr-auto text-sm font-semibold">Meetings</h3><Button size="sm" variant="outline" onClick={() => setUI({ meeting: { company: l.company, lead: l.id } })}><Users />Plan a meeting</Button></div>
          {meets.map((m) => <button key={m.id} onClick={() => setUI({ meeting: { id: m.id } })} className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className="flex-1 truncate">{m.title}</span><span className="text-xs text-muted-foreground">{m.status === "done" ? "Happened" : m.date ? fmtDay(m.date) : "This week"}</span></button>)}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">History</h3>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; update(() => l.log.push({ at: new Date().toISOString(), text: note.trim() })); setNote(""); }}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log an update: call, site visit, what they said…" className="min-h-[40px]" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.target as HTMLTextAreaElement).form?.requestSubmit(); }} />
            <Button type="submit" variant="outline">Log</Button>
          </form>
          <ol className="space-y-2 border-l pl-4">
            {[...l.log].reverse().map((x, i) => <li key={i} className="relative text-sm"><span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background", x.stage ? "bg-brand" : "bg-muted-foreground/50")} /><div className="text-xs text-muted-foreground num">{fmtDay(x.at.slice(0, 10))} · {new Date(x.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div><div className={cn(x.stage && "font-medium")}>{x.text}</div></li>)}
          </ol>
        </section>

        <F label="Notes"><Textarea defaultValue={l.notes || ""} key={l.id + "nt"} onBlur={(e) => set({ notes: e.target.value })} className="min-h-[80px]" /></F>
        <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (confirm(`Delete lead “${l.title}”? Its tasks stay.`)) { update((S) => { S.work.leads = leads().filter((x) => x.id !== l.id); S.tasks.forEach((t) => { if (t.lead === l.id) t.lead = null; }); }); setUI({ leadSheet: null }); } }}>Delete lead</Button>
      </SheetContent>
    </Sheet>);
}

/* ---------- pipeline board ---------- */
export function Leads() {
  useStore(); const ui = useUI();
  const [closed, setClosed] = React.useState<"" | "won" | "lost">("");
  const [drag, setDrag] = React.useState<string | null>(null); const [over, setOver] = React.useState<string | null>(null);
  const all = leads().filter((l) => ui.company === "all" || l.company === ui.company);
  const open = all.filter((l) => OPEN_STAGES.includes(l.stage));
  const year = todayStr().slice(0, 4);
  const wonY = all.filter((l) => l.stage === "won" && (l.log.find((x) => x.stage === "won")?.at || l.created).startsWith(year));
  const lostY = all.filter((l) => l.stage === "lost" && (l.log.find((x) => x.stage === "lost")?.at || l.created).startsWith(year));
  const add = () => { const id = "l-" + uid(); const at = new Date().toISOString(); update(() => leads().unshift({ id, company: ui.company !== "all" ? ui.company : S.work.companies[0].id, title: "", stage: "new", log: [{ at, stage: "new", text: "Lead added" }], created: at })); setUI({ leadSheet: id }); };
  const today = todayStr();
  const card = (l: Lead) => {
    const late = l.nextDate && l.nextDate < today; const ts = S.tasks.filter((t) => t.lead === l.id && !t.done).length;
    return (
      <button key={l.id} draggable onDragStart={(e) => { setDrag(l.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => setUI({ leadSheet: l.id })}
        className={cn("w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-foreground/30", drag === l.id && "opacity-40")}>
        <div className="text-sm font-medium leading-snug">{l.title || <span className="text-muted-foreground">Untitled lead</span>}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CompanyDot id={l.company} />{companyName(S, l.company)}</span>{l.org && <span className="truncate">{l.org}</span>}</div>
        {l.value ? <div className="mt-1.5 text-sm font-semibold num">{money(l.value)}</div> : null}
        {l.next && <div className={cn("mt-1.5 flex items-start gap-1 text-xs", late ? "text-q1" : "text-foreground/80")}><ArrowRight className="mt-0.5 h-3 w-3 shrink-0" /><span>{l.next}{l.nextDate ? ` · ${fmtDay(l.nextDate)}` : ""}</span></div>}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground num"><span>{daysSince(stageSince(l))}d in stage</span>{ts > 0 && <span>{ts} task{ts > 1 ? "s" : ""}</span>}{(l.docs || []).length > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{l.docs!.length}</span>}</div>
      </button>);
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open leads" value={open.length} sub={`${open.filter((l) => l.nextDate && l.nextDate < today).length} with an overdue next step`} />
        <Stat label="Pipeline value" value={money(open.reduce((n, l) => n + (l.value || 0), 0)) || "–"} />
        <Stat label={`Won in ${year}`} value={wonY.length} sub={money(wonY.reduce((n, l) => n + (l.value || 0), 0))} />
        <Stat label="Win rate" value={wonY.length + lostY.length ? `${Math.round((wonY.length / (wonY.length + lostY.length)) * 100)}%` : "–"} sub={`${wonY.length} won · ${lostY.length} lost this year`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="brand" onClick={add}><Plus />New lead</Button>
        <div className="flex-1" />
        <Button size="sm" variant={closed === "won" ? "secondary" : "ghost"} onClick={() => setClosed(closed === "won" ? "" : "won")}>Won <span className="num opacity-60">{all.filter((l) => l.stage === "won").length}</span></Button>
        <Button size="sm" variant={closed === "lost" ? "secondary" : "ghost"} onClick={() => setClosed(closed === "lost" ? "" : "lost")}>Lost <span className="num opacity-60">{all.filter((l) => l.stage === "lost").length}</span></Button>
      </div>
      {closed ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{all.filter((l) => l.stage === closed).map(card)}{!all.some((l) => l.stage === closed) && <Empty>No {closed} leads yet.</Empty>}</div>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {OPEN_STAGES.map((st) => { const list = open.filter((l) => l.stage === st); return (
            <div key={st} onDragOver={(e) => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver((o) => (o === st ? null : o))} onDrop={(e) => { e.preventDefault(); const l = leads().find((x) => x.id === drag); if (l) setStage(l, st); setDrag(null); setOver(null); }}
              className={cn("flex w-[78vw] shrink-0 snap-start flex-col rounded-xl bg-muted/50 p-2 sm:w-[260px] xl:w-auto xl:flex-1", over === st && "ring-2 ring-brand")}>
              <div className="flex items-baseline px-1 pb-2"><span className="mr-auto text-sm font-semibold">{stageName(st)}</span><span className="text-xs text-muted-foreground num">{list.length}{list.some((l) => l.value) ? ` · ${money(list.reduce((n, l) => n + (l.value || 0), 0))}` : ""}</span></div>
              <div className="space-y-2">{list.map(card)}</div>
              {!list.length && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">{st === "new" ? "Add the opportunities you've heard about." : "Drag a lead here"}</div>}
            </div>); })}
        </div>)}
      <LeadSheet />
    </div>);
}
