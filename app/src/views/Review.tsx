import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, sync, setConfig, CFG, exportDocs, importDocs, toast } from "@/lib/store";
import { timeEntries, company, NETWORKING, quad, topOf } from "@/lib/model";
import { addDays, addMonths, fmtDay, fmtMonth, hm, todayStr, weekStart, weekDays } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyDot, Empty, PageHead, Stat } from "@/components/bits";
import { ChevronLeft, ChevronRight, Download, Upload } from "lucide-react";

function Bars({ rows, color }: { rows: { key: string; label: React.ReactNode; mins: number; color?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.mins)); const tot = rows.reduce((n, r) => n + r.mins, 0) || 1;
  return <div className="space-y-2">{rows.map((r) => (
    <div key={r.key} className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_88px] items-center gap-3 text-sm">
      <div className="truncate">{r.label}</div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(r.mins / max) * 100}%`, background: r.color || color || "hsl(var(--brand))" }} /></div>
      <div className="text-right num"><b>{hm(r.mins)}</b> <span className="text-xs text-muted-foreground">{Math.round((r.mins / tot) * 100)}%</span></div>
    </div>))}</div>;
}

function DataCard() {
  useStore();
  const [url, setUrl] = React.useState(CFG?.url || ""); const [tok, setTok] = React.useState(CFG?.token || "");
  const fileRef = React.useRef<HTMLInputElement>(null);
  return (
    <Card id="data"><CardHeader><CardTitle>Your data</CardTitle><CardDescription>Stored in your Google Sheet (tab “Store”) with a copy in this browser. Status: <b>{{ loading: "loading…", synced: "saved to Sheet", saving: "saving…", dirty: "unsaved changes", local: "not connected", error: "not saved" }[sync.mode]}</b>{sync.err && sync.mode === "error" ? ` (${sync.err})` : ""}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url.trim()) || !tok.trim()) { toast("Paste the web app URL (script.google.com/…/exec) and the token."); return; } setConfig({ url: url.trim(), token: tok.trim() }).then(() => toast("Connected to your Google Sheet.")); }}>
          <div className="space-y-1.5"><Label>Sheet web app URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" /></div>
          <div className="space-y-1.5"><Label>Token</Label><Input value={tok} onChange={(e) => setTok(e.target.value)} type="password" /></div>
          <div className="flex gap-2"><Button type="submit">{CFG ? "Reconnect" : "Connect"}</Button>{CFG && <Button type="button" variant="ghost" onClick={() => { setConfig(null); setUrl(""); setTok(""); }}>Disconnect</Button>}</div>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { const b = new Blob([JSON.stringify({ app: "vjp-life-planner", v: 2, at: new Date().toISOString(), docs: exportDocs() }, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `life-planner-${todayStr()}.json`; a.click(); }}><Download />Export backup</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />Import backup</Button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j.docs) throw 0; if (confirm("Replace everything with this backup?")) { importDocs(j.docs); toast("Backup imported."); } } catch { toast("That file isn't a planner backup."); } e.target.value = ""; }} />
        </div>
      </CardContent></Card>);
}

export function Review() {
  useStore();
  const [per, setPer] = React.useState<"w" | "m">("w");
  const [ws, setWs] = React.useState(weekStart(todayStr()));
  const [mk, setMk] = React.useState(todayStr().slice(0, 7));
  const from = per === "w" ? ws : mk + "-01", to = per === "w" ? addDays(ws, 6) : addDays(addMonths(mk, 1) + "-01", -1);
  const rows = timeEntries(S, from, to);
  const tot = rows.reduce((n, r) => n + r.mins, 0);
  const byCo: Record<string, number> = {}, byFn: Record<string, number> = {}, grid: Record<string, Record<string, number>> = {};
  rows.forEach((r) => { byCo[r.company] = (byCo[r.company] || 0) + r.mins; const f = r.fn || "No function"; byFn[f] = (byFn[f] || 0) + r.mins; ((grid[r.company] = grid[r.company] || {})[f] = (grid[r.company][f] || 0) + r.mins); });
  const coLabel = (k: string) => (k === "_none" ? "Not tagged" : k === "_life" ? "Personal" : company(S, k)?.short || k);
  const coRows = Object.entries(byCo).sort((a, b) => b[1] - a[1]).map(([k, m]) => ({ key: k, mins: m, color: company(S, k)?.color, label: <span className="flex items-center gap-2">{company(S, k) && <CompanyDot id={k} />}{coLabel(k)}</span> }));
  const fnRows = Object.entries(byFn).sort((a, b) => b[1] - a[1]).map(([k, m]) => ({ key: k, mins: m, label: k, color: k === NETWORKING ? "hsl(var(--fam))" : undefined }));
  const fnCols = fnRows.map((r) => r.key);
  const tasks = S.tasks.filter((t) => t.done && t.doneAt && t.doneAt.slice(0, 10) >= from && t.doneAt.slice(0, 10) <= to);
  const meets = S.net.meetings.filter((m) => m.status === "done" && m.date && m.date >= from && m.date <= to);
  const days = per === "w" ? weekDays(ws) : [];
  const top3Days = days.filter((d) => { const t = topOf(S, d); return t.length === 3 && t.every((x) => x.done); }).length;
  const R = (S.weeks[ws] && S.weeks[ws].review) || {};
  const setR = (k: string, v: string) => update((S) => { const w = (S.weeks[ws] = S.weeks[ws] || { focus: [] }); (w.review = w.review || {})[k] = v; });
  return (
    <div>
      <PageHead title="Review" sub={per === "w" ? `${fmtDay(ws)} to ${fmtDay(addDays(ws, 6))}` : fmtMonth(mk)}>
        <Tabs value={per} onValueChange={(v) => setPer(v as any)}><TabsList><TabsTrigger value="w">Week</TabsTrigger><TabsTrigger value="m">Month</TabsTrigger></TabsList></Tabs>
        <Button variant="outline" size="icon" onClick={() => (per === "w" ? setWs(addDays(ws, -7)) : setMk(addMonths(mk, -1)))}><ChevronLeft /></Button>
        <Button variant="outline" size="icon" onClick={() => (per === "w" ? setWs(addDays(ws, 7)) : setMk(addMonths(mk, 1)))}><ChevronRight /></Button>
      </PageHead>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Time logged" value={hm(tot)} sub="focus blocks, logged time, meetings" />
        <Stat label="Tasks done" value={tasks.length} sub={`${tasks.filter((t) => quad(t) === 1).length} were Q1`} />
        <Stat label="Q2 done" value={tasks.filter((t) => quad(t) === 2).length} sub="important, not urgent" />
        <Stat label="Networking meetings" value={meets.length} />
        {per === "w" ? <Stat label="Top 3 fully done" value={`${top3Days}/7`} sub="days" /> : <Stat label="Sales orders won" value={S.work.orders.filter((o) => (o.created || "").slice(0, 10) >= from && (o.created || "").slice(0, 10) <= to && o.status !== "pipeline").length} />}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Where your time went: by company</CardTitle><CardDescription>From focus blocks, time logged on tasks, and meetings that happened.</CardDescription></CardHeader>
          <CardContent>{coRows.length ? <Bars rows={coRows} /> : <Empty>No time logged yet. Run the Focus timer on a task, or log time from a task's details.</Empty>}</CardContent></Card>
        <Card><CardHeader><CardTitle>By function</CardTitle><CardDescription>Networking counts meetings that happened.</CardDescription></CardHeader>
          <CardContent>{fnRows.length ? <Bars rows={fnRows} color="hsl(var(--fin))" /> : <Empty>Nothing yet.</Empty>}</CardContent></Card>
      </div>
      {coRows.length > 1 && fnCols.length > 1 && <Card className="mt-4"><CardHeader><CardTitle>Company × function</CardTitle></CardHeader><CardContent className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1.5 pr-3 font-medium">Company</th>{fnCols.map((f) => <th key={f} className="px-2 py-1.5 text-right font-medium">{f}</th>)}<th className="pl-2 text-right font-medium">Total</th></tr></thead>
          <tbody>{coRows.map((r) => <tr key={r.key} className="border-t"><td className="py-1.5 pr-3">{r.label}</td>{fnCols.map((f) => <td key={f} className="px-2 text-right num">{grid[r.key]?.[f] ? hm(grid[r.key][f]) : <span className="text-muted-foreground">·</span>}</td>)}<td className="pl-2 text-right font-semibold num">{hm(r.mins)}</td></tr>)}</tbody></table></CardContent></Card>}
      {per === "w" && <Card className="mt-4"><CardHeader><CardTitle>Reflect</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">{[["wins", "What went well?"], ["slipped", "What slipped, and why?"], ["change", "One thing to do differently"]].map(([k, l]) => <div key={k + ws} className="space-y-1.5"><Label>{l}</Label><Textarea defaultValue={R[k] || ""} onBlur={(e) => e.target.value !== (R[k] || "") && setR(k, e.target.value)} className="min-h-[90px]" /></div>)}</CardContent></Card>}
      <div className="mt-4"><DataCard /></div>
    </div>);
}
