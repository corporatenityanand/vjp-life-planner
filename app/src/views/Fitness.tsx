import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { Exercise, MUSCLES, Routine, Workout, WEx, e1rm, exById, lastFor, volume, doneSets } from "@/lib/model";
import { addDays, fmtDay, hm, pad, todayStr, uid, weekStart, ymd, parseYmd, MON } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, PageHead, Stat } from "@/components/bits";
import { ExDetailHost, LibraryTab, openExDetail } from "./ExLibrary";
import { WorkoutBuilder, BItem } from "./Builder";
import { BookOpen, Info, Check, ChevronDown, ChevronUp, Dumbbell, MoreHorizontal, Pencil, Play, Plus, Search, Timer, Trash2, Trophy, X } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ReferenceLine } from "recharts";

const useTick = (ms = 1000) => { const [, f] = React.useState(0); React.useEffect(() => { const i = setInterval(() => f((x) => x + 1), ms); return () => clearInterval(i); }, [ms]); };
const kg = (n?: number | null) => (n == null ? "" : String(+n.toFixed(2)));
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };

/* ---------- rest timer ---------- */
let REST: { until: number; total: number } | null = null; const restSubs = new Set<() => void>();
const setRest = (r: typeof REST) => { REST = r; restSubs.forEach((f) => f()); };
let AC: AudioContext | null = null;
const audio = () => { try { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch {} };
const beep = () => { try { if (!AC) return; for (let i = 0; i < 2; i++) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 990; o.connect(g); g.connect(AC.destination); const t = AC.currentTime + i * 0.3; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.start(t); o.stop(t + 0.26); } navigator.vibrate?.(200); } catch {} };
function RestBar() {
  React.useSyncExternalStore((cb) => { restSubs.add(cb); return () => restSubs.delete(cb); }, () => REST);
  useTick(250);
  React.useEffect(() => { if (REST && REST.until <= Date.now()) { beep(); setRest(null); } });
  if (!REST) return null; const left = REST.until - Date.now();
  return (
    <div className="fixed inset-x-3 bottom-[76px] z-40 mx-auto max-w-md rounded-xl border bg-foreground p-3 text-background shadow-xl sm:bottom-6">
      <div className="flex items-center gap-3"><Timer className="h-5 w-5" /><div className="flex-1"><div className="text-xs opacity-70">Rest</div><div className="font-mono text-2xl font-bold num">{clock(left)}</div></div>
        <Button size="sm" variant="secondary" onClick={() => setRest({ ...REST!, until: REST!.until - 15000 })}>−15s</Button><Button size="sm" variant="secondary" onClick={() => setRest({ ...REST!, until: REST!.until + 15000 })}>+15s</Button><Button size="sm" variant="secondary" onClick={() => setRest(null)}>Skip</Button></div>
      <div className="mt-2 h-1 overflow-hidden rounded bg-background/20"><div className="h-full bg-brand" style={{ width: `${(left / (REST.total * 1000)) * 100}%` }} /></div>
    </div>);
}

