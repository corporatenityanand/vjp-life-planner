import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { e1rm, lastFor, Routine } from "@/lib/model";
import { fmtDay, uid, todayStr } from "@/lib/date";
import { CATS, LIB_EQUIP, LIB_MUSCLES, LibEx, cap, ensureFromLib, imgUrl, libById, loadLib, useLib, ytEmbed, ytSearch } from "@/lib/exlib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/bits";
import { Dumbbell, ExternalLink, ListPlus, Pause, Play, Plus, Search, Youtube } from "lucide-react";

/* ---------- open the detail sheet from anywhere ---------- */
let OPEN: string | null = null; const subs = new Set<() => void>();
export const openExDetail = (libId: string) => { OPEN = libId; subs.forEach((f) => f()); };
const useOpen = () => React.useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => OPEN);

/** Adds an exercise to the live workout. Returns false when no workout is running. */
export function addToWorkout(exId: string) {
  if (!S.gym.active) return false;
  update((S) => { const w = S.gym.active!; const last = lastFor(S, exId); w.ex.push({ id: uid(), ex: exId, sets: Array.from({ length: Math.max(3, last?.sets.length || 0) }, () => ({})) }); });
  return true;
}
export function addToRoutine(r: Routine, exId: string, kind?: string) {
  update((S) => { const x = S.gym.routines.find((y) => y.id === r.id); x?.items.push({ ex: exId, sets: 3, reps: kind === "time" ? "30s" : "8-12" }); });
}

