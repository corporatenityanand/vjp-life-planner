import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore } from "@/lib/store";
import { Goal, Task, quad, liveOrder, orderOf } from "@/lib/model";
import { addDays, addMonths, fmtDay, fmtMonth, todayStr, weekStart } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CompanyDot, PageHead } from "@/components/bits";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskRow } from "@/components/TaskRow";
import { setUI, useUI } from "@/components/ui-state";
import { ChevronLeft, ChevronRight, Settings2, X } from "lucide-react";
import { Projects } from "./Projects";
import { BillingTab, useAutoBilling } from "./BillingView";
import { billedBetween, rupeesToUnit } from "@/lib/billing";
import { OrderSheet } from "./Sales";

type Per = "y" | "m" | "w";
/** Year goals run on the Indian financial year: key "2026" is FY 2026–27, April 2026 to March 2027. */
const fyOf = (d: string) => String(+d.slice(0, 4) - (+d.slice(5, 7) < 4 ? 1 : 0));
const fyLabel = (k: string) => `FY ${k}–${String(+k + 1).slice(2)}`;
const curKey = (p: Per) => (p === "y" ? fyOf(todayStr()) : p === "m" ? todayStr().slice(0, 7) : weekStart(todayStr()));
const stepKey = (p: Per, k: string, n: number) => (p === "y" ? String(+k + n) : p === "m" ? addMonths(k, n) : addDays(k, 7 * n));
const keyLabel = (p: Per, k: string) => (p === "y" ? fyLabel(k) : p === "m" ? fmtMonth(k) : `Week of ${fmtDay(k)}`);
const getGoal = (c: string, p: Per, k: string): Goal => S.work.goals[c]?.[p]?.[k] || {};
function setGoal(c: string, p: Per, k: string, patch: Partial<Goal>) {
  update((S) => { const g = (S.work.goals[c] = S.work.goals[c] || { y: {}, m: {}, w: {} }); g[p] = g[p] || {}; g[p][k] = { ...(g[p][k] || {}), ...patch }; });
}
/** Revenue actual: from the billing app when it covers this company, else what was typed in. */
const autoRev = (c: string, p: Per, k: string) => { const [a, b] = p === "y" ? [k + "-04-01", +k + 1 + "-03-31"] : p === "m" ? [k + "-01", k + "-31"] : [k, addDays(k, 6)]; const v = billedBetween(c, a, b); return v == null ? null : +rupeesToUnit(v).toFixed(2); };
const revAct = (c: string, p: Per, k: string, g: Goal) => autoRev(c, p, k) ?? g.revAct;
const num = (v: string) => (v === "" ? null : +v);
const pct = (a?: number | null, t?: number | null) => (t ? Math.round(((a || 0) / t) * 100) : 0);
const money = (v?: number | null) => (v == null ? "–" : `₹${(+v).toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${S.work.unit || "Cr"}`);

function NumField({ label, value, onCommit }: { label: string; value?: number | null; onCommit: (v: number | null) => void }) {
  const [v, setV] = React.useState(value == null ? "" : String(value));
  React.useEffect(() => setV(value == null ? "" : String(value)), [value]);
  return <div className="space-y-1"><Label>{label}</Label><Input inputMode="decimal" type="number" step="any" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => num(v) !== (value ?? null) && onCommit(num(v))} placeholder="0" className="num" /></div>;
}