/* ---------- exercise picker ---------- */
/* ---------- live workout ---------- */
function ExerciseBlock({ w, e, idx }: { w: Workout; e: WEx; idx: number }) {
  const x = exById(S, e.ex); const last = lastFor(S, e.ex, w.start);
  const kind = x?.kind || "weight";
  const best = Math.max(0, ...S.workouts.filter((o) => o.end && o.start < w.start).flatMap((o) => o.ex.filter((y) => y.ex === e.ex).flatMap((y) => y.sets.filter((s) => s.done && !s.warm).map((s) => e1rm(s.w, s.r)))));
  const set = (i: number, p: any) => update(() => Object.assign(e.sets[i], p));
  const toggle = (i: number) => {
    audio();
    update(() => { const s = e.sets[i]; const prev = last?.sets[i] || last?.sets[last.sets.length - 1];
      if (!s.done) { if (s.w == null && prev?.w != null) s.w = prev.w; if (s.r == null && prev?.r != null) s.r = prev.r; if (kind === "weight" && s.w == null && i > 0) s.w = e.sets[i - 1].w; if (s.r == null && i > 0) s.r = e.sets[i - 1].r; }
      s.done = !s.done; });
    const s = e.sets[i];
    if (s.done) { setRest({ until: Date.now() + (S.gym.rest || 90) * 1000, total: S.gym.rest || 90 }); if (best && e1rm(s.w, s.r) > best + 0.01) toast(`New best on ${x?.name}: ${kg(s.w)} kg × ${s.r}`); }
  };
  return (
    <Card>
      <CardHeader className="flex-row items-start space-y-0 pb-2">
        <div className="mr-auto min-w-0"><CardTitle className="text-base text-brand">{x?.lib ? <button className="text-left hover:underline" onClick={() => openExDetail(x.lib!)}>{x.name}<Info className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] opacity-60" /></button> : x?.name || "Exercise"}</CardTitle><CardDescription>{x?.muscle}{e.target ? ` · target ${e.target}` : ""}{last ? ` · last ${fmtDay(last.w.start.slice(0, 10))}` : ""}</CardDescription></div>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={idx === 0} onSelect={() => update(() => { const a = w.ex; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; })}><ChevronUp />Move up</DropdownMenuItem>
            <DropdownMenuItem disabled={idx === w.ex.length - 1} onSelect={() => update(() => { const a = w.ex; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; })}><ChevronDown />Move down</DropdownMenuItem>
            <DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={() => update(() => w.ex.splice(idx, 1))}><Trash2 />Remove exercise</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-x-2 gap-y-1.5 text-sm">
          <div className="text-[11px] font-semibold text-muted-foreground">SET</div><div className="text-[11px] font-semibold text-muted-foreground">PREVIOUS</div>
          <div className="text-center text-[11px] font-semibold text-muted-foreground">{kind === "time" ? "" : kind === "bw" ? "+KG" : "KG"}</div><div className="text-center text-[11px] font-semibold text-muted-foreground">{kind === "time" ? "SEC" : "REPS"}</div><div />
          {e.sets.map((s, i) => { const p = last?.sets[i]; return (
            <React.Fragment key={i}>
              <button onClick={() => set(i, { warm: !s.warm })} title="Tap to mark as warm-up" className={cn("h-8 rounded-md text-center text-sm font-bold num", s.warm ? "text-q2" : "", s.done ? "bg-emerald-600/15" : "bg-muted")}>{s.warm ? "W" : e.sets.slice(0, i + 1).filter((y) => !y.warm).length}</button>
              <div className="truncate text-xs text-muted-foreground num">{p ? (kind === "time" ? `${p.r}s` : `${kg(p.w) || "BW"}${p.w || kind !== "bw" ? " kg" : ""} × ${p.r}`) : "—"}</div>
              {kind === "time" ? <div /> : <Input inputMode="decimal" type="number" step="any" value={s.w ?? ""} placeholder={p?.w != null ? kg(p.w) : ""} onChange={(ev) => set(i, { w: ev.target.value === "" ? null : +ev.target.value })} className={cn("h-8 px-1 text-center num", s.done && "border-emerald-600/40 bg-emerald-600/10")} />}
              <Input inputMode="numeric" type="number" value={s.r ?? ""} placeholder={p?.r != null ? String(p.r) : ""} onChange={(ev) => set(i, { r: ev.target.value === "" ? null : +ev.target.value })} className={cn("h-8 px-1 text-center num", s.done && "border-emerald-600/40 bg-emerald-600/10")} />
              <button onClick={() => toggle(i)} aria-label="Set done" className={cn("grid h-8 w-10 place-items-center rounded-md border", s.done ? "border-emerald-600 bg-emerald-600 text-white" : "text-muted-foreground hover:bg-accent")}><Check className="h-4 w-4" strokeWidth={3} /></button>
            </React.Fragment>); })}
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => update(() => e.sets.push({}))}><Plus />Add set</Button>
          {e.sets.length > 0 && <Button variant="ghost" size="sm" onClick={() => update(() => e.sets.pop())}>Remove last</Button>}
        </div>
      </CardContent>
    </Card>);
}