function Frames({ x, className }: { x: LibEx; className?: string }) {
  const [i, setI] = React.useState(0); const [play, setPlay] = React.useState(true); const [err, setErr] = React.useState(false);
  React.useEffect(() => { if (!play || x.im.length < 2) return; const t = setInterval(() => setI((v) => (v + 1) % x.im.length), 1000); return () => clearInterval(t); }, [play, x.id]);
  if (!x.im.length || err) return <div className={cn("grid place-items-center rounded-lg bg-muted text-muted-foreground", className)}><Dumbbell className="h-8 w-8" /></div>;
  return (
    <button type="button" onClick={() => setPlay(!play)} className={cn("relative overflow-hidden rounded-lg bg-white", className)} aria-label={play ? "Pause demo" : "Play demo"}>
      {x.im.map((_, k) => <img key={k} src={imgUrl(x, k)} alt={`${x.n}, ${k ? "end" : "start"} position`} onError={() => setErr(true)} className={cn("absolute inset-0 h-full w-full object-contain transition-opacity duration-300", k === i ? "opacity-100" : "opacity-0")} />)}
      <span className="absolute bottom-2 right-2 rounded-full bg-black/60 p-1.5 text-white">{play ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</span>
    </button>);
}

function Muscles({ x }: { x: LibEx }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {x.p.map((m) => <span key={m} className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white">{cap(m)}</span>)}
      {x.s.map((m) => <span key={m} className="rounded-full border border-brand/50 px-2.5 py-0.5 text-xs text-foreground/80">{cap(m)}</span>)}
    </div>);
}

/* ---------- detail ---------- */
export function ExDetailHost() {
  useStore(); const id = useOpen(); const lib = useLib();
  const x = id && lib ? lib.find((y) => y.id === id) : undefined;
  const [vid, setVid] = React.useState(""); const [editVid, setEditVid] = React.useState(false);
  React.useEffect(() => { setVid((id && S.gym.vids?.[id]) || ""); setEditVid(false); }, [id]);
  const close = () => { OPEN = null; subs.forEach((f) => f()); };
  if (!id) return null;
  const mine = x && S.gym.exercises.find((e) => e.lib === x.id);
  const past = mine ? S.workouts.filter((w) => w.end && w.ex.some((e) => e.ex === mine.id)) : [];
  const best = mine ? Math.max(0, ...past.flatMap((w) => w.ex.filter((e) => e.ex === mine.id).flatMap((e) => e.sets.filter((s) => s.done && !s.warm).map((s) => e1rm(s.w, s.r))))) : 0;
  const last = mine ? lastFor(S, mine.id) : null;
  const saved = S.gym.vids?.[id]; const embed = ytEmbed(saved);
  const ensure = () => { let eid = ""; update((S) => { eid = ensureFromLib(S, x!); }); return eid; };
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        {!x ? <div className="p-6 text-sm text-muted-foreground">{lib ? "That exercise isn't in the library." : "Loading the library…"}</div> : <>
          <DialogHeader>
            <DialogTitle className="pr-6 text-xl">{x.n}</DialogTitle>
            <DialogDescription asChild><div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary">{CATS.find((c) => c[0] === x.c)?.[1] || cap(x.c)}</Badge><Badge variant="outline">{cap(x.l)}</Badge><Badge variant="outline">{cap(x.e)}</Badge>
              {x.m && <Badge variant="outline">{cap(x.m)}</Badge>}{x.f && x.f !== "static" && <Badge variant="outline">{cap(x.f)}</Badge>}
            </div></DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            {embed ? <iframe src={embed} title={`${x.n} video`} className="aspect-video w-full rounded-lg sm:col-span-2" allow="encrypted-media; picture-in-picture" allowFullScreen /> : null}
            <Frames x={x} className="aspect-[4/3] w-full" />
            <div className="space-y-3">
              <div><div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Muscles worked</div><Muscles x={x} />
                <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand" />Primary</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-brand/60" />Secondary</span></div></div>
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start"><a href={ytSearch(x.n)} target="_blank" rel="noreferrer"><Youtube className="text-red-600" />Watch tutorials on YouTube<ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" /></a></Button>
                {editVid ? <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (vid && !ytEmbed(vid)) return toast("That doesn't look like a YouTube link."); update((S) => { S.gym.vids = S.gym.vids || {}; if (vid) S.gym.vids[id] = vid.trim(); else delete S.gym.vids[id]; }); setEditVid(false); }}>
                  <Input autoFocus value={vid} onChange={(e) => setVid(e.target.value)} placeholder="Paste a YouTube link" className="h-9" /><Button type="submit" size="sm">Save</Button></form>
                  : <button onClick={() => setEditVid(true)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">{saved ? "Change your saved video" : "Found a good one? Save it here to play it inline"}</button>}
              </div>
              {mine && past.length ? <div className="rounded-md border p-2.5 text-sm"><div className="text-xs text-muted-foreground">Your log</div>
                <div className="num">{past.length} workout{past.length > 1 ? "s" : ""}{best ? ` · best e1RM ${Math.round(best)} kg` : ""}</div>
                {last && <div className="text-xs text-muted-foreground num">Last {fmtDay(last.w.start.slice(0, 10))}: {last.sets.map((s) => (s.w ? `${+s.w.toFixed(2)}×${s.r ?? ""}` : `${s.r ?? ""}`)).join(", ")}</div>}</div> : null}
            </div>
          </div>
          <div><div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">How to do it</div>
            <ol className="space-y-2 text-sm leading-relaxed">{x.i.map((t, k) => <li key={k} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold num">{k + 1}</span><span>{t}</span></li>)}</ol></div>
          <div className="sticky -bottom-5 -mx-5 -mb-5 flex flex-wrap gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur">
            {S.gym.active ? <Button variant="brand" onClick={() => { addToWorkout(ensure()); toast(`Added ${x.n} to your workout.`); close(); }}><Plus />Add to workout</Button>
              : <Button variant="brand" onClick={() => { const eid = ensure(); update((S) => { S.gym.active = { id: "w-" + uid(), start: new Date().toISOString(), name: `Workout ${fmtDay(todayStr())}`, routine: null, ex: [] }; }); addToWorkout(eid); close(); try { localStorage.setItem("lp2-fittab", "workout"); } catch {} window.dispatchEvent(new Event("lp-fittab")); }}><Play />Start a workout with this</Button>}
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><ListPlus />Add to routine</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start"><DropdownMenuLabel>Add to…</DropdownMenuLabel><DropdownMenuSeparator />
                {S.gym.routines.map((r) => <DropdownMenuItem key={r.id} onSelect={() => { const eid = ensure(); addToRoutine(r, eid, S.gym.exercises.find((e) => e.id === eid)?.kind); toast(`Added to ${r.name}.`); }}>{r.name}</DropdownMenuItem>)}
                {!S.gym.routines.length && <DropdownMenuItem disabled>No routines yet</DropdownMenuItem>}
              </DropdownMenuContent></DropdownMenu>
          </div>
        </>}
      </DialogContent>
    </Dialog>);
}

/* ---------- library tab ---------- */
const PAGE = 48;
export function LibraryTab() {
  const lib = useLib();
  const [q, setQ] = React.useState(""); const [cat, setCat] = React.useState("all"); const [mus, setMus] = React.useState("all"); const [eq, setEq] = React.useState("all"); const [lvl, setLvl] = React.useState("all");
  const [n, setN] = React.useState(PAGE);
  React.useEffect(() => setN(PAGE), [q, cat, mus, eq, lvl]);
  if (!lib) return <Empty>Loading 876 exercises…</Empty>;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = lib.filter((x) => (cat === "all" || x.c === cat) && (mus === "all" || x.p.includes(mus) || x.s.includes(mus)) && (eq === "all" || x.e === eq) && (lvl === "all" || x.l === lvl) && words.every((w) => x.n.toLowerCase().includes(w)))
    .sort((a, b) => (mus === "all" ? 0 : +b.p.includes(mus) - +a.p.includes(mus)) || a.n.localeCompare(b.n));
  const sel = (v: string, set: (s: string) => void, opts: string[], all: string) => (
    <Select value={v} onValueChange={set}><SelectTrigger className={cn("h-9 w-full sm:w-40", v !== "all" && "border-brand")}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">{all}</SelectItem>{opts.map((o) => <SelectItem key={o} value={o}>{cap(o)}</SelectItem>)}</SelectContent></Select>);
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 876 exercises and stretches" className="pl-9" /></div>
        <div className="grid grid-cols-3 gap-2 sm:flex">{sel(mus, setMus, LIB_MUSCLES, "Muscle")}{sel(eq, setEq, LIB_EQUIP, "Equipment")}{sel(lvl, setLvl, ["beginner", "intermediate", "expert"], "Level")}</div>
      </div>
      <div className="flex flex-wrap gap-1">{[["all", "All"] as [string, string], ...CATS].map(([v, l]) => <button key={v} onClick={() => setCat(v)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", cat === v ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}</div>
      <div className="text-xs text-muted-foreground num">{list.length} exercise{list.length === 1 ? "" : "s"}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {list.slice(0, n).map((x) => (
          <button key={x.id} onClick={() => openExDetail(x.id)} className="group overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-brand">
            <div className="aspect-[4/3] bg-white">{x.im.length ? <img loading="lazy" src={imgUrl(x)} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center bg-muted text-muted-foreground"><Dumbbell /></div>}</div>
            <div className="p-2.5"><div className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-brand">{x.n}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{x.p.map(cap).join(", ")} · {cap(x.e)}</div></div>
          </button>))}
      </div>
      {!list.length && <Empty>No exercise matches. Try fewer filters.</Empty>}
      {list.length > n && <div className="flex justify-center"><Button variant="outline" onClick={() => setN(n + PAGE)}>Show more ({list.length - n} left)</Button></div>}
      <p className="pt-2 text-center text-[11px] text-muted-foreground">Exercise data and photos from the public-domain free-exercise-db project.</p>
    </div>);
}

/** Library matches for the exercise picker, excluding ones already in your list. */
export function useLibSearch(q: string, group: string) {
  const lib = useLib();
  return React.useMemo(() => {
    if (!lib) return null;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length && group === "All") return [];
    const have = new Set(S.gym.exercises.map((e) => e.lib).filter(Boolean));
    const G: Record<string, string[]> = { Chest: ["chest"], Back: ["lats", "middle back", "lower back", "traps"], Shoulders: ["shoulders", "neck"], Legs: ["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"], Arms: ["biceps", "triceps", "forearms"], Core: ["abdominals"], "Full body": [] };
    return lib.filter((x) => !have.has(x.id) && words.every((w) => x.n.toLowerCase().includes(w)) && (group === "All" || (G[group] || []).some((m) => x.p.includes(m)) || (group === "Full body" && x.p.length > 1))).slice(0, 40);
  }, [lib, q, group, S.gym.exercises.length]);
}
export { loadLib, libById };