function GoalCard({ c }: { c: string }) {
  const [p, setP] = React.useState<Per>("m");
  const [k, setK] = React.useState(curKey("m"));
  const g = getGoal(c, p, k);
  const [text, setText] = React.useState(g.text || "");
  React.useEffect(() => setText(getGoal(c, p, k).text || ""), [c, p, k]);
  const kids = p === "y" ? Object.entries(S.work.goals[c]?.m || {}).filter(([kk]) => fyOf(kk) === k) : p === "m" ? Object.entries(S.work.goals[c]?.w || {}).filter(([kk]) => kk.slice(0, 7) === k) : [];
  const kidRev = kids.reduce((n, [, x]) => n + (x.revAct || 0), 0);
  const auto = autoRev(c, p, k); const G = { ...g, revAct: auto ?? g.revAct };
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0">
        <CardTitle className="mr-auto">Goal</CardTitle>
        <Tabs value={p} onValueChange={(v) => { setP(v as Per); setK(curKey(v as Per)); }}><TabsList className="h-8"><TabsTrigger value="y" className="text-xs">Year</TabsTrigger><TabsTrigger value="m" className="text-xs">Month</TabsTrigger><TabsTrigger value="w" className="text-xs">Week</TabsTrigger></TabsList></Tabs>
        <div className="flex items-center"><Button variant="ghost" size="icon-sm" onClick={() => setK(stepKey(p, k, -1))}><ChevronLeft /></Button><span className="min-w-[130px] text-center text-xs font-medium num">{keyLabel(p, k)}</span><Button variant="ghost" size="icon-sm" onClick={() => setK(stepKey(p, k, 1))}><ChevronRight /></Button></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1"><Label>Where the company should be by the end of this {p === "y" ? "financial year" : p === "m" ? "month" : "week"} (one line)</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== (g.text || "") && setGoal(c, p, k, { text })} placeholder="e.g. 3 new work orders signed and RA bills cleared within 30 days" className="text-base font-medium" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([["rev", "revAct", "Revenue"], ["profit", "profAct", "Profit"]] as const).map(([t, a, lab]) => (
            <div key={t} className="rounded-lg border p-3">
              <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">{lab}</span><span className="text-xs text-muted-foreground num">{pct(G[a], g[t])}% of target</span></div>
              <Progress value={pct(G[a], g[t])} className="mt-2" indicatorClassName={t === "rev" ? "bg-fin" : "bg-brand"} />
              <div className="mt-3 grid grid-cols-2 gap-2"><NumField label={`Target (₹ ${S.work.unit || "Cr"})`} value={g[t]} onCommit={(v) => setGoal(c, p, k, { [t]: v } as any)} />
                {t === "rev" && auto != null ? <div className="space-y-1"><Label>Billed so far</Label><div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold num">{auto}</div><p className="text-[11px] text-muted-foreground">From the billing app: taxable value of tax invoices</p></div>
                  : <NumField label="Actual so far" value={g[a]} onCommit={(v) => setGoal(c, p, k, { [a]: v } as any)} />}</div>
            </div>))}
        </div>
        {kids.length > 0 && <p className="text-xs text-muted-foreground">{p === "y" ? "Months" : "Weeks"} with goals: {kids.length}. Revenue logged across them: {money(kidRev)}.</p>}
        <p className="text-xs text-muted-foreground">{auto != null ? "Revenue comes from the billing app. Profit is still typed in." : "Actuals are typed in. Connect the billing app (Billing tab) and revenue fills itself where it has bills for this company."}</p>
      </CardContent>
    </Card>);
}