function ActiveWorkout({ w }: { w: Workout }) {
  useTick();
  const [pick, setPick] = React.useState(false);
  const finish = () => {
    const n = doneSets(w);
    if (!n && !confirm("No sets are ticked. Finish anyway?")) return;
    update((S) => { const done: Workout = { ...w, end: new Date().toISOString(), ex: w.ex.filter((e) => e.sets.some((s) => s.done)).map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })) }; S.workouts.push(done); S.gym.active = null; });
    setRest(null); toast(`Workout saved: ${n} sets, ${Math.round(volume(w)).toLocaleString("en-IN")} kg moved.`);
  };
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Card className="sticky top-[60px] z-20 border-brand/50 bg-card/95 backdrop-blur">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1"><Input value={w.name} onChange={(e) => update(() => (w.name = e.target.value))} className="h-8 border-0 px-0 text-lg font-bold shadow-none focus-visible:ring-0" />
            <div className="flex gap-3 text-xs text-muted-foreground num"><span>{clock(Date.now() - new Date(w.start).getTime())}</span><span>{doneSets(w)} sets</span><span>{Math.round(volume(w)).toLocaleString("en-IN")} kg</span></div></div>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("Discard this workout? Nothing will be saved.")) { update((S) => (S.gym.active = null)); setRest(null); } }}>Discard</Button>
          <Button variant="brand" onClick={finish}><Check />Finish</Button>
        </CardContent>
      </Card>
      {w.ex.map((e, i) => <ExerciseBlock key={e.id} w={w} e={e} idx={i} />)}
      {!w.ex.length && <Empty>Add your first exercise.</Empty>}
      <Button variant="outline" className="w-full" size="lg" onClick={() => setPick(true)}><Plus />Add exercise</Button>
      <div className="flex items-center justify-center gap-2 pb-4 text-sm text-muted-foreground">Rest timer<Select value={String(S.gym.rest || 90)} onValueChange={(v) => update((S) => (S.gym.rest = +v))}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent>{[45, 60, 90, 120, 150, 180, 240].map((s) => <SelectItem key={s} value={String(s)}>{clock(s * 1000)}</SelectItem>)}</SelectContent></Select></div>
      <WorkoutBuilder open={pick} onClose={() => setPick(false)} title="Add exercises" existing={w.ex.map((e) => ({ ex: e.ex, sets: e.sets.length }))}
        actions={[{ label: "Add to workout", brand: true, fn: (items) => update(() => items.forEach((it) => w.ex.push({ id: uid(), ex: it.ex, target: `${it.sets}×${it.reps}`, sets: Array.from({ length: it.sets }, () => ({})) }))) }]} />
    </div>);
}

function startWorkout(r?: Routine) {
  audio();
  update((S) => {
    S.gym.active = { id: "w-" + uid(), start: new Date().toISOString(), name: r ? r.name : `Workout ${fmtDay(todayStr())}`, routine: r?.id || null,
      ex: (r?.items || []).filter((it) => exById(S, it.ex)).map((it) => ({ id: uid(), ex: it.ex, target: `${it.sets}×${it.reps}`, sets: Array.from({ length: it.sets }, () => ({})) })) };
  });
  window.scrollTo(0, 0);
}

