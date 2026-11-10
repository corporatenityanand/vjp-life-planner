import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { addDays, daysBetween, fmtDay, todayStr, uid, weekStart } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHead } from "@/components/bits";
import { Heart, X } from "lucide-react";

function Steps({ list, placeholder }: { list: any[]; placeholder?: string }) {
  const [v, setV] = React.useState("");
  return <div className="space-y-1.5">{list.map((st, j) => <div key={j} className="group flex items-center gap-2 text-sm"><Checkbox checked={!!st.d} onCheckedChange={(x) => update(() => (st.d = !!x))} /><span className={cn("flex-1", st.d && "text-muted-foreground line-through")}>{st.t}</span><button className="opacity-0 group-hover:opacity-100" onClick={() => update(() => list.splice(j, 1))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div>)}
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) update(() => list.push({ t: v.trim(), d: false })); setV(""); }}><Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder || "+ Step"} className="h-8" /></form></div>;
}
function LogForm({ type, placeholder, cta }: { type: string; placeholder: string; cta: string }) {
  const [n, setN] = React.useState(""); const [d, setD] = React.useState(todayStr());
  return <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); update((S) => S.famlog.events.push({ id: uid(), type, date: d || todayStr(), note: n.trim() })); setN(""); toast(type === "date" ? "Date logged." : "Outing logged."); }}>
    <Input value={n} onChange={(e) => setN(e.target.value)} placeholder={placeholder} className="min-w-[160px] flex-1" /><Input type="date" value={d} onChange={(e) => setD(e.target.value)} className="w-auto" /><Button type="submit" variant="outline">{cta}</Button></form>;
}

export function Family() {
  useStore();
  const FA = S.goals.family, ev = S.famlog.events as any[];
  const ws = weekStart(todayStr()), we = addDays(ws, 6);
  const thisWeek = ev.find((e) => e.type === "date" && e.date >= ws && e.date <= we);
  let streak = 0; { let w = ws; if (!thisWeek) w = addDays(w, -7); while (ev.some((e) => e.type === "date" && e.date >= w && e.date <= addDays(w, 6))) { streak++; w = addDays(w, -7); } }
  const lastOut = ev.filter((e) => e.type === "outing").sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const outAgo = lastOut ? daysBetween(lastOut.date, todayStr()) : null;
  const [person, setPerson] = React.useState("");
  const recent = [...ev].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  return (
    <div>
      <PageHead title="Family" sub="Weekly time with your wife, parents' health, the big family goals." />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4 text-fam" />Date with my wife this week</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-semibold">{thisWeek ? <>Done: {thisWeek.note || "date"} <span className="text-sm font-normal text-muted-foreground">({fmtDay(thisWeek.date)})</span></> : <span className="text-q2">Not yet</span>}</div>
            <div className="text-sm text-muted-foreground">{streak ? `${streak} week${streak > 1 ? "s" : ""} in a row` : "Start a streak this week"}</div>
            <LogForm type="date" placeholder="What did you do?" cta="Log date" />
            <div className="space-y-1"><div className="text-xs text-muted-foreground">Next trip</div><Input defaultValue={FA.nextTrip} onBlur={(e) => e.target.value !== FA.nextTrip && update(() => (FA.nextTrip = e.target.value))} placeholder="Where and when" /></div>
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Parents & in-laws: health check-ups</CardTitle><CardDescription>Due every {FA.checkupEveryDays || 180} days.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {(FA.people || []).map((p: any, i: number) => { const ago = p.last ? daysBetween(p.last, todayStr()) : null; const due = ago == null || ago > (FA.checkupEveryDays || 180); return (
              <div key={i} className="flex items-center gap-2 text-sm"><span className="flex-1 font-medium">{p.name}</span><Badge variant="soft" className={due ? "bg-q2/15 text-q2" : "bg-emerald-600/15 text-emerald-600"}>{p.last ? `${ago}d ago` : "No date"}</Badge><Input type="date" value={p.last || ""} onChange={(e) => update(() => (p.last = e.target.value))} className="h-8 w-auto" /></div>); })}
            <form onSubmit={(e) => { e.preventDefault(); if (person.trim()) update(() => FA.people.push({ name: person.trim(), last: "" })); setPerson(""); }}><Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="+ Person (e.g. Mom)" className="h-8" /></form>
          </CardContent></Card>
        <Card><CardHeader className="flex-row items-start space-y-0 pb-2"><div className="mr-auto"><CardTitle className="text-base">Family outing</CardTitle><CardDescription>{lastOut ? `Last: ${lastOut.note || "outing"}, ${outAgo} days ago` : "None logged yet"}</CardDescription></div>{outAgo == null || outAgo > (FA.outingEveryDays || 30) ? <Badge className="bg-q2/15 text-q2" variant="soft">Due</Badge> : <Badge variant="soft" className="bg-emerald-600/15 text-emerald-600">On track</Badge>}</CardHeader>
          <CardContent className="space-y-3"><LogForm type="outing" placeholder="Where did you all go?" cta="Log" />
            {recent.length > 0 && <div className="divide-y text-sm">{recent.map((e) => <div key={e.id} className="flex gap-2 py-1.5"><span className="w-20 text-muted-foreground">{fmtDay(e.date)}</span><span className="flex-1">{e.type === "date" ? "Date: " : "Outing: "}{e.note}</span><button onClick={() => update((S) => (S.famlog.events = S.famlog.events.filter((x: any) => x.id !== e.id)))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div>)}</div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Sister's wedding fund</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2"><span className="text-3xl font-bold num">₹{+FA.weddingSaved || 0}</span><span className="text-muted-foreground">of ₹{FA.weddingTarget} Cr</span><label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">Saved (Cr)<Input type="number" step="0.01" defaultValue={+FA.weddingSaved || 0} onBlur={(e) => update(() => (FA.weddingSaved = +e.target.value || 0))} className="h-8 w-20" /></label></div>
            <Progress value={((+FA.weddingSaved || 0) / (+FA.weddingTarget || 3)) * 100} indicatorClassName="bg-fam" />
            <Steps list={(FA.weddingSteps = FA.weddingSteps || [])} />
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Mangalore beach villa</CardTitle><CardDescription>{(FA.villaSteps || []).filter((x: any) => x.d).length} of {(FA.villaSteps || []).length} milestones done</CardDescription></CardHeader>
          <CardContent className="space-y-3"><Progress value={(FA.villaSteps || []).length ? ((FA.villaSteps.filter((x: any) => x.d).length) / FA.villaSteps.length) * 100 : 0} indicatorClassName="bg-fam" /><Steps list={(FA.villaSteps = FA.villaSteps || [])} placeholder="+ Milestone" /></CardContent></Card>
      </div>
    </div>);
}
