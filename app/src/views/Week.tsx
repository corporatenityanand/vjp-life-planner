import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore } from "@/lib/store";
import { inWeek, newTask, quad, Task, Meeting, QLABEL, QSUB, timeEntries, setDone, score } from "@/lib/model";
import { addDays, fmtDay, fmtShort, hm, minToTime, timeToMin, todayStr, weekDays, weekStart, DOW, parseYmd } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyDot, Empty, PageHead, QBadge, qColor } from "@/components/bits";
import { CompanySelect } from "@/components/pickers";
import { QuickAdd } from "@/components/QuickAdd";
import { PlanPopover, TaskRow } from "@/components/TaskRow";
import { setUI, useUI } from "@/components/ui-state";
import { ChevronLeft, ChevronRight, Plus, Users, MapPin } from "lucide-react";

const H0 = 7, H1 = 22, PX = 44; // calendar hours and pixels per hour
const coOk = (c: string, id?: string | null) => c === "all" || id === c;

export function useWeekData(ws: string, co: string) {
  const days = weekDays(ws), end = days[6];
  const tasks = S.tasks.filter((t) => inWeek(t, ws) && coOk(co, t.company));
  const meetings = S.net.meetings.filter((m) => m.status !== "cancelled" && coOk(co, m.company) && ((m.date && m.date >= ws && m.date <= end) || (!m.date && m.week === ws)));
  return { days, end, tasks, meetings };
}

function MeetingBlock({ m, style, className }: { m: Meeting; style?: React.CSSProperties; className?: string }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); setUI({ meeting: { id: m.id } }); }} style={style}
      className={cn("overflow-hidden rounded-md border-l-[3px] bg-fam/15 px-1.5 py-1 text-left text-[11px] leading-tight text-foreground hover:bg-fam/25", m.status === "done" && "opacity-60", className)}
      title={`${m.title}${m.org ? " · " + m.org : ""}`} >
      <div className="flex items-center gap-1 font-semibold"><Users className="h-3 w-3 shrink-0 text-fam" /><span className="truncate">{m.title}</span></div>
      <div className="truncate text-muted-foreground">{m.start ? m.start : "Any time"}{m.org ? ` · ${m.org}` : ""}</div>
    </button>);
}

