import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { BREAKS, findTask, newTask, quad, setDone, tasksOn, companyName } from "@/lib/model";
import { hm, mmss, todayStr, uid, weekStart } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyBadge, FnBadge, PageHead } from "@/components/bits";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type TMS = { mode: "work" | "short" | "long"; running: boolean; endsAt: number; left: number | null; count: number; taskId: string | null; step: string; breakPrompt: string | null };
const KEY = "lp-timer";
let TM: TMS = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } })() || { mode: "work", running: false, endsAt: 0, left: null, count: 0, taskId: null, step: "", breakPrompt: null };
const subs = new Set<() => void>(); let ver = 0;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(TM)); } catch {} ver++; subs.forEach((f) => f()); };
const useTM = () => { React.useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => ver); return TM; };
const modeMins = (m: string) => +(m === "work" ? S.settings.work : m === "short" ? S.settings.short : S.settings.long) || 25;
const left = () => (TM.running ? Math.max(0, TM.endsAt - Date.now()) : TM.left != null ? TM.left : modeMins(TM.mode) * 60000);
let AC: AudioContext | null = null;
const ensureAudio = () => { try { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch {} };
function beep(n: number) { if (!S.settings.sound || !AC) return; try { for (let i = 0; i < n; i++) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 880; o.connect(g); g.connect(AC.destination); const t = AC.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.start(t); o.stop(t + 0.3); } } catch {} }
let wake: any = null;
const grabWake = async () => { try { if ((navigator as any).wakeLock && !wake) { wake = await (navigator as any).wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); } } catch { wake = null; } };
const start = () => { ensureAudio(); const l = left(); TM.running = true; TM.endsAt = Date.now() + l; TM.left = null; TM.breakPrompt = null; save(); if (TM.mode === "work") grabWake(); };
const pause = () => { TM.left = left(); TM.running = false; save(); };
const reset = (m?: TMS["mode"]) => { TM.mode = m || TM.mode; TM.running = false; TM.left = null; save(); };
function finish(skipped: boolean) {
  const was = TM.mode; TM.running = false; TM.left = null;
  if (was === "work") {
    if (!skipped) { const t = findTask(S, TM.taskId); update((S) => S.focus.push({ id: uid(), at: new Date().toISOString(), mins: +S.settings.work, taskId: TM.taskId || null, p: t ? t.p : "oth", label: t ? t.t : "Unlinked focus", company: t?.company || null, fn: t?.fn || null, kind: "focus" })); TM.count++; }
    TM.mode = TM.count % (+S.settings.every || 4) === 0 ? "long" : "short";
    TM.breakPrompt = BREAKS[Math.floor(Math.random() * BREAKS.length)];
    if (!skipped) { beep(3); toast("Focus block done. Take your break."); }
  } else { TM.mode = "work"; TM.breakPrompt = null; if (!skipped) { beep(2); toast("Break over. Back to it."); } }
  save();
}
setInterval(() => { if (TM.running && TM.endsAt <= Date.now()) finish(false); else if (TM.running) { ver++; subs.forEach((f) => f()); } document.title = TM.running ? `${mmss(left())} · ${TM.mode === "work" ? "Focus" : "Break"}` : "VJP Life Planner"; }, 1000);

export function MiniTimer() {
  const tm = useTM();
  if (!tm.running && tm.left == null) return null;
  if (location.hash === "#focus") return null;
  return <a href="#focus" className={cn("rounded-full border px-2.5 py-0.5 font-mono text-xs", tm.mode === "work" ? "border-brand text-brand" : "")}>{tm.running ? "" : "⏸ "}{tm.mode === "work" ? "Focus " : "Break "}{mmss(left())}</a>;
}

