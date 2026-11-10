import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore } from "@/lib/store";
import { Order, ORDER_STATUS, liveOrder, companyName, quad } from "@/lib/model";
import { addDays, fmtDay, todayStr, uid, weekStart } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CompanyDot, Empty, PageHead, Stat } from "@/components/bits";
import { CompanySelect } from "@/components/pickers";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskRow } from "@/components/TaskRow";
import { setUI, useUI } from "@/components/ui-state";
import { Plus, Users, MapPin, CalendarDays, Target } from "lucide-react";
import { Docs } from "@/components/Docs";
import { Leads, leads } from "./Leads";

const stLabel = (s: string) => ORDER_STATUS.find(([k]) => k === s)?.[1] || s;
const stTone: Record<string, string> = { pipeline: "bg-q3/15 text-q3", ongoing: "bg-fin/15 text-fin", finalbill: "bg-q2/15 text-q2", halted: "bg-q1/15 text-q1", complete: "bg-muted text-muted-foreground", cancelled: "bg-muted text-muted-foreground line-through" };

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <div className={cn("space-y-1.5", className)}><Label>{label}</Label>{children}</div>; }

export function OrderSheet() {
  const ui = useUI(); useStore();
  const o = S.work.orders.find((x) => x.id === ui.orderSheet);
  if (!o) return null;
  const set = (p: Partial<Order>) => update(() => Object.assign(o, p));
  const tasks = S.tasks.filter((t) => t.order === o.id);
  const fns = Array.from(new Set([...S.work.functions.filter((f) => tasks.some((t) => t.fn === f)), ...tasks.map((t) => t.fn || "")]));
  return (
    <Sheet open onOpenChange={(v) => !v && setUI({ orderSheet: null })}>
      <SheetContent className="sm:max-w-xl">
        <div className="pr-6"><SheetTitle>{o.kind === "PO" ? "Purchase order" : "Work order"}</SheetTitle><SheetDescription>{companyName(S, o.company)} · {stLabel(o.status)}</SheetDescription></div>
        <Input defaultValue={o.title} onBlur={(e) => e.target.value.trim() && set({ title: e.target.value.trim() })} className="text-lg font-semibold" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company"><CompanySelect value={o.company} allowNone={false} onChange={(v) => v && update((S) => { o.company = v; S.tasks.forEach((t) => { if (t.order === o.id) t.company = v; }); })} /></Field>
          <Field label="Type"><ToggleGroup type="single" value={o.kind} onValueChange={(v) => v && set({ kind: v as any })}><ToggleGroupItem value="WO">Work order</ToggleGroupItem><ToggleGroupItem value="PO">Purchase order</ToggleGroupItem></ToggleGroup></Field>
          <Field label="Client"><Input defaultValue={o.client || ""} onBlur={(e) => set({ client: e.target.value })} placeholder="e.g. Tata Projects" /></Field>
          <Field label="Status"><Select value={o.status} onValueChange={(v) => set({ status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORDER_STATUS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={`Order value (₹ ${S.work.unit || "Cr"})`}><Input type="number" step="any" defaultValue={o.value ?? ""} onBlur={(e) => set({ value: e.target.value === "" ? null : +e.target.value })} /></Field>
          <Field label="Job"><Input defaultValue={o.job || ""} onBlur={(e) => set({ job: e.target.value })} /></Field>
          <Field label="Completion"><Input defaultValue={o.completion || ""} onBlur={(e) => set({ completion: e.target.value })} /></Field>
          <Field label="Receivables"><Input defaultValue={o.receivables || ""} onBlur={(e) => set({ receivables: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><Textarea defaultValue={o.notes || ""} onBlur={(e) => set({ notes: e.target.value })} className="min-h-[80px]" /></Field>
        {o.lead && leads().some((l) => l.id === o.lead) && <button className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setUI({ orderSheet: null, leadSheet: o.lead! })}>Came from lead: {leads().find((l) => l.id === o.lead)!.title}</button>}
        <div><div className="mb-1.5 text-sm font-semibold">Documents <span className="font-normal text-muted-foreground num">{(o.docs || []).length || ""}</span></div><Docs owner={o} folder={`Orders/${o.title.replace(/[\\/]/g, "-")}`} /></div>
        <div>
          <div className="mb-1 text-sm font-semibold">Tasks on this order <span className="font-normal text-muted-foreground">{tasks.filter((t) => !t.done).length} open</span></div>
          <QuickAdd preset={{ company: o.company, order: o.id }} placeholder="Add a task to this order…" />
          {fns.map((fn) => { const list = tasks.filter((t) => (t.fn || "") === fn && !t.done); if (!list.length) return null; return (
            <div key={fn} className="mt-3"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{fn || "No function"}</div><div className="divide-y">{list.map((t) => <TaskRow key={t.id} t={t} hide={["company", "order", "fn"]} />)}</div></div>); })}
        </div>
        <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (confirm(`Delete “${o.title}”? Its tasks stay, just without an order.`)) { update((S) => { S.work.orders = S.work.orders.filter((x) => x.id !== o.id); S.tasks.forEach((t) => { if (t.order === o.id) t.order = null; }); }); setUI({ orderSheet: null }); } }}>Delete order</Button>
      </SheetContent>
    </Sheet>);
}

function Orders() {
  useStore(); const ui = useUI();
  const [st, setSt] = React.useState("live");
  const list = S.work.orders.filter((o) => (ui.company === "all" || o.company === ui.company) && (st === "all" || (st === "live" ? liveOrder(o) : o.status === st)));
  const order = ORDER_STATUS.map(([k]) => k);
  list.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.title.localeCompare(b.title));
  const add = () => { const id = "o-" + uid(); update((S) => S.work.orders.unshift({ id, company: ui.company !== "all" ? ui.company : S.work.companies[0].id, title: "New order", kind: "WO", status: "pipeline", created: new Date().toISOString() })); setUI({ orderSheet: id }); };
  const val = list.filter(liveOrder).reduce((n, o) => n + (o.value || 0), 0);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={st} onValueChange={(v) => v && setSt(v)} className="flex-wrap">
          <ToggleGroupItem value="live">Live</ToggleGroupItem>{ORDER_STATUS.map(([k, l]) => <ToggleGroupItem key={k} value={k}>{l} <span className="num opacity-60">{S.work.orders.filter((o) => o.status === k && (ui.company === "all" || o.company === ui.company)).length}</span></ToggleGroupItem>)}<ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex-1" />
        {val > 0 && <span className="text-sm text-muted-foreground">Live order value: <b className="text-foreground num">₹{val.toLocaleString("en-IN")} {S.work.unit || "Cr"}</b></span>}
        <Button variant="brand" onClick={add}><Plus />New order</Button>
      </div>
      {!list.length ? <Empty>No orders here. Add a work order or purchase order when it's awarded, or track it as Pipeline while you chase it.</Empty> :
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{list.map((o) => {
          const ts = S.tasks.filter((t) => t.order === o.id && !t.done);
          const byFn: Record<string, number> = {}; ts.forEach((t) => (byFn[t.fn || "Other"] = (byFn[t.fn || "Other"] || 0) + 1));
          return (
            <Card key={o.id} className="cursor-pointer transition-colors hover:border-foreground/30" onClick={() => setUI({ orderSheet: o.id })}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2"><CardTitle className="mr-auto text-base leading-snug">{o.title}</CardTitle><span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", stTone[o.status])}>{stLabel(o.status)}</span></div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CompanyDot id={o.company} />{companyName(S, o.company)}</span><Badge variant="outline" className="px-1.5 py-0 text-[10px]">{o.kind}</Badge>{o.client && <span>{o.client}</span>}{o.job && <span>· {o.job}</span>}{o.value ? <span className="num">· ₹{o.value} {S.work.unit || "Cr"}</span> : null}</div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(o.completion || o.receivables) && <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">{o.completion && o.completion !== "-" && <span>Completion: <b className="text-foreground">{o.completion}</b></span>}{o.receivables && <span>Receivables: <b className="text-foreground">{o.receivables}</b></span>}</div>}
                <div className="flex flex-wrap gap-1">{Object.entries(byFn).map(([f, n]) => <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{f} <b className="num">{n}</b></span>)}{!ts.length && <span className="text-xs text-muted-foreground">No open tasks</span>}</div>
                {ts.some((t) => quad(t) === 1) && <div className="text-xs font-semibold text-q1">{ts.filter((t) => quad(t) === 1).length} Q1 task{ts.filter((t) => quad(t) === 1).length > 1 ? "s" : ""} open</div>}
              </CardContent>
            </Card>); })}</div>}
    </div>);
}

