import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { Order, ORDER_STATUS, Task, newTask, quad, setDone } from "@/lib/model";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty } from "@/components/bits";
import { billsForOrder, lakh } from "@/lib/billing";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskRow } from "@/components/TaskRow";
import { setUI } from "@/components/ui-state";
import { ChevronLeft, ClipboardCheck, FileText, Maximize2, Minimize2, Plus, Paperclip } from "lucide-react";

const ONGOING = ["ongoing", "halted"]; const DONE = ["finalbill", "complete"];
const stLabel = (s: string) => ORDER_STATUS.find(([k]) => k === s)?.[1] || s;
const stTone: Record<string, string> = { ongoing: "bg-fin/15 text-fin", finalbill: "bg-q2/15 text-q2", halted: "bg-q1/15 text-q1", complete: "bg-muted text-muted-foreground" };
const sortT = (a: Task, b: Task) => Number(a.done) - Number(b.done) || (quad(a) || 5) - (quad(b) || 5) || (a.date || a.week || "z").localeCompare(b.date || b.week || "z");

/** What has to happen before a finished project is truly closed. */
export const CLOSURE: [string, string, string][] = [
  ["cc", "Contracts", "Get the completion certificate from the client"],
  ["meas", "Contracts", "Final measurement / joint record signed off"],
  ["fb", "Billing", "Submit the final bill"],
  ["fbc", "Billing", "Final bill certified by the client"],
  ["fbp", "Receivables", "Collect the final bill payment"],
  ["ret", "Receivables", "Get retention / security deposit released"],
  ["bg", "Receivables", "Get bank guarantees returned or cancelled"],
  ["pay", "Payables", "Settle all subcontractor and supplier dues"],
  ["demob", "Equipment repairs / maintenance", "Demobilise equipment from site"],
  ["lab", "Manpower", "Settle labour and release site staff"],
  ["docs", "Quality / Safety / Compliance", "Hand over as-built and QA documents"],
  ["pnl", "Finance", "Close the project P&L and reconcile accounts"],
];
const CLOSE_FIRST = ["Contracts", "Billing", "Receivables", "Payables", "Finance"];

function Closure({ o }: { o: Order }) {
  const tasks = S.tasks.filter((t) => t.order === o.id && t.ref?.closure);
  const byKey = (k: string) => tasks.find((t) => t.ref.closure === k);
  const added = CLOSURE.filter(([k]) => byKey(k)); const done = added.filter(([k]) => byKey(k)!.done).length;
  const addAll = () => update((S) => CLOSURE.forEach(([k, fn, t]) => { if (!byKey(k)) newTask(S, t, { company: o.company, order: o.id, fn, ref: { closure: k } }); }));
  return (
    <Card className="border-q2/40">
      <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0 pb-2">
        <ClipboardCheck className="h-4 w-4 text-q2" /><CardTitle className="mr-auto text-base">Closure checklist</CardTitle>
        <span className="text-xs text-muted-foreground num">{done}/{CLOSURE.length} done</span>
        {added.length < CLOSURE.length && <Button size="sm" variant="outline" onClick={addAll}><Plus />{added.length ? "Add the rest as tasks" : "Add all as tasks"}</Button>}
      </CardHeader>
      <CardContent className="grid gap-x-6 gap-y-1 pb-4 sm:grid-cols-2">
        {CLOSURE.map(([k, fn, text]) => { const t = byKey(k); return (
          <label key={k} className={cn("flex items-start gap-2 rounded-md px-1 py-1 text-sm", !t && "text-muted-foreground")}>
            <Checkbox className="mt-0.5" checked={!!t?.done} onCheckedChange={(v) => update((S) => { const x = byKey(k) || newTask(S, text, { company: o.company, order: o.id, fn, ref: { closure: k } }); setDone(x, !!v); })} />
            <span className={cn("flex-1", t?.done && "line-through opacity-60")}>{text}<span className="block text-[11px] text-muted-foreground">{fn}{!t ? " · not added yet" : ""}</span></span>
          </label>); })}
      </CardContent>
    </Card>);
}