function DayTasks({ list }: { list: Task[] }) {
  return (
    <div className="space-y-0.5">
      {list.map((t) => (
        <div key={t.id} className="group flex items-start gap-1.5 rounded px-1 py-0.5 hover:bg-accent/60">
          <Checkbox className="mt-[1px] h-4 w-4 rounded" checked={t.done} onCheckedChange={(v) => update(() => setDone(t, !!v))} />
          <button onClick={() => setUI({ taskSheet: t.id })} className={cn("min-w-0 flex-1 text-left text-[12px] leading-snug", t.done && "text-muted-foreground line-through")}>
            <CompanyDot id={t.company} className="mr-1 align-middle" />{t.top ? <b className="text-brand">#{t.top} </b> : null}{t.t}
          </button>
          {quad(t) && <span className={cn("mt-[1px] shrink-0 rounded px-1 text-[10px] font-bold", qColor[quad(t)!])}>Q{quad(t)}</span>}
        </div>))}
    </div>);
}

function Calendar({ ws, days, tasks, meetings }: { ws: string; days: string[]; tasks: Task[]; meetings: Meeting[] }) {
  const today = todayStr();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const sortT = (a: Task, b: Task) => Number(a.done) - Number(b.done) || (a.top || 9) - (b.top || 9) || (quad(a) || 5) - (quad(b) || 5);
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b">
            <div />
            {days.map((d) => { const dt = tasks.filter((t) => t.date === d); return (
              <a key={d} href="#today" onClick={() => setUI({ day: d })} className={cn("border-l px-2 py-2 hover:bg-accent/50", d === today && "bg-brand/10")}>
                <div className="flex items-baseline justify-between"><span className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", d === today && "text-brand")}>{DOW[parseYmd(d).getDay()]}</span><span className="text-[11px] text-muted-foreground num">{dt.filter((t) => t.done).length}/{dt.length}</span></div>
                <div className={cn("text-xl font-bold num", d === today && "text-brand")}>{parseYmd(d).getDate()}</div>
              </a>); })}
          </div>
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b">
            <div className="px-1 pt-2 text-right text-[10px] text-muted-foreground">Tasks</div>
            {days.map((d) => { const list = tasks.filter((t) => t.date === d).sort(sortT); const untimed = meetings.filter((m) => m.date === d && !m.start); return (
              <div key={d} className={cn("max-h-[260px] min-h-[90px] overflow-y-auto border-l p-1.5", d === today && "bg-brand/5")}>
                <DayTasks list={list} />
                {untimed.map((m) => <MeetingBlock key={m.id} m={m} className="mt-1 w-full" />)}
                <DayAdd d={d} />
              </div>); })}
          </div>
          <div className="relative grid grid-cols-[48px_repeat(7,minmax(0,1fr))]" style={{ height: (H1 - H0) * PX }}>
            <div className="relative">{[...Array(H1 - H0)].map((_, i) => <div key={i} className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground num" style={{ top: i * PX }}>{i ? minToTime((H0 + i) * 60) : ""}</div>)}</div>
            {days.map((d) => (
              <div key={d} className={cn("relative border-l", d === today && "bg-brand/5")}>
                {[...Array(H1 - H0)].map((_, i) => <button key={i} aria-label={`New meeting ${fmtDay(d)} ${H0 + i}:00`} onClick={() => setUI({ meeting: { date: d, start: minToTime((H0 + i) * 60), company: getUIcompany() || undefined } })} className="absolute inset-x-0 border-t border-border/60 hover:bg-accent/40" style={{ top: i * PX, height: PX }} />)}
                {d === today && nowMin > H0 * 60 && nowMin < H1 * 60 && <div className="pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-destructive" style={{ top: ((nowMin - H0 * 60) / 60) * PX }} />}
                {meetings.filter((m) => m.date === d && m.start).map((m) => { const s = timeToMin(m.start!)!; const top = Math.max(0, ((s - H0 * 60) / 60) * PX); const h = Math.max(22, ((m.mins || 60) / 60) * PX - 2);
                  return <MeetingBlock key={m.id} m={m} className="absolute inset-x-1 z-[5]" style={{ top, height: h }} />; })}
              </div>))}
          </div>
        </div>
      </div>
    </Card>);
}
function DayAdd({ d }: { d: string }) {
  const [on, setOn] = React.useState(false); const [v, setV] = React.useState("");
  if (!on) return <button onClick={() => setOn(true)} className="mt-1 w-full rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:bg-accent">+ task</button>;
  return <form className="mt-1" onSubmit={(e) => { e.preventDefault(); if (v.trim()) update((S) => { newTask(S, v.trim(), { date: d, company: getUIcompany() }); }); setV(""); }}>
    <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => !v && setOn(false)} onKeyDown={(e) => e.key === "Escape" && setOn(false)} placeholder="Task, then Enter" className="w-full rounded border bg-background px-1.5 py-1 text-[12px] outline-none focus:ring-1 focus:ring-ring" /></form>;
}
const getUIcompany = () => { const c = (window as any).__lpCo; return c && c !== "all" ? c : null; };

function PhoneAgenda({ days, tasks, meetings }: { days: string[]; tasks: Task[]; meetings: Meeting[] }) {
  const [d, setD] = React.useState(days.includes(todayStr()) ? todayStr() : days[0]);
  React.useEffect(() => { if (!days.includes(d)) setD(days.includes(todayStr()) ? todayStr() : days[0]); }, [days[0]]);
  const ms = meetings.filter((m) => m.date === d).sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));
  const ts = tasks.filter((t) => t.date === d).sort((a, b) => Number(a.done) - Number(b.done) || (a.top || 9) - (b.top || 9) || (quad(a) || 5) - (quad(b) || 5));
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((x) => { const n = tasks.filter((t) => t.date === x && !t.done).length + meetings.filter((m) => m.date === x).length; return (
          <button key={x} onClick={() => setD(x)} className={cn("rounded-lg border py-1.5 text-center", x === d ? "border-brand bg-brand text-black" : x === todayStr() ? "border-brand/60" : "bg-card")}>
            <div className="text-[10px] font-semibold uppercase">{DOW[parseYmd(x).getDay()]}</div><div className="text-base font-bold num">{parseYmd(x).getDate()}</div><div className={cn("mx-auto mt-0.5 h-1 w-1 rounded-full", n ? (x === d ? "bg-black" : "bg-brand") : "bg-transparent")} />
          </button>); })}
      </div>
      <Card className="mt-3"><CardContent className="p-3">
        <div className="mb-1 flex items-center justify-between"><div className="text-sm font-semibold">{fmtDay(d)}</div><Button size="xs" variant="outline" onClick={() => setUI({ meeting: { date: d } })}><Plus />Meeting</Button></div>
        {ms.map((m) => <MeetingBlock key={m.id} m={m} className="mb-1.5 w-full py-1.5 text-xs" />)}
        {ts.length ? <div className="divide-y">{ts.map((t) => <TaskRow key={t.id} t={t} />)}</div> : !ms.length && <Empty className="mt-2">Nothing planned. Give tasks a day from the tray below, or tap + Meeting.</Empty>}
      </CardContent></Card>
    </div>);
}

