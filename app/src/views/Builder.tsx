import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { Exercise, MUSCLES, exById } from "@/lib/model";
import { uid } from "@/lib/date";
import { LibEx, cap, ensureFromLib, imgUrl, libById, useLib } from "@/lib/exlib";
import { openExDetail, useLibSearch } from "./ExLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, Info, Plus, Search, X } from "lucide-react";

/* ---------- muscle load ---------- */
// Custom exercises without a library entry fall back to their muscle group.
const GROUP_MUSCLES: Record<string, string[]> = { Chest: ["chest"], Back: ["lats", "middle back"], Shoulders: ["shoulders"], Legs: ["quadriceps", "hamstrings", "glutes"], Arms: ["biceps", "triceps"], Core: ["abdominals"], "Full body": [] };
export const MAJOR: [string, string[]][] = [["Chest", ["chest"]], ["Back", ["lats", "middle back", "lower back", "traps"]], ["Shoulders", ["shoulders"]], ["Arms", ["biceps", "triceps", "forearms"]], ["Core", ["abdominals"]], ["Legs", ["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"]]];

const libOf = (ex: string): LibEx | undefined => (ex.startsWith("lib:") ? libById(ex.slice(4)) : libById(exById(S, ex)?.lib));
/** Sets per muscle: a primary muscle counts the full set, a secondary one half. */
export function muscleLoad(items: { ex: string; sets: number }[]) {
  const load: Record<string, number> = {};
  for (const it of items) {
    const l = libOf(it.ex);
    const p = l ? l.p : GROUP_MUSCLES[exById(S, it.ex)?.muscle || ""] || [];
    p.forEach((m) => (load[m] = (load[m] || 0) + it.sets));
    l?.s.forEach((m) => (load[m] = (load[m] || 0) + it.sets / 2));
  }
  return load;
}

/* ---------- body map ---------- */
export function MuscleMap({ load, className }: { load: Record<string, number>; className?: string }) {
  const max = Math.max(1, ...Object.values(load));
  const fill = (m: string) => { const v = load[m] || 0; return v ? { fill: "hsl(var(--brand))", fillOpacity: 0.3 + 0.7 * Math.min(1, v / max) } : { fill: "hsl(var(--muted-foreground))", fillOpacity: 0.16 }; };
  const both = (m: string, el: (p: any) => React.ReactNode) => <g><title>{cap(m)}{load[m] ? ` · ${+load[m].toFixed(1)} sets` : ""}</title>{el(fill(m))}{el({ ...fill(m), transform: "matrix(-1 0 0 1 100 0)" })}</g>;
  const one = (m: string, el: (p: any) => React.ReactNode) => <g><title>{cap(m)}{load[m] ? ` · ${+load[m].toFixed(1)} sets` : ""}</title>{el(fill(m))}</g>;
  const skin = { fill: "hsl(var(--muted-foreground))", fillOpacity: 0.28 };
  const head = (<><circle cx={50} cy={13} r={9.5} {...skin} /><ellipse cx={17.5} cy={101} rx={3.6} ry={5.5} {...skin} /><ellipse cx={82.5} cy={101} rx={3.6} ry={5.5} {...skin} /><ellipse cx={38} cy={214} rx={5.5} ry={4.5} {...skin} /><ellipse cx={62} cy={214} rx={5.5} ry={4.5} {...skin} /></>);
  return (
    <svg viewBox="0 0 215 232" className={cn("w-full", className)} role="img" aria-label="Muscles worked, front and back">
      <g>
        {head}
        {one("neck", (p) => <path d="M45,23 L55,23 L56,31 L44,31Z" {...p} />)}
        {both("traps", (p) => <path d="M44,28 Q38,32 33,34 L44,35Z" {...p} />)}
        {both("shoulders", (p) => <ellipse cx={30} cy={42} rx={7} ry={8.5} transform="rotate(-15 30 42)" {...p} />)}
        {both("chest", (p) => <path d="M49,36 L37,37 Q31,46 36,55 Q43,58 49,56Z" {...p} />)}
        {both("biceps", (p) => <ellipse cx={26} cy={60} rx={5} ry={11} transform="rotate(10 26 60)" {...p} />)}
        {both("forearms", (p) => <ellipse cx={21} cy={84} rx={4.5} ry={12.5} transform="rotate(12 21 84)" {...p} />)}
        {one("abdominals", (p) => <rect x={43} y={59} width={14} height={40} rx={5} {...p} />)}
        {both("abdominals", (p) => <ellipse cx={38} cy={79} rx={3.8} ry={13} {...p} />)}
        {both("abductors", (p) => <ellipse cx={33} cy={110} rx={4.2} ry={9} transform="rotate(10 33 110)" {...p} />)}
        {both("quadriceps", (p) => <ellipse cx={40} cy={141} rx={8} ry={25} transform="rotate(4 40 141)" {...p} />)}
        {both("adductors", (p) => <ellipse cx={47.2} cy={127} rx={2.6} ry={13} {...p} />)}
        {both("calves", (p) => <ellipse cx={39} cy={190} rx={5} ry={17} transform="rotate(3 39 190)" {...p} />)}
        <text x={50} y={230} textAnchor="middle" className="fill-muted-foreground text-[8px]">Front</text>
      </g>
      <g transform="translate(115 0)">
        {head}
        {one("neck", (p) => <path d="M45,23 L55,23 L55,29 L45,29Z" {...p} />)}
        {one("traps", (p) => <path d="M50,26 L36,34 L44,40 L50,62 L56,40 L64,34Z" {...p} />)}
        {both("shoulders", (p) => <ellipse cx={30} cy={42} rx={7} ry={8.5} transform="rotate(15 30 42)" {...p} />)}
        {both("triceps", (p) => <ellipse cx={26} cy={60} rx={5} ry={11} transform="rotate(10 26 60)" {...p} />)}
        {both("forearms", (p) => <ellipse cx={21} cy={84} rx={4.5} ry={12.5} transform="rotate(12 21 84)" {...p} />)}
        {both("lats", (p) => <path d="M43,42 L36,47 Q35,64 44,82 L45.5,72 L44.5,50Z" {...p} />)}
        {both("middle back", (p) => <ellipse cx={47.3} cy={67} rx={2.4} ry={8} {...p} />)}
        {one("lower back", (p) => <rect x={43} y={78} width={14} height={19} rx={4} {...p} />)}
        {both("glutes", (p) => <ellipse cx={42} cy={110} rx={8.5} ry={10} {...p} />)}
        {both("hamstrings", (p) => <ellipse cx={41} cy={144} rx={7.5} ry={22} transform="rotate(3 41 144)" {...p} />)}
        {both("adductors", (p) => <ellipse cx={47.6} cy={134} rx={2.3} ry={10} {...p} />)}
        {both("calves", (p) => <ellipse cx={40} cy={186} rx={6} ry={15} {...p} />)}
        <text x={50} y={230} textAnchor="middle" className="fill-muted-foreground text-[8px]">Back</text>
      </g>
    </svg>);
}