function FnCard({ o, fn, tasks, showDone, wide }: { o: Order; fn: string | null; tasks: Task[]; showDone: boolean; wide?: boolean }) {
  const list = tasks.filter((t) => (t.fn || null) === fn && (showDone || !t.done)).sort(sortT);
  const open = tasks.filter((t) => (t.fn || null) === fn && !t.done).length;
  return (
    <Card className={cn("mb-4 break-inside-avoid", wide && "mb-0 flex max-h-full w-[320px] shrink-0 flex-col")}>
      <CardHeader className="flex-row items-center space-y-0 pb-1"><CardTitle className="text-sm">{fn || "No function"}</CardTitle><span className={cn("ml-auto rounded-md px-1.5 py-0.5 text-xs num", open ? "bg-muted font-semibold" : "text-muted-foreground")}>{open} open</span></CardHeader>
      <CardContent className={cn("pb-3", wide && "min-h-0 overflow-y-auto")}>
        {list.length > 0 && <div className="divide-y">{list.map((t) => <TaskRow key={t.id} t={t} hide={["company", "fn", "order"]} />)}</div>}
        <QuickAdd className="mt-1.5" showPickers={false} preset={{ company: o.company, fn, order: o.id }} placeholder={`+ ${fn || "Task"}`} />
      </CardContent>
    </Card>);
}

function Canvas({ o, focus, setFocus }: { o: Order; focus: boolean; setFocus: (v: boolean) => void }) {
  useStore();
  const [showDone, setShowDone] = React.useState(false); const [extra, setExtra] = React.useState<string[]>([]);
  React.useEffect(() => setExtra([]), [o.id]);
  const tasks = S.tasks.filter((t) => t.order === o.id);
  const closing = DONE.includes(o.status);
  const used = new Set(tasks.filter((t) => showDone || !t.done).map((t) => t.fn || null));
  let fns: (string | null)[] = [...S.work.functions, ...Array.from(used).filter((f) => f && !S.work.functions.includes(f)) as string[]].filter((f) => used.has(f) || extra.includes(f!));
  if (closing) fns.sort((a, b) => (CLOSE_FIRST.indexOf(a!) + 1 || 99) - (CLOSE_FIRST.indexOf(b!) + 1 || 99));
  if (used.has(null)) fns.push(null);
  const rest = S.work.functions.filter((f) => !fns.includes(f));
  const open = tasks.filter((t) => !t.done);
  return (
    <div className={cn("min-w-0 space-y-4", focus && "flex h-full flex-col")}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold leading-tight">{o.title}</h2><span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", stTone[o.status])}>{stLabel(o.status)}</span></div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">{o.client && <span>{o.client}</span>}{o.value ? <span className="num">₹{o.value} {S.work.unit || "Cr"}</span> : null}{o.completion && o.completion !== "-" && <span>Completion {o.completion}</span>}{o.receivables && <span>Receivables {o.receivables}</span>}<span className="num">{open.length} open · {open.filter((t) => quad(t) === 1).length} Q1</span>{(o.docs || []).length > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{o.docs!.length}</span>}</div>
        </div>
        <Select value={o.status} onValueChange={(v) => update(() => (o.status = v))}><SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger><SelectContent>{ORDER_STATUS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={() => setUI({ orderSheet: o.id })}><FileText />Details & documents</Button>
        <Button variant={focus ? "secondary" : "outline"} onClick={() => setFocus(!focus)}>{focus ? <Minimize2 /> : <Maximize2 />}{focus ? "Exit focus" : "Focus"}</Button>
      </div>
      {(() => { const bs = billsForOrder(o); if (!bs.length) return null; const ti = bs.filter((b) => b.status !== "PI"); const due = ti.filter((b) => b.bal >= 1);
        return <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing</span>
          <span>Billed <b className="num">{lakh(ti.reduce((n, b) => n + b.base, 0))}</b> <span className="text-muted-foreground">({ti.length} bills)</span></span><span>Received <b className="num">{lakh(ti.reduce((n, b) => n + b.paid, 0))}</b></span>
          <span className={cn(due.length && "text-q1")}>Due <b className="num">{lakh(due.reduce((n, b) => n + b.bal, 0))}</b>{due.length ? ` on ${due.length} bill${due.length > 1 ? "s" : ""}` : ""}</span>
          <span className="text-xs text-muted-foreground">Matched on {Array.from(new Set(bs.map((b) => b.site || b.client))).slice(0, 3).join(", ")}</span></div>; })()}
      {closing && !focus && <Closure o={o} />}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm"><Switch checked={showDone} onCheckedChange={setShowDone} />Show done</label>
        <div className="flex-1" />
        {rest.length > 0 && <Select value="" onValueChange={(v) => setExtra((x) => [...x, v])}><SelectTrigger className="h-9 w-[200px] text-muted-foreground"><SelectValue placeholder="+ Add a function" /></SelectTrigger><SelectContent>{rest.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>}
      </div>
      {!fns.length ? <Empty>No tasks on this project yet. Pick a function above to start, or add one here.<QuickAdd className="mt-3" preset={{ company: o.company, order: o.id }} placeholder="Add a task…" /></Empty>
        : focus ? <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">{closing && <div className="w-[340px] shrink-0 overflow-y-auto"><Closure o={o} /></div>}{fns.map((fn) => <FnCard key={fn || "_"} o={o} fn={fn} tasks={tasks} showDone={showDone} wide />)}</div>
        : <div className="gap-4 md:columns-2 2xl:columns-3">{fns.map((fn) => <FnCard key={fn || "_"} o={o} fn={fn} tasks={tasks} showDone={showDone} />)}</div>}
    </div>);
}