function Networking() {
  useStore(); const ui = useUI();
  const ws = weekStart(todayStr()), we = addDays(ws, 6), today = todayStr();
  const all = S.net.meetings.filter((m) => ui.company === "all" || m.company === ui.company);
  const thisWeek = all.filter((m) => m.status !== "cancelled" && ((m.date && m.date >= ws && m.date <= we) || (!m.date && m.week === ws)));
  const upcoming = all.filter((m) => m.status === "planned" && ((m.date && m.date > we) || (!m.date && m.week && m.week > ws))).sort((a, b) => (a.date || a.week || "").localeCompare(b.date || b.week || ""));
  const overdue = all.filter((m) => m.status === "planned" && ((m.date && m.date < ws) || (!m.date && m.week && m.week < ws)));
  const past = all.filter((m) => m.status === "done").sort((a, b) => (b.date || b.week || "").localeCompare(a.date || a.week || "")).slice(0, 30);
  const month = today.slice(0, 7);
  const target = S.settings.netPerWeek || 0;
  const Row = ({ m }: { m: any }) => (
    <button onClick={() => setUI({ meeting: { id: m.id } })} className="flex w-full items-start gap-3 border-b py-2.5 text-left last:border-0 hover:bg-accent/40">
      <div className="w-16 shrink-0 text-xs text-muted-foreground">{m.date ? fmtDay(m.date).split(" ").slice(0, 2).join(" ") : "Wk " + fmtDay(m.week).split(" ").slice(1).join(" ")}<div className="num">{m.start || ""}</div></div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{m.title}</span>{m.status === "done" && <Badge variant="soft" className="text-[10px]">Happened</Badge>}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{m.org && <span>{m.org}</span>}{m.company && <span className="flex items-center gap-1"><CompanyDot id={m.company} />{companyName(S, m.company)}</span>}{m.purpose && <span>· {m.purpose}</span>}{m.place && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{m.place}</span>}</div>
        {m.outcome && <div className="mt-1 text-xs">{m.outcome}</div>}</div>
    </button>);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="This week" value={`${thisWeek.filter((m) => m.status === "done").length}/${target}`} sub={`${thisWeek.length} planned · target ${target}`} />
        <Stat label={`This month`} value={all.filter((m) => m.status === "done" && (m.date || "").startsWith(month)).length} sub="meetings that happened" />
        <Stat label="Upcoming" value={upcoming.length} />
        <div className="rounded-xl border bg-card p-4"><div className="text-xs font-medium text-muted-foreground">Weekly target</div><Input type="number" min={0} className="mt-1 h-9 w-24 text-lg font-bold num" defaultValue={target} onBlur={(e) => update((S) => (S.settings.netPerWeek = +e.target.value || 0))} /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader className="flex-row items-center space-y-0 pb-2"><CardTitle className="mr-auto text-base">This week</CardTitle><Button size="sm" variant="brand" onClick={() => setUI({ meeting: { company: ui.company } })}><Plus />Meeting</Button></CardHeader>
          <CardContent>{thisWeek.length ? thisWeek.sort((a, b) => ((a.date || "z") + (a.start || "")).localeCompare((b.date || "z") + (b.start || ""))).map((m) => <Row key={m.id} m={m} />) : <Empty>No networking meetings planned this week. Who could send you the next work order?</Empty>}
            {overdue.length > 0 && <div className="mt-4"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-q2">Planned earlier, not marked as happened</div>{overdue.map((m) => <Row key={m.id} m={m} />)}</div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Coming up</CardTitle></CardHeader><CardContent>{upcoming.length ? upcoming.map((m) => <Row key={m.id} m={m} />) : <Empty>Nothing booked after this week yet.</Empty>}</CardContent></Card>
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Log</CardTitle></CardHeader><CardContent>{past.length ? past.map((m) => <Row key={m.id} m={m} />) : <Empty>Meetings you mark as “Happened” collect here with their outcome.</Empty>}</CardContent></Card>
    </div>);
}

export function Sales() {
  useStore(); const ui = useUI();
  const [tab, setTab] = React.useState(() => { try { return localStorage.getItem("lp2-salestab") || "orders"; } catch { return "orders"; } });
  return (
    <div>
      <PageHead title="Sales & network" sub="Leads become sales orders. Networking is how leads come in.">
        <CompanySelect value={ui.company} allLabel="All companies" onChange={(v) => setUI({ company: v || "all" })} className="w-[170px]" />
      </PageHead>
      <Tabs value={tab} onValueChange={(v) => { setTab(v); try { localStorage.setItem("lp2-salestab", v); } catch {} }}>
        <TabsList><TabsTrigger value="leads"><Target className="h-4 w-4" />Leads</TabsTrigger><TabsTrigger value="orders">Sales orders</TabsTrigger><TabsTrigger value="net"><Users className="h-4 w-4" />Networking</TabsTrigger></TabsList>
        <TabsContent value="leads"><Leads /></TabsContent>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="net"><Networking /></TabsContent>
      </Tabs>
      <OrderSheet />
    </div>);
}
