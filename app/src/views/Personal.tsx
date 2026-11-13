import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { ASSET_KINDS, ASSET_PRESETS, PERSONAL_PRESETS, UNIT_LABEL, addRepeat, assetOf, doRepeatNow, everyText, personalTasks, skipRepeat, type Asset, type AssetKind, type Repeat } from "@/lib/model";
import { addDays, daysBetween, fmtDay, todayStr, uid } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, PageHead } from "@/components/bits";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskRow } from "@/components/TaskRow";
import { Docs } from "@/components/Docs";
import { AssetSelect, ListSelect } from "@/components/pickers";
import { setUI, useUI } from "@/components/ui-state";
import { Bike, Car, Check, Home, MapPin, Package, Plus, Repeat as RepeatIcon, SkipForward, Trash2 } from "lucide-react";

const KIND_ICON: Record<AssetKind, any> = { house: Home, property: MapPin, car: Car, bike: Bike, other: Package };
const KIND_LABEL = Object.fromEntries(ASSET_KINDS) as Record<AssetKind, string>;

function dueText(next: string) {
  const n = daysBetween(todayStr(), next);
  if (n < 0) return { t: `${-n} day${n === -1 ? "" : "s"} late`, c: "font-semibold text-q1" };
  if (n === 0) return { t: "Due today", c: "font-semibold text-q2" };
  if (n === 1) return { t: "Tomorrow", c: "text-q2" };
  if (n <= 14) return { t: `In ${n} days`, c: "text-muted-foreground" };
  return { t: fmtDay(next), c: "text-muted-foreground" };
}

/* ---------- repeat editor (one shared dialog) ---------- */
type Draft = Partial<Repeat> & { title: string };
let draft: Draft | null = null; const subs = new Set<() => void>();
export function openRepeat(d: Draft | null) { draft = d; subs.forEach((f) => f()); }
const useDraft = () => React.useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => draft);