export function Projects({ c }: { c: string }) {
  useStore();
  const k = "lp2-proj-" + c;
  const [view, setView] = React.useState<"on" | "done">("on");
  const [sel, setSel] = React.useState<string | null>(() => { try { return localStorage.getItem(k); } catch { return null; } });
  const [focus, setFocus] = React.useState(false);
  const pick = (id: string | null) => { setSel(id); try { id ? localStorage.setItem(k, id) : localStorage.removeItem(k); } catch {} };
  React.useEffect(() => { if (!focus) return; const f = (e: KeyboardEvent) => e.key === "Escape" && setFocus(false); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [focus]);
  const mine = S.work.orders.filter((o) => o.company === c);
  const groups = { on: mine.filter((o) => ONGOING.includes(o.status)), done: mine.filter((o) => DONE.includes(o.status)) };
  const openCount = (o: Order) => S.tasks.filter((t) => t.order === o.id && !t.done).length;
  const list = [...groups[view]].sort((a, b) => (DONE.includes(a.status) ? DONE.indexOf(a.status) - DONE.indexOf(b.status) : 0) || openCount(b) - openCount(a) || a.title.localeCompare(b.title));
  const o = mine.find((x) => x.id === sel);
  React.useEffect(() => { if (o && !groups[view].includes(o)) setView(DONE.includes(o.status) ? "done" : "on"); }, [sel]);
  if (focus && o) return <div className="fixed inset-0 z-50 overflow-hidden bg-background p-4 sm:p-6"><Canvas o={o} focus setFocus={setFocus} /></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className={cn("space-y-3", o && "hidden lg:block")}>
        <div className="flex rounded-lg bg-muted p-1 text-sm">
          {([["on", "Ongoing"], ["done", "Completed"]] as const).map(([v, l]) => <button key={v} onClick={() => setView(v)} className={cn("flex-1 rounded-md px-3 py-1.5 font-medium", view === v ? "bg-background shadow-sm" : "text-muted-foreground")}>{l} <span className="num opacity-60">{groups[v].length}</span></button>)}
        </div>
        {view === "done" && <p className="px-1 text-xs text-muted-foreground">Finished on site. Closure work (final bill, retention, dues) lives here until it's done.</p>}
        <div className="space-y-2">
          {list.map((x) => { const n = openCount(x); const q1 = S.tasks.filter((t) => t.order === x.id && !t.done && quad(t) === 1).length; return (
            <button key={x.id} onClick={() => pick(x.id)} className={cn("w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-foreground/30", sel === x.id && "border-brand ring-1 ring-brand")}>
              <div className="flex items-start gap-2"><span className="mr-auto text-sm font-medium leading-snug">{x.title}</span>{x.status !== "ongoing" && <span className={cn("shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold", stTone[x.status])}>{stLabel(x.status)}</span>}</div>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground num">{x.client && <span className="truncate">{x.client}</span>}<span className={cn(n && "text-foreground")}>{n} open</span>{q1 > 0 && <span className="font-semibold text-q1">{q1} Q1</span>}</div>
            </button>); })}
          {!list.length && <Empty>{view === "on" ? "No ongoing projects. Projects are your sales orders; win one in Sales." : "No completed projects waiting on closure."}</Empty>}
        </div>
      </div>
      <div className={cn("min-w-0", !o && "hidden lg:block")}>
        {o ? <><Button variant="ghost" size="sm" className="mb-2 lg:hidden" onClick={() => pick(null)}><ChevronLeft />All projects</Button><Canvas o={o} focus={false} setFocus={setFocus} /></>
          : <Empty className="lg:mt-0">Pick a project on the left to see its tasks by function.</Empty>}
      </div>
    </div>);
}