export function Focus() {
  useStore(); const tm = useTM();
  React.useEffect(() => { try { const id = localStorage.getItem("lp2-focus-task"); if (id) { localStorage.removeItem("lp2-focus-task"); TM.taskId = id; if (TM.mode !== "work" && !TM.running) { TM.mode = "work"; TM.left = null; } save(); } } catch {} }, []);
  const l = left(), tot = modeMins(tm.mode) * 60000, frac = 1 - l / tot, C = 2 * Math.PI * 46;
  const d = todayStr();
  const todays = tasksOn(S, d).filter((t) => !t.done).sort((a, b) => (a.top || 9) - (b.top || 9) || (quad(a) || 5) - (quad(b) || 5));
  const t = findTask(S, tm.taskId);
  const sess = S.focus.filter((f) => f.at.slice(0, 10) === d);
  const every = +S.settings.every || 4, inSet = tm.count % every;
  const [park, setPark] = React.useState("");
  return (
    <div>
      <PageHead title="Focus" sub={`${S.settings.work} minutes on one thing, then a real break. Every block counts toward where your time went.`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="min-w-0"><CardContent className="pt-5">
          <div className="flex justify-center"><Tabs value={tm.mode} onValueChange={(v) => { if (TM.running) { toast("Pause or finish the current timer first."); return; } reset(v as any); }}><TabsList><TabsTrigger value="work">Focus</TabsTrigger><TabsTrigger value="short">Short break</TabsTrigger><TabsTrigger value="long">Long break</TabsTrigger></TabsList></Tabs></div>
          <div className="relative mx-auto my-4 aspect-square w-[min(300px,78vw)]">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r="46" fill="none" className="stroke-muted" strokeWidth="5" /><circle cx="50" cy="50" r="46" fill="none" stroke={tm.mode === "work" ? "hsl(var(--brand))" : "hsl(var(--fin))"} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} /></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tm.mode === "work" ? "Focus" : tm.mode === "short" ? "Short break" : "Long break"}</span><span className="font-mono text-6xl font-bold tracking-tight num">{mmss(l)}</span><div className="flex gap-1.5">{[...Array(every)].map((_, i) => <i key={i} className={cn("h-2.5 w-2.5 rounded-full border-2 border-brand", i < inSet && "bg-brand")} />)}</div></div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {tm.running ? <Button size="lg" variant="outline" onClick={pause}><Pause />Pause</Button> : <Button size="lg" variant="brand" onClick={start}><Play />{tm.left != null ? "Resume" : "Start"}</Button>}
            <Button size="lg" variant="outline" onClick={() => reset()}><RotateCcw />Reset</Button>
            <Button size="lg" variant="ghost" onClick={() => finish(true)}><SkipForward />Skip</Button>
          </div>
          {tm.breakPrompt && tm.mode !== "work" && <div className="mt-4 rounded-lg border-2 border-fin bg-fin/10 p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Break prompt</div><div className="text-lg font-semibold">{tm.breakPrompt}</div><div className="text-xs text-muted-foreground">Stay off the phone.</div></div>}
          <div className="mt-5 space-y-3">
            <div className="space-y-1.5"><Label>Working on</Label>
              <Select value={tm.taskId || "__none"} onValueChange={(v) => { TM.taskId = v === "__none" ? null : v; save(); }}>
                <SelectTrigger className="min-w-0"><SelectValue placeholder="Pick a task (Top 3 first)" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">Not linked to a task</SelectItem>{todays.map((x) => <SelectItem key={x.id} value={x.id}>{x.top ? `#${x.top} ` : ""}{x.t.slice(0, 70)}</SelectItem>)}{t && !todays.includes(t) && <SelectItem value={t.id}>{t.t.slice(0, 70)}</SelectItem>}</SelectContent>
              </Select>
              {t && <div className="flex flex-wrap items-center gap-1.5"><CompanyBadge id={t.company} /><FnBadge fn={t.fn} /><Button size="xs" variant="outline" className="ml-auto" onClick={() => update(() => setDone(t, true))}>Mark done</Button></div>}
            </div>
            <div className="space-y-1.5"><Label>The very next physical step (keep it tiny)</Label><Input defaultValue={tm.step} onBlur={(e) => { TM.step = e.target.value; save(); }} placeholder="e.g. Open the MEIL RA-4 file and check row 12" /></div>
          </div>
        </CardContent></Card>
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Park a thought</CardTitle><CardDescription>Drop it here and get back to work. It goes to your backlog.</CardDescription></CardHeader>
            <CardContent><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!park.trim()) return; update((S) => newTask(S, park, {})); setPark(""); toast("Parked. Back to it."); }}><Input value={park} onChange={(e) => setPark(e.target.value)} placeholder="Call Basu about DTH bill…" /><Button variant="outline" type="submit">Park</Button></form></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Today's focus</CardTitle></CardHeader>
            <CardContent><div className="mb-2"><span className="text-3xl font-bold num">{hm(sess.reduce((n, f) => n + f.mins, 0))}</span><span className="ml-2 text-sm text-muted-foreground">in {sess.length} block{sess.length === 1 ? "" : "s"}</span></div>
              <div className="divide-y text-sm">{sess.slice().reverse().map((f) => <div key={f.id} className="flex gap-2 py-1.5"><span className="min-w-0 flex-1 truncate">{f.label}</span><span className="text-muted-foreground">{f.company ? companyName(S, f.company) : ""}</span><span className="text-muted-foreground num">{new Date(f.at).toTimeString().slice(0, 5)}</span></div>)}{!sess.length && <p className="py-1 text-muted-foreground">No blocks yet today.</p>}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Timer settings</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">{([["work", "Focus"], ["short", "Short"], ["long", "Long"], ["every", "Long break every"]] as const).map(([k, lab]) => <div key={k} className="space-y-1"><Label>{lab}</Label><Input type="number" min={1} className="w-20" defaultValue={(S.settings as any)[k]} onBlur={(e) => update((S) => { (S.settings as any)[k] = Math.max(1, +e.target.value || 1); if (!TM.running) { TM.left = null; save(); } })} /></div>)}
              <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={S.settings.sound} onCheckedChange={(v) => update((S) => (S.settings.sound = v))} />Sound</label></CardContent></Card>
        </div>
      </div>
    </div>);
}