export function LoadSummary({ load }: { load: Record<string, number> }) {
  const rows = Object.entries(load).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...rows.map((r) => r[1]));
  const missed = MAJOR.filter(([, ms]) => !ms.some((m) => load[m])).map(([g]) => g);
  if (!rows.length) return <p className="text-center text-sm text-muted-foreground">Add exercises and the muscles they work light up here.</p>;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[88px_1fr_auto] items-center gap-x-2 gap-y-1 text-xs">
        {rows.slice(0, 8).map(([m, v]) => <React.Fragment key={m}><span className="truncate">{cap(m)}</span><span className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></span><span className="whitespace-nowrap text-right text-muted-foreground num">{+v.toFixed(1)} sets</span></React.Fragment>)}
      </div>
      {missed.length > 0 && <p className="text-xs text-muted-foreground">Not trained: {missed.join(", ")}</p>}
    </div>);
}

/* ---------- builder ---------- */
export type BItem = { ex: string; sets: number; reps: string };
export type BAction = { label: string; brand?: boolean; fn: (items: BItem[], name: string) => void };

/** Turns picked library entries into logged exercises and returns final items. */
export function commitItems(items: BItem[]) {
  let out: BItem[] = [];
  update((S) => { out = items.map((it) => { if (!it.ex.startsWith("lib:")) return it; const l = libById(it.ex.slice(4)); return { ...it, ex: l ? ensureFromLib(S, l) : it.ex }; }).filter((it) => !it.ex.startsWith("lib:")); });
  return out;
}