function Matrix({ tasks }: { tasks: Task[] }) {
  const open = tasks.filter((t) => !t.done);
  const by: Record<number, Task[]> = { 1: [], 2: [], 3: [], 4: [], 0: [] };
  open.forEach((t) => by[quad(t) || 0].push(t));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[1, 2, 3, 4].map((n) => (
        <Card key={n} className={cn("border-t-4", { 1: "border-t-q1", 2: "border-t-q2", 3: "border-t-q3", 4: "border-t-q4" }[n])}>
          <CardHeader className="pb-1"><CardTitle className="flex items-baseline gap-2 text-sm">Q{n} · {QLABEL[n]}<span className="text-xs font-normal text-muted-foreground">{QSUB[n]}</span><span className="ml-auto text-xs font-normal text-muted-foreground num">{by[n].length}</span></CardTitle></CardHeader>
          <CardContent className="divide-y pb-2">{by[n].length ? by[n].sort((a, b) => (a.date || "z").localeCompare(b.date || "z")).map((t) => <TaskRow key={t.id} t={t} hide={["fn"]} />) : <div className="py-2 text-sm text-muted-foreground">Nothing here.</div>}</CardContent>
        </Card>))}
      {by[0].length > 0 && <Card className="md:col-span-2"><CardHeader className="pb-1"><CardTitle className="text-sm">Not rated yet <span className="font-normal text-muted-foreground">tap “Rate” on each</span></CardTitle></CardHeader><CardContent className="divide-y pb-2">{by[0].map((t) => <TaskRow key={t.id} t={t} />)}</CardContent></Card>}
    </div>);
}