function FunctionsBoard({ c }: { c: string }) {
  useStore();
  const [order, setOrder] = React.useState("all");
  const [showDone, setShowDone] = React.useState(false);
  const [onlyUnrated, setOnlyUnrated] = React.useState(false);
  const all = S.tasks.filter((t) => t.company === c && (order === "all" || (order === "none" ? !t.order : t.order === order)));
  const fns = [...S.work.functions, ...Array.from(new Set(all.map((t) => t.fn).filter((f) => f && !S.work.functions.includes(f!)))) as string[], null];
  const sortT = (a: Task, b: Task) => Number(a.done) - Number(b.done) || (quad(a) || 5) - (quad(b) || 5) || (a.date || a.week || "z").localeCompare(b.date || b.week || "z");
  const orders = S.work.orders.filter((o) => o.company === c && liveOrder(o));
  const unrated = all.filter((t) => !t.done && !quad(t)).length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">Functions</h2>
        <Select value={order} onValueChange={setOrder}><SelectTrigger className="w-[230px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sales orders</SelectItem><SelectItem value="none">Not tied to an order</SelectItem>{orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.kind} · {o.title}</SelectItem>)}</SelectContent></Select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={onlyUnrated} onCheckedChange={setOnlyUnrated} />Only unrated{unrated ? ` (${unrated})` : ""}</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={showDone} onCheckedChange={setShowDone} />Show done</label>
      </div>
      <div className="gap-4 [column-fill:_balance] md:columns-2 2xl:columns-3">
        {fns.map((fn) => {
          const list = all.filter((t) => (t.fn || null) === fn && (showDone || !t.done) && (!onlyUnrated || (!t.done && !quad(t)))).sort(sortT);
          const open = all.filter((t) => (t.fn || null) === fn && !t.done).length;
          if (fn === null && !list.length) return null;
          return (
            <Card key={fn || "_none"} className="mb-4 break-inside-avoid">
              <CardHeader className="flex-row items-center space-y-0 pb-1"><CardTitle className="text-sm">{fn || "No function"}</CardTitle><span className={cn("ml-auto rounded-md px-1.5 py-0.5 text-xs num", open ? "bg-muted font-semibold" : "text-muted-foreground")}>{open} open</span></CardHeader>
              <CardContent className="pb-3">
                {list.length > 0 && <div className="divide-y">{list.map((t) => <TaskRow key={t.id} t={t} hide={["company", "fn", ...(order !== "all" ? (["order"] as const) : [])]} />)}</div>}
                <QuickAdd className="mt-1.5" showPickers={false} preset={{ company: c, fn, order: order !== "all" && order !== "none" ? order : undefined }} placeholder={`+ ${fn || "Task"}`} />
              </CardContent>
            </Card>);
        })}
      </div>
    </div>);
}

function Overview() {
  useStore();
  const m = curKey("m"), y = curKey("y");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {S.work.companies.map((c) => {
        const gm = getGoal(c.id, "m", m), gy = getGoal(c.id, "y", y);
        const open = S.tasks.filter((t) => t.company === c.id && !t.done);
        const q1 = open.filter((t) => quad(t) === 1).length, un = open.filter((t) => !quad(t)).length;
        const orders = S.work.orders.filter((o) => o.company === c.id && liveOrder(o)).length;
        return (
          <Card key={c.id} className="cursor-pointer transition-colors hover:border-foreground/30" onClick={() => setUI({ company: c.id })}>
            <CardHeader><CardTitle className="flex items-center gap-2"><CompanyDot id={c.id} className="h-3 w-3" />{c.name}</CardTitle><CardDescription>{gm.text || gy.text || "No goal set for this month yet."}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Revenue · {fmtMonth(m).split(" ")[0]}</div><div className="font-semibold num">{money(revAct(c.id, "m", m, gm))} <span className="text-xs font-normal text-muted-foreground">of {money(gm.rev)}</span></div><Progress className="mt-1 h-1.5" value={pct(revAct(c.id, "m", m, gm), gm.rev)} indicatorClassName="bg-fin" /></div>
                <div><div className="text-xs text-muted-foreground">Revenue · {fyLabel(y)}</div><div className="font-semibold num">{money(revAct(c.id, "y", y, gy))} <span className="text-xs font-normal text-muted-foreground">of {money(gy.rev)}</span></div><Progress className="mt-1 h-1.5" value={pct(revAct(c.id, "y", y, gy), gy.rev)} indicatorClassName="bg-fin" /></div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span><b className="text-foreground num">{open.length}</b> open tasks</span><span><b className="text-q1 num">{q1}</b> Q1</span><span><b className="text-foreground num">{un}</b> unrated</span><span><b className="text-foreground num">{orders}</b> live orders</span></div>
            </CardContent>
          </Card>); })}
    </div>);
}

