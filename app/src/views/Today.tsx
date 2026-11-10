import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { quad, setDone, suggestTop3, tasksOn, topOf, normalizeTop, inWeek, companyName } from "@/lib/model";
import { addDays, daysBetween, fmtLong, todayStr, weekStart } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanyBadge, CompanyDot, Empty, FnBadge, PageHead, QBadge } from "@/components/bits";
import { QuickAdd } from "@/components/QuickAdd";
import { PlanPopover, TaskRow } from "@/components/TaskRow";
import { setUI, useUI } from "@/components/ui-state";
import { ChevronLeft, ChevronRight, Play, Sparkles, Users, X } from "lucide-react";

export function Today() {
  useStore(); const ui = useUI();
  const d = ui.day, isToday = d === todayStr();
  const list = tasksOn(S, d), top = topOf(S, d);
  const [carryHidden, setCarryHidden] = React.useState(false);
  const overdue = isToday ? S.tasks.filter((t) => t.date && t.date < d && !t.done) : [];
  const meetings = S.net.meetings.filter((m) => m.date === d && m.status !== "cancelled").sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));
  const ws = weekStart(d);
  const doNow = S.tasks.filter((t) => !t.done && !t.date && quad(t) === 1).sort((a, b) => (a.week || "z").localeCompare(b.week || "z") || (a.created || "").localeCompare(b.created || ""));
  const weekTray = S.tasks.filter((t) => !t.done && !t.date && t.week === ws && quad(t) !== 1).sort((a, b) => (quad(a) || 5) - (quad(b) || 5)).slice(0, 6);
  const rest = list.filter((t) => !t.top).sort((a, b) => Number(a.done) - Number(b.done) || (quad(a) || 5) - (quad(b) || 5));
  return (
    <div>
      <PageHead title={isToday ? "Today" : fmtLong(d)} sub={isToday ? fmtLong(d) : daysBetween(todayStr(), d) > 0 ? "Planning ahead" : "Looking back"}>
        <Button variant="outline" size="icon" onClick={() => setUI({ day: addDays(d, -1) })} aria-label="Previous day"><ChevronLeft /></Button>
        {!isToday && <Button variant="outline" onClick={() => setUI({ day: todayStr() })}>Back to today</Button>}
        <Button variant="outline" size="icon" onClick={() => setUI({ day: addDays(d, 1) })} aria-label="Next day"><ChevronRight /></Button>
      </PageHead>
      {overdue.length > 0 && !carryHidden && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm">
          <span className="mr-auto"><b>{overdue.length} unfinished</b> from earlier days.</span>
          <Button size="sm" variant="brand" onClick={() => update(() => overdue.forEach((t) => { t.date = d; t.top = 0; t.carried = (t.carried || 0) + 1; }))}>Bring to today</Button>
          <Button size="sm" variant="outline" onClick={() => update(() => overdue.forEach((t) => { t.date = null; t.week = ws; t.top = 0; }))}>Back to this week</Button>
          <Button size="sm" variant="ghost" onClick={() => setCarryHidden(true)}>Not now</Button>
        </div>)}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <Card className="border-brand/60 bg-gradient-to-b from-brand/10 to-card to-40%">
            <CardHeader className="flex-row items-start space-y-0">
              <div className="mr-auto"><CardTitle className="text-xl">Top 3</CardTitle><CardDescription>If only these get done, the day counts.</CardDescription></div>
              <Button size="sm" variant="outline" disabled={!list.some((t) => !t.done)} onClick={() => { update((S) => suggestTop3(S, d)); toast(list.some((t) => !t.done && !quad(t)) ? "Suggested. Rate the rest for better picks." : "Suggested. Swap anything that feels wrong."); }}><Sparkles />Suggest</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((n) => { const t = top[n - 1]; return t ? (
                <div key={n} className={cn("flex items-center gap-3 rounded-lg border bg-card px-3 py-3", t.done && "opacity-70")}>
                  <span className="w-5 text-center text-xl font-bold text-brand num">{n}</span>
                  <Checkbox checked={t.done} onCheckedChange={(v) => update(() => { setDone(t, !!v); if (v && topOf(S, d).every((x) => x.done) && topOf(S, d).length === 3) toast("Top 3 done. The day already counts."); })} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setUI({ taskSheet: t.id })}>
                    <div className={cn("font-semibold leading-snug", t.done && "line-through text-muted-foreground")}>{t.t}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5"><CompanyBadge id={t.company} /><FnBadge fn={t.fn} /><QBadge q={quad(t)} /></div>
                  </button>
                  <Button variant="ghost" size="icon-sm" onClick={() => { try { localStorage.setItem("lp2-focus-task", t.id); } catch {} location.hash = "focus"; }} title="Focus on this"><Play /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => update((S) => { t.top = 0; normalizeTop(S, d); })} title="Remove from Top 3"><X /></Button>
                </div>) : <div key={n} className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground"><span className="w-5 text-center text-xl font-bold num">{n}</span>Star (☆) a task to put it here.</div>; })}
            </CardContent>
          </Card>
          {doNow.length > 0 && <Card className="border-q1/40">
            <CardHeader className="pb-1"><CardTitle className="text-base">Do now <span className="text-sm font-normal text-muted-foreground">Q1 tasks without a day</span></CardTitle></CardHeader>
            <CardContent className="pb-3">{doNow.map((t) => (
              <div key={t.id} className="flex items-start gap-2 border-b last:border-0">
                <TaskRow t={t} className="min-w-0 flex-1" />
                <Button size="xs" variant="outline" className="mt-2.5" onClick={() => update(() => { t.date = d; t.week = null; })}>Do {isToday ? "today" : "this day"}</Button>
              </div>))}</CardContent></Card>}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-fam" />Meetings</CardTitle></CardHeader>
            <CardContent>{meetings.length ? meetings.map((m) => (
              <button key={m.id} onClick={() => setUI({ meeting: { id: m.id } })} className="flex w-full items-center gap-3 border-b py-2 text-left text-sm last:border-0">
                <span className="w-12 text-xs text-muted-foreground num">{m.start || "—"}</span><span className="min-w-0 flex-1 truncate font-medium">{m.title}{m.org ? <span className="font-normal text-muted-foreground"> · {m.org}</span> : null}</span>{m.status === "done" && <span className="text-xs text-muted-foreground">done</span>}
              </button>)) : <p className="text-sm text-muted-foreground">No meetings {isToday ? "today" : "this day"}.</p>}
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setUI({ meeting: { date: d } })}>+ Meeting</Button></CardContent>
          </Card>
          {weekTray.length > 0 && <Card><CardHeader className="pb-1"><CardTitle className="text-base">Planned for this week, no day yet</CardTitle></CardHeader>
            <CardContent className="pb-3">{weekTray.map((t) => (
              <div key={t.id} className="flex items-center gap-2 border-b py-2 last:border-0">
                <button className="min-w-0 flex-1 text-left text-sm" onClick={() => setUI({ taskSheet: t.id })}><CompanyDot id={t.company} className="mr-1.5 align-middle" />{t.t}</button>
                <QBadge q={quad(t)} /><Button size="xs" variant="outline" onClick={() => update(() => { t.date = d; t.week = null; })}>Do {isToday ? "today" : "this day"}</Button>
              </div>))}</CardContent></Card>}
        </div>
        <Card>
          <CardHeader className="flex-row items-baseline space-y-0 pb-3"><CardTitle className="mr-auto text-base">{isToday ? "Today's list" : "List"}</CardTitle><span className="text-sm text-muted-foreground num">{list.filter((t) => t.done).length} of {list.length} done</span></CardHeader>
          <CardContent>
            <QuickAdd preset={{ date: d }} placeholder="Add a task for this day…" />
            <div className="mt-2 divide-y">{rest.length ? rest.map((t) => <TaskRow key={t.id} t={t} hide={["when"]} />) : <Empty className="mt-3">Nothing else on this day. Pull from the week, or add above.</Empty>}</div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