export function WorkoutBuilder({ open, onClose, title, existing = [], actions, askName, defaultName = "" }: { open: boolean; onClose: () => void; title: string; existing?: { ex: string; sets: number }[]; actions: BAction[]; askName?: boolean; defaultName?: string }) {
  useStore(); const lib = useLib();
  const [picked, setPicked] = React.useState<BItem[]>([]); const [q, setQ] = React.useState(""); const [m, setM] = React.useState("All");
  const [step, setStep] = React.useState<"pick" | "review">("pick"); const [name, setName] = React.useState(defaultName);
  const [creating, setCreating] = React.useState(false); const [nx, setNx] = React.useState<{ name: string; muscle: string; kind: Exercise["kind"]; equip: string }>({ name: "", muscle: "Chest", kind: "weight", equip: "" });
  React.useEffect(() => { if (open) { setPicked([]); setQ(""); setM("All"); setStep("pick"); setName(defaultName); setCreating(false); } }, [open]);
  const libHits = useLibSearch(q, m);
  if (!open) return null;

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const counts: Record<string, number> = {}; S.workouts.forEach((w) => w.ex.forEach((e) => (counts[e.ex] = (counts[e.ex] || 0) + 1)));
  const mine = S.gym.exercises.filter((e) => (m === "All" || e.muscle === m) && words.every((w) => e.name.toLowerCase().includes(w))).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.name.localeCompare(b.name));
  const isPicked = (ex: string) => picked.some((p) => p.ex === ex);
  const defReps = (ex: string) => { const l = libOf(ex); const k = ex.startsWith("lib:") ? (l && (l.c === "stretching" || l.c === "cardio") ? "time" : "") : exById(S, ex)?.kind; return k === "time" ? "30s" : "8-12"; };
  const toggle = (ex: string) => setPicked((p) => (p.some((x) => x.ex === ex) ? p.filter((x) => x.ex !== ex) : [...p, { ex, sets: 3, reps: defReps(ex) }]));
  const nameOf = (ex: string) => (ex.startsWith("lib:") ? libById(ex.slice(4))?.n : exById(S, ex)?.name) || "Exercise";
  const load = muscleLoad([...existing, ...picked]);
  const move = (i: number, d: number) => setPicked((p) => { const a = [...p]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; });
  const setItem = (i: number, patch: Partial<BItem>) => setPicked((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const run = (a: BAction) => { if (!picked.length) return toast("Pick at least one exercise."); if (askName && !name.trim()) return toast("Give it a name."); a.fn(commitItems(picked), name.trim()); onClose(); };

  const row = ({ ex, title, sub, thumb, libId }: { ex: string; title: string; sub: string; thumb?: string; libId?: string }) => {
    const on = isPicked(ex);
    return (
      <div key={ex} className={cn("flex items-center", on ? "bg-brand/10" : "hover:bg-accent")}>
        <button onClick={() => toggle(ex)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left" aria-pressed={on}>
          <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", on ? "border-brand bg-brand text-white" : "border-muted-foreground/40")}>{on && <Check className="h-3.5 w-3.5" />}</span>
          {thumb ? <img loading="lazy" src={thumb} alt="" className="h-9 w-12 shrink-0 rounded bg-white object-contain" /> : <span className="grid h-9 w-12 shrink-0 place-items-center rounded bg-muted text-muted-foreground"><Dumbbell className="h-4 w-4" /></span>}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="block truncate text-xs text-muted-foreground">{sub}</span></span>
        </button>
        {libId && <Button variant="ghost" size="icon-sm" className="mr-2" aria-label={`How to do ${title}`} onClick={() => openExDetail(libId, on ? undefined : { label: "Add to this workout", fn: () => toggle(ex) })}><Info /></Button>}
      </div>);
  };

  const pickPane = (
    <div className={cn("flex min-h-0 min-w-0 flex-col", step === "review" && "hidden lg:flex")}>
      <div className="space-y-2 p-4 pb-2">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your exercises and the library" className="pl-9" /></div>
        <div className="flex flex-wrap gap-1">{["All", ...MUSCLES].map((x) => <button key={x} onClick={() => setM(x)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", m === x ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}>{x}</button>)}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-y">
        <div className="sticky top-0 z-10 bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your exercises</div>
        <div className="divide-y">{mine.map((e) => { const l = libById(e.lib); return row({ ex: e.id, title: e.name, sub: `${e.muscle}${e.equip ? ` · ${e.equip}` : ""}${counts[e.id] ? ` · done ${counts[e.id]}×` : ""}`, thumb: l ? imgUrl(l) : undefined, libId: e.lib }); })}</div>
        {!mine.length && <div className="p-3 text-sm text-muted-foreground">None of yours match.</div>}
        <div className="sticky top-0 z-10 bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From the library</div>
        {libHits == null ? <div className="p-3 text-sm text-muted-foreground">Loading…</div> : !libHits.length ? <div className="p-3 text-sm text-muted-foreground">{words.length || m !== "All" ? "No library match." : "Type or pick a muscle to search 876 more."}</div>
          : <div className="divide-y">{libHits.map((x) => row({ ex: "lib:" + x.id, title: x.n, sub: `${x.p.map(cap).join(", ")} · ${cap(x.e)}${x.c === "stretching" ? " · stretch" : ""}`, thumb: x.im.length ? imgUrl(x) : undefined, libId: x.id }))}</div>}
        <div className="p-3">{!creating ? <Button variant="ghost" size="sm" onClick={() => { setCreating(true); setNx({ ...nx, name: q }); }}><Plus />Create a custom exercise</Button>
          : <form className="grid gap-3 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); if (!nx.name.trim()) return; const id = "x-" + uid(); update((S) => S.gym.exercises.push({ id, name: nx.name.trim(), muscle: nx.muscle, equip: nx.equip, kind: nx.kind, custom: true })); setPicked((p) => [...p, { ex: id, sets: 3, reps: nx.kind === "time" ? "30s" : "8-12" }]); setCreating(false); }}>
            <div className="space-y-1.5"><Label>Name</Label><Input autoFocus value={nx.name} onChange={(e) => setNx({ ...nx, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Muscle group</Label><Select value={nx.muscle} onValueChange={(v) => setNx({ ...nx, muscle: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MUSCLES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Tracked as</Label><Select value={nx.kind} onValueChange={(v) => setNx({ ...nx, kind: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weight">Weight × reps</SelectItem><SelectItem value="bw">Reps (bodyweight)</SelectItem><SelectItem value="time">Seconds</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Equipment (optional)</Label><Input value={nx.equip} onChange={(e) => setNx({ ...nx, equip: e.target.value })} placeholder="Barbell, cable, machine…" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" size="sm">Create and pick</Button></div>
          </form>}</div>
      </div>
    </div>);

  const reviewPane = (
    <div className={cn("min-h-0 overflow-y-auto bg-muted/30 lg:border-l", step === "pick" && "hidden lg:block")}>
      <div className="space-y-4 p-4">
        {askName && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Upper A" className="text-base font-semibold" aria-label="Workout name" />}
        <MuscleMap load={load} className="mx-auto max-w-[280px]" />
        <LoadSummary load={load} />
        <div>
          <div className="mb-1.5 flex items-baseline text-xs font-medium uppercase tracking-wide text-muted-foreground"><span className="mr-auto">Picked ({picked.length})</span>{existing.length > 0 && <span className="normal-case tracking-normal">+ {existing.length} already in</span>}</div>
          <div className="divide-y rounded-md border bg-background">
            {picked.map((it, i) => (
              <div key={it.ex} className="flex items-center gap-1.5 px-2 py-1.5">
                <div className="flex flex-col"><button disabled={!i} onClick={() => move(i, -1)} className="text-muted-foreground disabled:opacity-30" aria-label="Move up"><ChevronUp className="h-4 w-4" /></button><button disabled={i === picked.length - 1} onClick={() => move(i, 1)} className="text-muted-foreground disabled:opacity-30" aria-label="Move down"><ChevronDown className="h-4 w-4" /></button></div>
                <div className="min-w-0 flex-1 truncate text-sm font-medium">{nameOf(it.ex)}</div>
                <Input type="number" min={1} value={it.sets} onChange={(e) => setItem(i, { sets: Math.max(1, +e.target.value || 1) })} className="h-8 w-12 px-1 text-center" aria-label="Sets" /><span className="text-xs text-muted-foreground">×</span>
                <Input value={it.reps} onChange={(e) => setItem(i, { reps: e.target.value })} className="h-8 w-14 px-1 text-center" aria-label="Reps" />
                <Button variant="ghost" size="icon-sm" onClick={() => toggle(it.ex)} aria-label={`Remove ${nameOf(it.ex)}`}><X /></Button>
              </div>))}
            {!picked.length && <div className="p-3 text-sm text-muted-foreground">Nothing picked yet.</div>}
          </div>
        </div>
      </div>
    </div>);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92dvh] max-h-[92dvh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b px-4 py-3 pr-12">
          <DialogTitle className="mr-auto text-lg">{title}</DialogTitle>
          <div className="flex rounded-lg bg-muted p-0.5 text-xs lg:hidden">
            <button onClick={() => setStep("pick")} className={cn("rounded-md px-2.5 py-1", step === "pick" && "bg-background font-medium shadow-sm")}>1 Pick</button>
            <button onClick={() => setStep("review")} className={cn("rounded-md px-2.5 py-1", step === "review" && "bg-background font-medium shadow-sm")}>2 Review{picked.length ? ` (${picked.length})` : ""}</button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">{pickPane}{reviewPane}</div>
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <span className="mr-auto text-sm text-muted-foreground num">{picked.length} exercise{picked.length === 1 ? "" : "s"} · {picked.reduce((n, p) => n + p.sets, 0)} sets</span>
          {step === "pick" && <Button className="lg:hidden" variant="outline" disabled={!picked.length} onClick={() => setStep("review")}>Review<ChevronRight /></Button>}
          {step === "review" && <Button className="lg:hidden" variant="ghost" onClick={() => setStep("pick")}><ChevronLeft />Pick more</Button>}
          {actions.map((a) => <Button key={a.label} variant={a.brand ? "brand" : "outline"} disabled={!picked.length} className={cn(step === "pick" && !a.brand && "hidden lg:inline-flex")} onClick={() => run(a)}>{a.label}</Button>)}
        </div>
      </DialogContent>
    </Dialog>);
}