function RoutineEditor({ r, onClose }: { r: Routine | null; onClose: () => void }) {
  useStore();
  const [d, setD] = React.useState<Routine | null>(null); const [pick, setPick] = React.useState(false);
  React.useEffect(() => setD(r ? JSON.parse(JSON.stringify(r)) : null), [r]);
  if (!d) return null;
  const exists = S.gym.routines.some((x) => x.id === d.id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{exists ? "Edit routine" : "New routine"}</DialogTitle><DialogDescription>Exercises in order, with the sets and reps you aim for.</DialogDescription></DialogHeader>
        <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Routine name, e.g. Upper A" className="text-base font-semibold" />
        <div className="divide-y rounded-md border">
          {d.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2">
              <div className="flex flex-col"><button disabled={!i} onClick={() => { const a = [...d.items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setD({ ...d, items: a }); }} className="text-muted-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button><button disabled={i === d.items.length - 1} onClick={() => { const a = [...d.items]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setD({ ...d, items: a }); }} className="text-muted-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button></div>
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{exById(S, it.ex)?.name || "?"}</div>
              <Input type="number" min={1} value={it.sets} onChange={(e) => { const a = [...d.items]; a[i] = { ...it, sets: Math.max(1, +e.target.value || 1) }; setD({ ...d, items: a }); }} className="h-8 w-14 px-1 text-center" aria-label="Sets" /><span className="text-xs text-muted-foreground">×</span>
              <Input value={it.reps} onChange={(e) => { const a = [...d.items]; a[i] = { ...it, reps: e.target.value }; setD({ ...d, items: a }); }} className="h-8 w-16 px-1 text-center" aria-label="Reps" />
              <Button variant="ghost" size="icon-sm" onClick={() => setD({ ...d, items: d.items.filter((_, j) => j !== i) })}><X /></Button>
            </div>))}
          {!d.items.length && <div className="p-3 text-sm text-muted-foreground">No exercises yet.</div>}
        </div>
        <Button variant="outline" onClick={() => setPick(true)}><Plus />Add exercise</Button>
        <DialogFooter>
          {exists && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (confirm(`Delete routine “${d.name}”?`)) { update((S) => (S.gym.routines = S.gym.routines.filter((x) => x.id !== d.id))); onClose(); } }}>Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={() => { if (!d.name.trim()) return toast("Give the routine a name."); update((S) => { const i = S.gym.routines.findIndex((x) => x.id === d.id); if (i >= 0) S.gym.routines[i] = d; else S.gym.routines.push(d); }); onClose(); }}>Save routine</Button>
        </DialogFooter>
        <WorkoutBuilder open={pick} onClose={() => setPick(false)} title={`Add to ${d.name || "routine"}`} existing={d.items}
          actions={[{ label: "Add to routine", brand: true, fn: (items) => setD((x) => x && { ...x, items: [...x.items, ...items] }) }]} />
      </DialogContent>
    </Dialog>);
}

function WorkoutHome() {
  useStore();
  const [edit, setEdit] = React.useState<Routine | null>(null); const [build, setBuild] = React.useState(false);
  const ws = weekStart(todayStr()), we = addDays(ws, 6);
  const week = S.workouts.filter((w) => w.end && w.start.slice(0, 10) >= ws && w.start.slice(0, 10) <= we);
  const target = +(S.goals.fitness?.weekly?.strength || 4);
  const lastOf = (r: Routine) => S.workouts.filter((w) => w.routine === r.id && w.end).sort((a, b) => b.start.localeCompare(a.start))[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Workouts this week" value={`${week.length}/${target}`} sub={<Progress value={(week.length / Math.max(1, target)) * 100} className="mt-1.5 h-1.5" indicatorClassName="bg-fit" />} />
        <Stat label="Sets this week" value={week.reduce((n, w) => n + doneSets(w), 0)} />
        <Stat label="Volume this week" value={`${Math.round(week.reduce((n, w) => n + volume(w), 0)).toLocaleString("en-IN")} kg`} />
        <Stat label="All-time workouts" value={S.workouts.filter((w) => w.end).length} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row"><Button size="lg" variant="brand" onClick={() => setBuild(true)}><Plus />Build a workout</Button><Button size="lg" variant="outline" onClick={() => startWorkout()}><Play />Start an empty workout</Button></div>
      <WorkoutBuilder open={build} onClose={() => setBuild(false)} title="Build a workout" askName defaultName={`Workout ${fmtDay(todayStr())}`}
        actions={[{ label: "Save as routine", fn: (items, name) => { update((S) => S.gym.routines.push({ id: "r-" + uid(), name, items })); toast(`Saved routine “${name}”.`); } },
          { label: "Start workout", brand: true, fn: (items, name) => startWorkout({ id: "", name, items }) }]} />
      <div className="flex items-center"><h2 className="mr-auto text-lg font-semibold">Routines</h2><Button variant="outline" size="sm" onClick={() => setEdit({ id: "r-" + uid(), name: "", items: [] })}><Plus />New routine</Button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {S.gym.routines.map((r) => { const l = lastOf(r); return (
          <Card key={r.id}><CardHeader className="flex-row items-start space-y-0 pb-2"><div className="mr-auto"><CardTitle className="text-base">{r.name}</CardTitle><CardDescription>{l ? `Last done ${fmtDay(l.start.slice(0, 10))}` : "Not done yet"}</CardDescription></div><Button variant="ghost" size="icon-sm" onClick={() => setEdit(r)}><Pencil /></Button></CardHeader>
            <CardContent className="space-y-3"><div className="text-sm text-muted-foreground">{r.items.map((it) => `${exById(S, it.ex)?.name || "?"} ${it.sets}×${it.reps}`).join(" · ")}</div><Button className="w-full" onClick={() => startWorkout(r)}><Play />Start {r.name}</Button></CardContent></Card>); })}
      </div>
      <RoutineEditor r={edit} onClose={() => setEdit(null)} />
    </div>);
}