function CompanySettings({ onClose }: { onClose: () => void }) {
  useStore(); const [fn, setFn] = React.useState("");
  return (
    <Card className="mb-5"><CardHeader className="flex-row items-center space-y-0"><CardTitle className="mr-auto">Companies and functions</CardTitle><Button variant="ghost" size="icon-sm" onClick={onClose}><X /></Button></CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">{S.work.companies.map((c) => (
          <div key={c.id} className="flex items-center gap-2"><input type="color" value={c.color} onChange={(e) => update(() => (c.color = e.target.value))} className="h-8 w-8 rounded border bg-transparent" />
            <Input defaultValue={c.short} onBlur={(e) => e.target.value.trim() && update(() => (c.short = e.target.value.trim()))} className="w-28" /><Input defaultValue={c.name} onBlur={(e) => update(() => (c.name = e.target.value))} /></div>))}
          <Button variant="outline" size="sm" onClick={() => update((S) => { const id = "c" + Math.random().toString(36).slice(2, 6); S.work.companies.push({ id, short: "New", name: "New company", color: "#64748b" }); })}>+ Company</Button>
          <div className="flex items-center gap-2 pt-2 text-sm"><Label>Money unit</Label><Select value={S.work.unit || "Cr"} onValueChange={(v) => update(() => (S.work.unit = v))}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cr">₹ Crore</SelectItem><SelectItem value="L">₹ Lakh</SelectItem></SelectContent></Select></div>
        </div>
        <div><div className="flex flex-wrap gap-1.5">{S.work.functions.map((f, i) => <span key={f} className="inline-flex items-center gap-1 rounded-md border py-0.5 pl-2 pr-0.5 text-sm">{f}<Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => update(() => S.work.functions.splice(i, 1))} title="Remove (tasks keep their tag)"><X /></Button></span>)}</div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (fn.trim() && !S.work.functions.includes(fn.trim())) update(() => S.work.functions.push(fn.trim())); setFn(""); }}><Input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="New function" /><Button variant="outline" type="submit">Add</Button></form>
          <p className="mt-2 text-xs text-muted-foreground">Functions are shared by every company.</p></div>
      </CardContent></Card>);
}

export function Companies() {
  useStore(); const ui = useUI(); useAutoBilling();
  const [settings, setSettings] = React.useState(false);
  const [tab, setTab] = React.useState(() => { try { return localStorage.getItem("lp2-cotab") || "projects"; } catch { return "projects"; } });
  const pickTab = (v: string) => { setTab(v); try { localStorage.setItem("lp2-cotab", v); } catch {} };
  const c = S.work.companies.find((x) => x.id === ui.company);
  return (
    <div>
      <PageHead title={c ? c.name : "Companies"} sub={c ? "Pick a project to work its tasks by function, or see every function at once." : "Pick a company to work its projects, functions and goals."}>
        <Button variant="outline" onClick={() => setSettings(!settings)}><Settings2 />Edit companies & functions</Button>
      </PageHead>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b">
        {[{ id: "all", short: "Overview" }, ...S.work.companies].map((x) => (
          <button key={x.id} onClick={() => setUI({ company: x.id })} className={cn("-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold text-muted-foreground", ui.company === x.id ? "border-brand text-foreground" : "border-transparent hover:text-foreground")}>
            {x.id !== "all" && <CompanyDot id={x.id} />}{x.short}
            {x.id !== "all" && <span className="text-xs font-normal num">{S.tasks.filter((t) => t.company === x.id && !t.done).length}</span>}
          </button>))}
      </div>
      {settings && <CompanySettings onClose={() => setSettings(false)} />}
      {!c ? <Overview /> : <div className="space-y-4">
        <Tabs value={tab} onValueChange={pickTab}><TabsList><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="functions">All functions</TabsTrigger><TabsTrigger value="goals">Goals</TabsTrigger><TabsTrigger value="billing">Billing</TabsTrigger></TabsList></Tabs>
        {tab === "projects" ? <Projects key={c.id} c={c.id} /> : tab === "functions" ? <FunctionsBoard c={c.id} /> : tab === "billing" ? <BillingTab c={c.id} /> : <GoalCard key={c.id} c={c.id} />}
      </div>}
      <OrderSheet />
    </div>);
}
