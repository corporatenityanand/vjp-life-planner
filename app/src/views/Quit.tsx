import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore } from "@/lib/store";
import { MILESTONES, TRIGGERS } from "@/lib/model";
import { addDays, dur, durText, fmtDay, fmtDT, mmss, pad, toLocalInput, todayStr, uid, ymd } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Empty, PageHead } from "@/components/bits";
import { Pencil, X } from "lucide-react";

function stats(v: any) {
  if (!v.quitAt) return null; const now = Date.now(), q = new Date(v.quitAt).getTime();
  const rel = (v.relapses || []).map((r: any) => new Date(r.at).getTime()).filter((t: number) => t >= q).sort((a: number, b: number) => a - b);
  const starts = [q, ...rel], ends = [...rel, now]; let longest = 0; starts.forEach((s, i) => (longest = Math.max(longest, ends[i] - s)));
  const since = starts[starts.length - 1]; return { cur: now - since, longest, relapses: rel.length };
}
const useTick = () => { const [, f] = React.useState(0); React.useEffect(() => { const i = setInterval(() => f((x) => x + 1), 1000); return () => clearInterval(i); }, []); };

function Vice({ v }: { v: any }) {
  useTick();
  const [edit, setEdit] = React.useState(!v.quitAt);
  const [urge, setUrge] = React.useState<number | null>(null);
  const [rel, setRel] = React.useState<{ at: string; trig: string; note: string } | null>(null);
  const [hist, setHist] = React.useState(false);
  const [qd, setQd] = React.useState(toLocalInput(v.quitAt));
  const st = stats(v);
  if (!st || edit) return (
    <Card><CardHeader><CardTitle>{v.name}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">When did you quit (or when will you)? Enter the exact time if you know it.</p>
      <div className="flex flex-wrap gap-2"><Input type="datetime-local" value={qd} onChange={(e) => setQd(e.target.value)} className="w-auto" /><Button variant="brand" onClick={() => { if (qd) update(() => (v.quitAt = new Date(qd).toISOString())); setEdit(false); }}>Start the clock</Button>{v.quitAt && <Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>}</div></CardContent></Card>);
  const nx = MILESTONES.find((m) => m * 864e5 > st.cur); const prev = [...MILESTONES].reverse().find((m) => m * 864e5 <= st.cur) || 0;
  const pctv = nx ? ((st.cur - prev * 864e5) / ((nx - prev) * 864e5)) * 100 : 100;
  const x = dur(st.cur);
  const trig: Record<string, number> = {}; (v.relapses || []).forEach((r: any) => r.trigger && (trig[r.trigger] = (trig[r.trigger] || 0) + 1)); const topTrig = Object.entries(trig).sort((a, b) => b[1] - a[1])[0];
  return (
    <Card><CardHeader className="flex-row items-center space-y-0"><CardTitle className="mr-auto">{v.name}</CardTitle><Badge variant={st.cur >= 7 * 864e5 ? "default" : "outline"} className={st.cur >= 7 * 864e5 ? "bg-emerald-600 text-white" : ""}>{prev ? `${prev}-day mark` : "Day 1"}</Badge></CardHeader>
      <CardContent className="space-y-3">
        <div><div className="text-xs text-muted-foreground">Clean for</div><div className="font-mono text-3xl font-bold tracking-tight num">{x.d}<small className="mx-0.5 text-sm text-muted-foreground">d</small>{pad(x.h)}<small className="mx-0.5 text-sm text-muted-foreground">h</small>{pad(x.m)}<small className="mx-0.5 text-sm text-muted-foreground">m</small>{pad(x.s)}<small className="ml-0.5 text-sm text-muted-foreground">s</small></div></div>
        <div><Progress value={pctv} indicatorClassName="bg-emerald-600" /><div className="mt-1 text-xs text-muted-foreground">{nx ? `Next: ${nx} days, ${durText(nx * 864e5 - st.cur)} to go` : "A full year. Keep going."}</div></div>
        <div><div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px]">{[...Array(30)].map((_, i) => { const d = addDays(todayStr(), i - 29); const r = (v.relapses || []).some((y: any) => ymd(new Date(y.at)) === d); const before = d < ymd(new Date(v.quitAt)); return <i key={i} title={fmtDay(d)} className={cn("h-4 rounded-[2px] bg-muted", r ? "bg-destructive" : !before && "bg-emerald-600/80")} />; })}</div><div className="mt-1 text-[11px] text-muted-foreground">Last 30 days</div></div>
        <div className="flex flex-wrap gap-x-4 text-sm"><span>Longest: <b className="num">{durText(st.longest)}</b></span><span>Relapses: <b className="num">{st.relapses}</b></span>{topTrig && <span>Top trigger: <b>{topTrig[0]}</b></span>}</div>
        {urge && <div className="rounded-lg border-2 border-fam bg-fam/10 p-3"><div className="text-xs font-semibold uppercase text-muted-foreground">Ride the urge</div><div className="font-mono text-2xl font-bold num">{mmss(Math.max(0, urge - Date.now()))}</div><p className="my-1.5 text-sm">Urges peak and pass in about 10 minutes. Leave the room, drink cold water, do 20 push-ups, or text someone. Don't negotiate with it.</p>
          <div className="flex gap-2">{(["beat", "lost"] as const).map((o) => <Button key={o} size="sm" variant={o === "beat" ? "brand" : "outline"} onClick={() => { update(() => (v.urges = v.urges || []).push({ id: uid(), at: new Date().toISOString(), o })); setUrge(null); if (o === "lost") setRel({ at: toLocalInput(), trig: "", note: "" }); }}>{o === "beat" ? "It passed" : "I gave in"}</Button>)}</div></div>}
        {rel && <div className="space-y-2 rounded-lg border-2 border-fam bg-fam/10 p-3"><div className="text-xs font-semibold uppercase text-muted-foreground">Log a relapse</div>
          <Input type="datetime-local" value={rel.at} onChange={(e) => setRel({ ...rel, at: e.target.value })} className="w-auto" />
          <div className="flex flex-wrap gap-1.5">{TRIGGERS.map((t) => <button key={t} onClick={() => setRel({ ...rel, trig: t })} className={cn("rounded-full border px-2.5 py-0.5 text-xs", rel.trig === t ? "border-fam bg-fam text-white" : "")}>{t}</button>)}</div>
          <Input value={rel.note} onChange={(e) => setRel({ ...rel, note: e.target.value })} placeholder="What was going on? (optional)" />
          <div className="flex gap-2"><Button size="sm" variant="brand" onClick={() => { update(() => (v.relapses = v.relapses || []).push({ id: uid(), at: rel.at ? new Date(rel.at).toISOString() : new Date().toISOString(), trigger: rel.trig, note: rel.note.trim() })); setRel(null); }}>Log and restart the clock</Button><Button size="sm" variant="ghost" onClick={() => setRel(null)}>Cancel</Button></div></div>}
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setUrge(Date.now() + 10 * 60000); setRel(null); }}>I have an urge</Button><Button size="sm" variant="outline" onClick={() => { setRel({ at: toLocalInput(), trig: "", note: "" }); setUrge(null); }}>I relapsed</Button><Button size="sm" variant="ghost" className="ml-auto" onClick={() => setHist(!hist)}>History</Button></div>
        {hist && <div className="divide-y text-sm"><div className="flex items-center justify-between py-1.5"><span>Quit date</span><span className="flex items-center gap-1 text-muted-foreground">{fmtDT(v.quitAt)}<Button variant="ghost" size="icon-sm" onClick={() => { setQd(toLocalInput(v.quitAt)); setEdit(true); }}><Pencil /></Button></span></div>
          {[...(v.relapses || [])].sort((a: any, b: any) => (a.at < b.at ? 1 : -1)).map((r: any) => <div key={r.id} className="flex items-start justify-between gap-2 py-1.5"><span><b>Relapse</b> {fmtDT(r.at)}{r.trigger ? ` · ${r.trigger}` : ""}{r.note && <span className="block text-muted-foreground">{r.note}</span>}</span><Button variant="ghost" size="icon-sm" onClick={() => update(() => (v.relapses = v.relapses.filter((y: any) => y.id !== r.id)))}><X /></Button></div>)}
          {(v.urges || []).length > 0 && <div className="flex justify-between py-1.5"><span>Urges ridden out</span><b className="num">{v.urges.filter((u: any) => u.o === "beat").length} of {v.urges.length}</b></div>}</div>}
      </CardContent></Card>);
}

export function Quit() {
  useStore();
  const L = S.vices.list;
  return (
    <div>
      <PageHead title="Quit tracker" sub="Clear head, clean streaks. A relapse resets the clock, not the progress." />
      {!L.length ? <Empty>No habits set up yet. <Button size="sm" variant="brand" className="ml-2" onClick={() => update((S) => (S.vices.list = ["Porn", "Alcohol", "THC", "Cigarettes"].map((n) => ({ id: n.toLowerCase(), name: n, quitAt: null, relapses: [], urges: [] }))))}>Set up porn, alcohol, THC and cigarettes</Button></Empty>
        : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{L.map((v) => <Vice key={v.id} v={v} />)}</div>}
    </div>);
}