/* ---------- progress ---------- */
function ProgressTab() {
  useStore();
  const counts: Record<string, number> = {}; S.workouts.forEach((w) => w.end && w.ex.forEach((e) => (counts[e.ex] = (counts[e.ex] || 0) + 1)));
  const trained = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const [ex, setEx] = React.useState(trained[0] || "");
  React.useEffect(() => { if (!ex && trained[0]) setEx(trained[0]); }, [trained.length]);
  if (!trained.length) return <Empty>Finish a workout to see progress per exercise: estimated one-rep max, best sets and volume over time.</Empty>;
  const x = exById(S, ex);
  const rows = S.workouts.filter((w) => w.end && w.ex.some((e) => e.ex === ex)).sort((a, b) => a.start.localeCompare(b.start)).map((w) => {
    const sets = w.ex.filter((e) => e.ex === ex).flatMap((e) => e.sets.filter((s) => s.done && !s.warm));
    const top = sets.reduce((b, s) => (e1rm(s.w, s.r) > e1rm(b?.w, b?.r) ? s : b), sets[0]);
    return { d: w.start.slice(0, 10), label: `${parseYmd(w.start.slice(0, 10)).getDate()} ${MON[parseYmd(w.start.slice(0, 10)).getMonth()]}`, e1rm: Math.round(Math.max(...sets.map((s) => e1rm(s.w, s.r)), 0) * 10) / 10, top: Math.max(...sets.map((s) => s.w || 0), 0), reps: Math.max(...sets.map((s) => s.r || 0), 0), vol: Math.round(sets.reduce((n, s) => n + (s.w || 0) * (s.r || 0), 0)), sets: sets.length, best: top };
  });
  const kind = x?.kind || "weight";
  const metric = kind === "weight" ? "e1rm" : "reps";
  const pr = rows.reduce((b, r) => ((r as any)[metric] > (b as any)[metric] ? r : b), rows[0]);
  const muscles: Record<string, number> = {}; const since = addDays(todayStr(), -27);
  S.workouts.filter((w) => w.end && w.start.slice(0, 10) >= since).forEach((w) => w.ex.forEach((e) => { const m = exById(S, e.ex)?.muscle || "Other"; muscles[m] = (muscles[m] || 0) + e.sets.filter((s) => s.done && !s.warm).length; }));
  const mrows = MUSCLES.map((m) => ({ m, sets: Math.round(((muscles[m] || 0) / 4) * 10) / 10 }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><Select value={ex} onValueChange={setEx}><SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger><SelectContent>{trained.map((id) => <SelectItem key={id} value={id}>{exById(S, id)?.name} ({counts[id]})</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kind === "weight" ? <Stat label="Best estimated 1RM" value={`${pr.e1rm} kg`} sub={fmtDay(pr.d)} /> : <Stat label="Most reps in a set" value={pr.reps} sub={fmtDay(pr.d)} />}
        <Stat label="Heaviest set" value={`${kg(Math.max(...rows.map((r) => r.top)))} kg`} />
        <Stat label="Best session volume" value={`${Math.max(...rows.map((r) => r.vol)).toLocaleString("en-IN")} kg`} />
        <Stat label="Sessions" value={rows.length} />
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">{kind === "weight" ? "Estimated one-rep max" : "Best reps"} · {x?.name}</CardTitle><CardDescription>{kind === "weight" ? "Your best set each session, converted to a one-rep max (Epley). Going up means you're getting stronger." : "Best set each session."}</CardDescription></CardHeader>
        <CardContent className="h-[260px] pl-0">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ left: 0, right: 12, top: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis width={40} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} /><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey={metric} name={kind === "weight" ? "e1RM (kg)" : "reps"} stroke="hsl(var(--fit))" strokeWidth={2.5} dot={{ r: 3 }} />{kind === "weight" && <Line type="monotone" dataKey="top" name="heaviest (kg)" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />}</LineChart></ResponsiveContainer>
        </CardContent></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Recent sessions</CardTitle></CardHeader><CardContent><div className="divide-y text-sm">{rows.slice().reverse().slice(0, 10).map((r) => <div key={r.d + r.vol} className="flex gap-3 py-1.5"><span className="w-24 text-muted-foreground">{fmtDay(r.d)}</span><span className="flex-1 num">{r.sets} sets · best {kg(r.best?.w) || "BW"}{r.best?.w ? " kg" : ""} × {r.best?.r}</span>{r === pr && <Trophy className="h-4 w-4 text-brand" />}</div>)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Weekly sets per muscle</CardTitle><CardDescription>Average over the last 4 weeks. 10 to 20 hard sets a week is a common growth range.</CardDescription></CardHeader>
          <CardContent className="h-[220px] pl-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={mrows} margin={{ left: 0, right: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="m" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} /><YAxis width={30} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><ReferenceLine y={10} stroke="hsl(var(--fin))" strokeDasharray="4 4" /><Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="sets" fill="hsl(var(--fit))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>);
}

/* ---------- history ---------- */
function HistoryTab() {
  useStore(); const [open, setOpen] = React.useState<Workout | null>(null);
  const list = S.workouts.filter((w) => w.end).sort((a, b) => b.start.localeCompare(a.start));
  if (!list.length) return <Empty>No workouts yet. Start one from the Workout tab.</Empty>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {list.map((w) => { const mins = Math.round((new Date(w.end!).getTime() - new Date(w.start).getTime()) / 60000); return (
        <Card key={w.id} className="cursor-pointer hover:border-foreground/30" onClick={() => setOpen(w)}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{w.name}</CardTitle><CardDescription>{fmtDay(w.start.slice(0, 10))} · {new Date(w.start).toTimeString().slice(0, 5)} · {hm(mins)}</CardDescription></CardHeader>
          <CardContent className="space-y-1 text-sm">{w.ex.map((e) => <div key={e.id} className="flex gap-2"><span className="min-w-0 flex-1 truncate">{e.sets.length} × {exById(S, e.ex)?.name}</span><span className="text-muted-foreground num">{(() => { const b = e.sets.reduce((x, s) => (e1rm(s.w, s.r) >= e1rm(x?.w, x?.r) ? s : x), e.sets[0]); return b ? `${kg(b.w) || "BW"}${b.w ? "" : ""} × ${b.r}` : ""; })()}</span></div>)}
            <div className="pt-1 text-xs text-muted-foreground num">{Math.round(volume(w)).toLocaleString("en-IN")} kg volume</div></CardContent>
        </Card>); })}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>{open && <>
          <DialogHeader><DialogTitle>{open.name}</DialogTitle><DialogDescription>{fmtDay(open.start.slice(0, 10))}</DialogDescription></DialogHeader>
          <div className="max-h-[60dvh] space-y-3 overflow-y-auto">{open.ex.map((e) => <div key={e.id}><div className="text-sm font-semibold">{exById(S, e.ex)?.name}</div><div className="mt-1 flex flex-wrap gap-1.5">{e.sets.map((s, i) => <Badge key={i} variant="secondary" className="num">{s.warm ? "W " : ""}{kg(s.w) || "BW"} × {s.r}</Badge>)}</div></div>)}</div>
          <DialogFooter><Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (confirm("Delete this workout?")) { update((S) => (S.workouts = S.workouts.filter((x) => x.id !== open.id))); setOpen(null); } }}>Delete</Button><Button onClick={() => setOpen(null)}>Close</Button></DialogFooter></>}
        </DialogContent>
      </Dialog>
    </div>);
}