function RepeatDialog() {
  useStore(); const d = useDraft();
  const [f, setF] = React.useState<Draft | null>(null);
  React.useEffect(() => { setF(d ? { every: 1, unit: "m", from: "done", next: todayStr(), lead: 0, asset: null, list: null, ...d } : null); }, [d]);
  if (!f) return null;
  const set = (p: Partial<Draft>) => setF({ ...f, ...p });
  const existing = f.id ? S.personal.repeats.find((r) => r.id === f.id) : undefined;
  const save = () => {
    if (!f.title.trim()) { toast("Give it a name."); return; }
    const every = Math.max(1, Math.round(+(f.every || 1)));
    update((S) => {
      const fields = { title: f.title.trim(), asset: f.asset || null, list: f.list || null, every, unit: f.unit!, from: f.from!, next: f.next || todayStr(), lead: Math.max(0, +(f.lead || 0)), q: f.q };
      if (existing) { const moved = existing.next !== fields.next; S.tasks.forEach((t) => { if (t.ref?.rep === existing.id && !t.done) { t.asset = fields.asset; t.list = fields.list; if (moved && t.ref.due === existing.next) { t.ref = { ...t.ref, due: fields.next }; t.date = fields.next; t.top = 0; } } }); if (moved && existing.made === existing.next) existing.made = undefined; Object.assign(existing, fields); }
      else addRepeat(S, fields as any);
    });
    toast(existing ? "Repeat saved." : `Added: ${f.title.trim()}, ${everyText({ every, unit: f.unit! }).toLowerCase()}.`);
    openRepeat(null);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && openRepeat(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit repeat" : "New repeat"}</DialogTitle><DialogDescription>A task for it lands on its due day (or a few days early if you like). Tick it off and the next one is scheduled.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>What</Label><Input autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Car service, haircut, property tax" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Every</Label><div className="flex gap-2"><Input type="number" min={1} value={f.every ?? 1} onChange={(e) => set({ every: +e.target.value })} className="w-16" />
              <Select value={f.unit} onValueChange={(v) => set({ unit: v as Repeat["unit"] })}><SelectTrigger className="min-w-0 flex-1" aria-label="Unit"><SelectValue /></SelectTrigger><SelectContent>{(["d", "w", "m", "y"] as const).map((u) => <SelectItem key={u} value={u}>{UNIT_LABEL[u][(f.every ?? 1) === 1 ? 0 : 1]}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="space-y-1.5"><Label>Next due</Label><Input type="date" value={f.next || ""} onChange={(e) => set({ next: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Count the gap from</Label>
            <div className="grid grid-cols-2 gap-1.5">{([["done", "When I last did it", "haircut, car wash, service"], ["due", "Fixed dates", "insurance, tax, bills"]] as const).map(([v, a, b]) => (
              <button key={v} type="button" onClick={() => set({ from: v })} className={cn("rounded-md border px-2.5 py-2 text-left text-xs", f.from === v ? "border-brand bg-brand/10" : "hover:bg-accent")}><div className="font-semibold">{a}</div><div className="text-muted-foreground">{b}</div></button>))}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Asset</Label><AssetSelect value={f.asset} onChange={(v) => set({ asset: v })} /></div>
            <div className="space-y-1.5"><Label>List</Label><ListSelect value={f.list} onChange={(v) => set({ list: v })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Put it on my list this many days early</Label><Input type="number" min={0} value={f.lead ?? 0} onChange={(e) => set({ lead: +e.target.value })} className="w-24" /></div>
        </div>
        <DialogFooter>
          {existing && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (!confirm(`Delete the repeat “${existing.title}”? Tasks already made stay on your list.`)) return; update((S) => { S.personal.repeats = S.personal.repeats.filter((r) => r.id !== existing.id); }); openRepeat(null); }}><Trash2 />Delete</Button>}
          <Button variant="outline" onClick={() => openRepeat(null)}>Cancel</Button><Button variant="brand" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}

function RepeatRow({ r, showAsset = true }: { r: Repeat; showAsset?: boolean }) {
  const a = assetOf(S, r.asset); const due = dueText(r.next);
  return (
    <div className="flex items-center gap-2 border-b py-2 last:border-0">
      <button className="min-w-0 flex-1 text-left" onClick={() => openRepeat({ ...r })}>
        <div className="truncate text-sm font-medium">{r.title}{showAsset && a ? <span className="font-normal text-muted-foreground"> · {a.name}</span> : null}</div>
        <div className="truncate text-xs text-muted-foreground">{everyText(r)}{r.from === "due" ? ", fixed dates" : ""}{r.last ? ` · last done ${fmtDay(r.last)}` : ""}</div>
      </button>
      <span className={cn("shrink-0 text-right text-xs num", due.c)}>{due.t}</span>
      <Button size="icon-sm" variant="outline" title="Done" aria-label={`Done: ${r.title}`} onClick={() => { update((S) => doRepeatNow(S, r)); toast(`Done. Next ${r.title.toLowerCase()}: ${fmtDay(r.next)}.`); }}><Check /></Button>
      <Button size="icon-sm" variant="ghost" title="Skip this time" aria-label={`Skip: ${r.title}`} onClick={() => { update((S) => skipRepeat(S, r)); toast(`Skipped. Next: ${fmtDay(r.next)}.`); }}><SkipForward /></Button>
    </div>);
}

function Suggestions({ presets, asset, have }: { presets: typeof PERSONAL_PRESETS; asset?: string | null; have: Repeat[] }) {
  const left = presets.filter((p) => !have.some((r) => r.title.toLowerCase() === p.title.toLowerCase()));
  if (!left.length) return null;
  return <div className="flex flex-wrap items-center gap-1.5 pt-2"><span className="text-xs text-muted-foreground">Suggested:</span>{left.map((p) => (
    <button key={p.title} onClick={() => openRepeat({ ...p, asset: asset || null })} className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"><Plus className="h-3 w-3" />{p.title} <span className="opacity-70">({everyText(p).replace("Every ", "").toLowerCase()})</span></button>))}</div>;
}

/* ---------- asset sheet ---------- */
function AssetDialog() {
  useStore(); const ui = useUI();
  const a = S.personal.assets.find((x) => x.id === ui.asset);
  const [showDone, setShowDone] = React.useState(false);
  if (!a) return null;
  const reps = S.personal.repeats.filter((r) => r.asset === a.id).sort((x, y) => x.next.localeCompare(y.next));
  const tasks = S.tasks.filter((t) => t.asset === a.id);
  const open = tasks.filter((t) => !t.done).sort((x, y) => (x.date || "9").localeCompare(y.date || "9"));
  const done = tasks.filter((t) => t.done).sort((x, y) => (y.doneAt || "").localeCompare(x.doneAt || "")).slice(0, 8);
  const I = KIND_ICON[a.kind];
  return (
    <Dialog open onOpenChange={(o) => !o && setUI({ asset: null })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2 pr-6"><I className="h-5 w-5 text-muted-foreground" /><span className="truncate">{a.name}</span></DialogTitle><DialogDescription>{KIND_LABEL[a.kind]}{a.detail ? ` · ${a.detail}` : ""}</DialogDescription></DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
          <div className="space-y-1.5"><Label>Name</Label><Input value={a.name} onChange={(e) => update(() => { a.name = e.target.value; })} /></div>
          <div className="space-y-1.5"><Label>Type</Label><Select value={a.kind} onValueChange={(v) => update(() => { a.kind = v as AssetKind; })}><SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{ASSET_KINDS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Details</Label><Input value={a.detail || ""} onChange={(e) => update(() => { a.detail = e.target.value; })} placeholder={a.kind === "car" || a.kind === "bike" ? "e.g. MH 02 AB 1234, Fortuner 2022" : "e.g. Flat 1201, Bandra West"} /></div>
        </div>
        <section><h3 className="text-sm font-semibold">Repeating upkeep</h3>
          {reps.length ? <div className="mt-1">{reps.map((r) => <RepeatRow key={r.id} r={r} showAsset={false} />)}</div> : <p className="mt-1 text-sm text-muted-foreground">Nothing repeating yet. Pick from the suggestions or add your own.</p>}
          <Suggestions presets={ASSET_PRESETS[a.kind]} asset={a.id} have={reps} />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => openRepeat({ title: "", asset: a.id })}><Plus />Add a repeat</Button>
        </section>
        <section><h3 className="text-sm font-semibold">One-off tasks</h3>
          <QuickAdd className="mt-2" showPickers={false} preset={{ company: null, fn: null, asset: a.id } as any} placeholder={`+ Task for ${a.name}`} />
          <div className="mt-1 divide-y">{open.map((t) => <TaskRow key={t.id} t={t} hide={["company", "fn", "order", "asset"]} />)}</div>
          {done.length > 0 && <button className="mt-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowDone(!showDone)}>{showDone ? "Hide" : "Show"} history ({done.length})</button>}
          {showDone && <ul className="mt-1 space-y-1 text-xs text-muted-foreground">{done.map((t) => <li key={t.id} className="flex gap-2"><span className="w-24 shrink-0 num">{fmtDay((t.doneAt || "").slice(0, 10) || todayStr())}</span><span className="truncate">{t.t}</span></li>)}</ul>}
        </section>
        <section><h3 className="mb-2 text-sm font-semibold">Documents</h3><Docs owner={a} folder={`Assets/${a.name}`} /></section>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={a.notes || ""} onChange={(e) => update(() => { a.notes = e.target.value; })} placeholder="Policy numbers, who to call, where the papers are…" /></div>
        <DialogFooter><Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (!confirm(`Remove ${a.name}? Its repeats stop. Tasks already on your list stay.`)) return; update((S) => { S.personal.assets = S.personal.assets.filter((x) => x.id !== a.id); S.personal.repeats = S.personal.repeats.filter((r) => r.asset !== a.id); }); setUI({ asset: null }); }}><Trash2 />Remove asset</Button><Button onClick={() => setUI({ asset: null })}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>);
}

function NewAsset({ onDone }: { onDone: () => void }) {
  const [name, setName] = React.useState(""); const [kind, setKind] = React.useState<AssetKind>("house");
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; const id = uid(); update((S) => { S.personal.assets.push({ id, name: name.trim(), kind, created: new Date().toISOString() } as Asset); }); onDone(); setUI({ asset: id }); }}>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Bandra flat, Fortuner" className="min-w-0 flex-1 basis-full sm:basis-0" />
      <Select value={kind} onValueChange={(v) => setKind(v as AssetKind)}><SelectTrigger className="w-[150px]" aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{ASSET_KINDS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
      <Button type="submit" variant="brand">Add</Button><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
    </form>);
}

export function Personal() {
  useStore();
  const P = S.personal;
  const [sel, setSel] = React.useState<string>(() => { try { return localStorage.getItem("lp2-plist") || "all"; } catch { return "all"; } });
  const pick = (v: string) => { setSel(v); try { localStorage.setItem("lp2-plist", v); } catch {} };
  const [adding, setAdding] = React.useState(false);
  const [showDone, setShowDone] = React.useState(false);
  const all = personalTasks(S);
  const openAll = all.filter((t) => !t.done);
  const inSel = (t: { list?: string | null }) => sel === "all" || (sel === "_none" ? !t.list : t.list === sel);
  const open = openAll.filter(inSel).sort((a, b) => (a.date || a.week || "9").localeCompare(b.date || b.week || "9") || (a.created || "").localeCompare(b.created || ""));
  const today = todayStr(); const soon = addDays(today, 30);
  const reps = [...P.repeats].sort((a, b) => a.next.localeCompare(b.next));
  const upcoming = reps.filter((r) => r.next <= soon), later = reps.filter((r) => r.next > soon);
  const [showLater, setShowLater] = React.useState(false);
  const doneRecent = all.filter((t) => t.done && inSel(t)).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || "")).slice(0, 10);
  const chips: [string, string, number][] = [["all", "All", openAll.length], ...P.lists.map((l) => [l, l, openAll.filter((t) => t.list === l).length] as [string, string, number])];
  return (
    <div className="min-w-0">
      <PageHead title="Personal" sub="Your own errands and shopping, and the upkeep of your homes, land and vehicles." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">My list</CardTitle><CardDescription>Shopping, haircut, bank work. Anything here with a day shows up in Today.</CardDescription></CardHeader>
          <CardContent>
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">{chips.map(([v, l, n]) => (
              <button key={v} onClick={() => pick(v)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", sel === v ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{l}{n ? <span className="ml-1 opacity-70 num">{n}</span> : null}</button>))}</div>
            <QuickAdd showPickers={false} preset={{ company: null, fn: null, list: sel === "all" || sel === "_none" ? null : sel } as any} placeholder={sel === "Shopping" ? "+ Add to shopping, e.g. milk, batteries" : sel === "all" ? "+ Add a personal task" : `+ Add to ${sel}`} />
            <div className="mt-1 divide-y">{open.map((t) => <TaskRow key={t.id} t={t} hide={["company", "order", ...(sel !== "all" ? ["fn" as const] : [])]} />)}</div>
            {!open.length && <Empty className="mt-3">Nothing here. Add something above.</Empty>}
            {doneRecent.length > 0 && <button className="mt-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowDone(!showDone)}>{showDone ? "Hide" : "Show"} recently done ({doneRecent.length})</button>}
            {showDone && <div className="divide-y">{doneRecent.map((t) => <TaskRow key={t.id} t={t} compact />)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-start gap-2 space-y-0 pb-2"><div className="mr-auto min-w-0"><CardTitle className="flex items-center gap-2 text-base"><RepeatIcon className="h-4 w-4 text-muted-foreground" />Repeats</CardTitle><CardDescription className="mt-1.5">Things that come back. Each one drops a task into Today when it's due.</CardDescription></div><Button size="sm" variant="outline" onClick={() => openRepeat({ title: "" })}><Plus />Add</Button></CardHeader>
          <CardContent>
            {upcoming.length ? <div>{upcoming.map((r) => <RepeatRow key={r.id} r={r} />)}</div> : <p className="text-sm text-muted-foreground">{reps.length ? "Nothing due in the next 30 days." : "No repeats yet."}</p>}
            {later.length > 0 && <button className="mt-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowLater(!showLater)}>{showLater ? "Hide" : "Show"} later ({later.length})</button>}
            {showLater && <div>{later.map((r) => <RepeatRow key={r.id} r={r} />)}</div>}
            <Suggestions presets={PERSONAL_PRESETS} have={P.repeats} />
          </CardContent>
        </Card>
      </div>
      <div className="mb-3 mt-8 flex flex-wrap items-end gap-3"><div className="mr-auto"><h2 className="text-lg font-semibold">Assets</h2><p className="text-sm text-muted-foreground">Houses, land and vehicles, each with its upkeep, tasks and papers.</p></div>{!adding && <Button variant="brand" onClick={() => setAdding(true)}><Plus />Add asset</Button>}</div>
      {adding && <Card className="mb-3"><CardContent className="pt-5"><NewAsset onDone={() => setAdding(false)} /></CardContent></Card>}
      {P.assets.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{P.assets.map((a) => {
          const I = KIND_ICON[a.kind]; const rs = P.repeats.filter((r) => r.asset === a.id).sort((x, y) => x.next.localeCompare(y.next)); const nx = rs[0]; const due = nx && dueText(nx.next);
          const nOpen = S.tasks.filter((t) => t.asset === a.id && !t.done).length; const late = rs.filter((r) => r.next < today).length;
          return (
            <button key={a.id} onClick={() => setUI({ asset: a.id })} className="min-w-0 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/30">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><I className="h-4.5 w-4.5 h-[18px] w-[18px]" /></span><div className="min-w-0"><div className="truncate font-semibold">{a.name}</div><div className="truncate text-xs text-muted-foreground">{a.detail || KIND_LABEL[a.kind]}</div></div>{late > 0 && <span className="ml-auto shrink-0 rounded-md bg-q1/10 px-1.5 py-0.5 text-[11px] font-semibold text-q1">{late} late</span>}</div>
              <div className="mt-3 flex items-center gap-2 text-xs">{nx ? <><span className="min-w-0 flex-1 truncate">Next: {nx.title}</span><span className={cn("shrink-0 num", due!.c)}>{due!.t}</span></> : <span className="text-muted-foreground">No upkeep set yet. Open to add.</span>}</div>
              <div className="mt-1 text-xs text-muted-foreground">{rs.length} repeat{rs.length === 1 ? "" : "s"} · {nOpen} open task{nOpen === 1 ? "" : "s"}{a.docs?.length ? ` · ${a.docs.length} doc${a.docs.length === 1 ? "" : "s"}` : ""}</div>
            </button>); })}</div>
      ) : !adding && <Empty>No assets yet. Add your houses, land and vehicles, then pick the upkeep for each (service, insurance, tax, pest control…).</Empty>}
      <AssetDialog />
      <RepeatDialog />
    </div>);
}