function Sidebar({ ws, co, tasks }: { ws: string; co: string; tasks: Task[] }) {
  const tray = tasks.filter((t) => !t.date && !t.done);
  const backlog = S.tasks.filter((t) => !t.done && !t.date && !t.week && coOk(co, t.company) && (quad(t) === 1 || quad(t) === 2)).sort((a, b) => score(b) - score(a)).slice(0, 8);
  const goals = S.work.companies.filter((c) => coOk(co, c.id)).map((c) => ({ c, g: S.work.goals[c.id]?.w?.[ws] })).filter((x) => x.g && x.g.text);
  return (
    <div className="space-y-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Week goals</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">{goals.length ? goals.map(({ c, g }) => <div key={c.id} className="flex gap-2"><CompanyDot id={c.id} className="mt-1.5" /><div><span className="font-semibold">{c.short}: </span>{g!.text}</div></div>) : <div className="text-muted-foreground">No goals set for this week. <a className="font-medium text-foreground underline" href="#companies">Set them in Companies</a></div>}</CardContent></Card>
      <Card><CardHeader className="pb-1"><CardTitle className="flex items-center text-sm">This week, no day yet<span className="ml-auto text-xs font-normal text-muted-foreground num">{tray.length}</span></CardTitle></CardHeader>
        <CardContent className="pb-3">
          {tray.length ? <div className="divide-y">{tray.map((t) => <TaskRow key={t.id} t={t} compact />)}</div> : <p className="py-1 text-sm text-muted-foreground">Tap a task's priority chip to give it a day.</p>}
          <QuickAdd className="mt-2" showPickers={false} preset={{ week: ws, company: co === "all" ? undefined : co }} placeholder="Add to this week…" />
        </CardContent></Card>
      <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Pull in from backlog <span className="font-normal text-muted-foreground">Q1 and Q2</span></CardTitle></CardHeader>
        <CardContent className="pb-3">{backlog.length ? backlog.map((t) => (
          <div key={t.id} className="flex items-start gap-2 border-b py-2 last:border-0">
            <button className="min-w-0 flex-1 text-left text-[13px] leading-snug" onClick={() => setUI({ taskSheet: t.id })}><CompanyDot id={t.company} className="mr-1.5 align-middle" />{t.t}<div className="mt-1"><QBadge q={quad(t)} /></div></button>
            <PlanPopover t={t} ws={ws}><Button size="xs" variant="outline">Plan</Button></PlanPopover>
          </div>)) : <p className="py-1 text-sm text-muted-foreground">No rated tasks waiting. Rate tasks in Companies to see the important ones here.</p>}</CardContent></Card>
    </div>);
}

export function Week() {
  useStore(); const ui = useUI();
  const ws = ui.week, co = ui.company; (window as any).__lpCo = co;
  const [mode, setMode] = React.useState<string>(() => { try { return localStorage.getItem("lp2-weekmode") || "calendar"; } catch { return "calendar"; } });
  const { days, end, tasks, meetings } = useWeekData(ws, co);
  const dated = tasks.filter((t) => t.date);
  const mins = timeEntries(S, ws, end).filter((r) => coOk(co, r.company)).reduce((n, r) => n + r.mins, 0);
  const metDone = meetings.filter((m) => m.status === "done").length;
  return (
    <div>
      <PageHead title={`Week of ${fmtDay(ws)}`} sub={ws === weekStart(todayStr()) ? "This week. Plan the days, then work from Today." : ws < weekStart(todayStr()) ? "A past week." : "Planning ahead."}>
        <CompanySelect value={co} allLabel="All companies" onChange={(v) => setUI({ company: v || "all" })} className="w-[160px]" />
        <Tabs value={mode} onValueChange={(v) => { setMode(v); try { localStorage.setItem("lp2-weekmode", v); } catch {} }}><TabsList><TabsTrigger value="calendar">Calendar</TabsTrigger><TabsTrigger value="matrix">Matrix</TabsTrigger></TabsList></Tabs>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setUI({ week: addDays(ws, -7) })} aria-label="Previous week"><ChevronLeft /></Button>
          {ws !== weekStart(todayStr()) && <Button variant="outline" onClick={() => setUI({ week: weekStart(todayStr()) })}>This week</Button>}
          <Button variant="outline" size="icon" onClick={() => setUI({ week: addDays(ws, 7) })} aria-label="Next week"><ChevronRight /></Button>
        </div>
        <Button variant="brand" onClick={() => setUI({ meeting: { company: co } })}><Plus />Meeting</Button>
      </PageHead>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Tasks done" value={`${dated.filter((t) => t.done).length + tasks.filter((t) => !t.date && t.done).length}/${tasks.length}`} />
        <MiniStat label="Q1 open" value={tasks.filter((t) => !t.done && quad(t) === 1).length} />
        <MiniStat label="Networking meetings" value={`${metDone}/${Math.max(meetings.length, S.settings.netPerWeek || 0)}`} sub={`target ${S.settings.netPerWeek || 0} a week`} />
        <MiniStat label="Time logged" value={hm(mins)} sub={<a href="#review" className="underline">where it went</a>} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {mode === "matrix" ? <Matrix tasks={tasks} /> : <>
            <div className="hidden md:block"><Calendar ws={ws} days={days} tasks={tasks} meetings={meetings} /></div>
            <div className="md:hidden"><PhoneAgenda days={days} tasks={tasks} meetings={meetings} /></div>
          </>}
        </div>
        <Sidebar ws={ws} co={co} tasks={tasks} />
      </div>
    </div>);
}
function MiniStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return <div className="rounded-xl border bg-card px-4 py-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold num">{value}</div>{sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}</div>;
}