/* ---------- body ---------- */
const FIT_TYPES: [string, string][] = [["strength", "Strength"], ["cardio", "Cardio"], ["mobility", "Mobility"], ["swim", "Swim"], ["surf", "Surf"], ["mma", "MMA"]];
function BodyTab() {
  useStore();
  const F = S.goals.fitness; const body = [...S.fitlog.body].sort((a: any, b: any) => (a.date < b.date ? -1 : 1)); const last = body[body.length - 1];
  const [d, setD] = React.useState(todayStr()); const [w, setW] = React.useState(""); const [l, setL] = React.useState("");
  const ws = weekStart(todayStr()), we = addDays(ws, 6);
  const sess = S.fitlog.sessions.filter((s: any) => s.date >= ws && s.date <= we);
  const gymN = S.workouts.filter((x) => x.end && x.start.slice(0, 10) >= ws && x.start.slice(0, 10) <= we).length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Body</CardTitle><CardDescription>Target {F.targetKg} kg at {F.targetLean}% lean mass.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6"><div><div className="text-xs text-muted-foreground">Weight</div><div className="text-3xl font-bold num">{last ? last.kg : "–"}<span className="text-sm font-normal text-muted-foreground"> / {F.targetKg} kg</span></div></div><div><div className="text-xs text-muted-foreground">Lean mass</div><div className="text-3xl font-bold num">{last?.lean ? last.lean + "%" : "–"}<span className="text-sm font-normal text-muted-foreground"> / {F.targetLean}%</span></div></div></div>
          {body.length > 1 ? <div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={body.map((b: any) => ({ ...b, label: fmtDay(b.date) }))} margin={{ left: 0, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><YAxis width={36} domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><ReferenceLine y={F.targetKg} stroke="hsl(var(--fit))" strokeDasharray="4 4" /><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} /><Line dataKey="kg" stroke="hsl(var(--fit))" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">Log your weight a few times to see the trend.</p>}
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!+w) return toast("Enter your weight in kg."); update((S) => { S.fitlog.body = S.fitlog.body.filter((b: any) => b.date !== d); S.fitlog.body.push({ id: uid(), date: d || todayStr(), kg: +w, lean: +l || null }); }); setW(""); setL(""); toast("Logged."); }}>
            <Input type="date" value={d} onChange={(e) => setD(e.target.value)} className="w-auto" /><Input inputMode="decimal" type="number" step="0.1" value={w} onChange={(e) => setW(e.target.value)} placeholder="kg" className="w-24" /><Input inputMode="decimal" type="number" step="0.1" value={l} onChange={(e) => setL(e.target.value)} placeholder="lean %" className="w-24" /><Button type="submit" variant="outline">Log</Button>
          </form>
          <p className="text-xs text-muted-foreground">Face and body progress photos come next. They'll be stored in your Google Drive.</p>
        </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-base">This week's sessions</CardTitle><CardDescription>Gym workouts count as strength automatically. Tap + to log the rest.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">{FIT_TYPES.map(([k, lab]) => { const n = sess.filter((s: any) => s.type === k).length + (k === "strength" ? gymN : 0), tg = +F.weekly[k] || 0; return (
            <div key={k} className={cn("rounded-lg border p-2.5", tg && n >= tg && "border-transparent bg-emerald-600/15")}><div className="flex items-center text-xs">{lab}<button className="ml-auto rounded px-1.5 text-base leading-none hover:bg-accent" onClick={() => update((S) => S.fitlog.sessions.push({ id: uid(), date: todayStr(), type: k }))} title={`Log a ${lab} session`}>+</button></div><div className="font-mono text-lg font-bold num">{n}<span className="text-muted-foreground">/{tg}</span></div></div>); })}</div>
          <details><summary className="cursor-pointer text-sm text-muted-foreground">Weekly targets</summary><div className="mt-2 flex flex-wrap gap-2">{FIT_TYPES.map(([k, lab]) => <label key={k} className="flex items-center gap-1.5 text-xs">{lab}<Input type="number" min={0} className="h-8 w-14" defaultValue={+F.weekly[k] || 0} onBlur={(e) => update((S) => (S.goals.fitness.weekly[k] = +e.target.value || 0))} /></label>)}</div></details>
          <div><div className="mb-2 text-sm font-semibold">Skills to learn</div>
            {(F.skills || []).map((sk: any, i: number) => { const done = (sk.steps || []).filter((x: any) => x.d).length, all = (sk.steps || []).length; return (
              <details key={i} className="border-t py-2"><summary className="flex cursor-pointer items-center gap-2 text-sm"><b>{sk.name}</b><span className="text-xs text-muted-foreground num">{done}/{all}</span><Progress value={all ? (done / all) * 100 : 0} className="ml-auto h-1.5 w-24" indicatorClassName="bg-fit" /></summary>
                <div className="mt-2 space-y-1.5">{(sk.steps || []).map((st: any, j: number) => <label key={j} className="flex items-center gap-2 text-sm"><Checkbox checked={!!st.d} onCheckedChange={(v) => update(() => (st.d = !!v))} /><span className={cn(st.d && "text-muted-foreground line-through")}>{st.t}</span></label>)}</div></details>); })}</div>
        </CardContent></Card>
    </div>);
}

export function Fitness() {
  useStore();
  const [tab, setTab] = React.useState(() => { try { return localStorage.getItem("lp2-fittab") || "workout"; } catch { return "workout"; } });
  const active = S.gym.active;
  React.useEffect(() => { const f = () => setTab("workout"); window.addEventListener("lp-fittab", f); return () => window.removeEventListener("lp-fittab", f); }, []);
  return (
    <div>
      <PageHead title="Fitness" sub="Train, log every set, watch the numbers go up." />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); try { localStorage.setItem("lp2-fittab", v); } catch {} }}>
        <TabsList className="mb-1 grid w-full grid-cols-5 sm:inline-flex sm:w-auto"><TabsTrigger className="px-1 sm:px-3" value="workout">{active ? <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> : null}Workout</TabsTrigger><TabsTrigger className="px-1 sm:px-3" value="library"><BookOpen className="hidden h-3.5 w-3.5 sm:block" />Library</TabsTrigger><TabsTrigger className="px-1 sm:px-3" value="progress">Progress</TabsTrigger><TabsTrigger className="px-1 sm:px-3" value="history">History</TabsTrigger><TabsTrigger className="px-1 sm:px-3" value="body">Body</TabsTrigger></TabsList>
        <TabsContent value="workout">{active ? <ActiveWorkout w={active} /> : <WorkoutHome />}</TabsContent>
        <TabsContent value="library"><LibraryTab /></TabsContent>
        <TabsContent value="progress"><ProgressTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
        <TabsContent value="body"><BodyTab /></TabsContent>
      </Tabs>
      <RestBar />
      <ExDetailHost />
    </div>);
}
