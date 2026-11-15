import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import type { Routine } from "@/lib/model";
import { uid } from "@/lib/date";
import { ensureFromLib, libById, loadLib, useLib } from "@/lib/exlib";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openExDetail } from "./ExLibrary";
import { Check, ChevronDown, ChevronUp, Play, Plus } from "lucide-react";

/** Ready-made programs built from library exercises. Items: [library id, sets, reps or seconds]. */
type PItem = [string, number, string];
type PWorkout = { name: string; note?: string; items: PItem[] };
type Program = { id: string; short: string; title: string; goal: string; when: string; tag: string; tips: string[]; workouts: PWorkout[] };

export const PROGRAMS: Program[] = [
  {
    id: "cali", short: "Calisthenics", title: "Calisthenics foundations", tag: "Bodyweight",
    goal: "Learn the basic bodyweight patterns, then work towards pull-ups, dips, L-sit and handstand.",
    when: "3 days a week: A, B, A one week, then B, A, B. Add C on a 4th day once A and B feel easy.",
    tips: [
      "Push-up path: incline, then floor, diamond, archer, pseudo planche. Move up when you can do 3 × 12 clean reps.",
      "Pull-up path: dead hang, active hang, inverted row, negatives, then full pull-ups.",
      "Leave 1 to 2 reps in the tank on every set. Clean form beats more reps.",
    ],
    workouts: [
      { name: "A · Push and legs", items: [["Incline_Push-Up", 2, "10"], ["Pushups", 3, "6-12"], ["vjp-pike-pushup", 3, "6-10"], ["Bodyweight_Squat", 3, "15-20"], ["Split_Squats", 3, "8-12"], ["vjp-hollow-hold", 3, "20-40s"]] },
      { name: "B · Pull and core", items: [["vjp-dead-hang", 2, "30-45s"], ["vjp-active-hang", 3, "10-20s"], ["Inverted_Row", 3, "6-12"], ["vjp-negative-pullup", 3, "3-5"], ["Single_Leg_Glute_Bridge", 3, "10-15"], ["vjp-tuck-lsit", 4, "10-20s"], ["vjp-bird-dog", 2, "8"]] },
      { name: "C · Skills", note: "Short and fresh: do it on a rest day or before A or B.", items: [["vjp-wall-handstand", 5, "20-40s"], ["vjp-crow-pose", 5, "10-20s"], ["vjp-support-hold", 3, "20-30s"], ["vjp-archer-pushup", 3, "4-6"], ["vjp-assisted-pistol", 3, "4-6"], ["vjp-skin-the-cat", 3, "3"]] },
    ],
  },
  {
    id: "iso", short: "Isometrics", title: "Isometric strength", tag: "No equipment",
    goal: "Joint-friendly strength from static holds. Builds tendons, posture and control. It also suits busy days and hotel rooms.",
    when: "2 to 3 times a week, about 20 minutes. Rest 30 to 45 s between holds.",
    tips: [
      "Breathe slowly through the hold. Never hold your breath.",
      "Add 5 to 10 s per hold each week. When you hit the top of the range, move to a harder version.",
      "Hold at about 80% effort. Shaking is fine, sharp pain is not.",
    ],
    workouts: [
      { name: "Full-body holds", items: [["vjp-wall-sit", 3, "45-60s"], ["Plank", 3, "45-60s"], ["Side_Bridge", 2, "30-45s"], ["vjp-hollow-hold", 3, "20-40s"], ["vjp-arch-hold", 3, "20-40s"], ["vjp-glute-bridge-hold", 3, "45s"], ["vjp-split-squat-hold", 2, "30s"], ["vjp-pushup-bottom-hold", 3, "15-20s"]] },
      { name: "Bar and hang holds", note: "Needs a bar or a sturdy branch.", items: [["vjp-dead-hang", 3, "30-60s"], ["vjp-active-hang", 3, "15-20s"], ["vjp-chinup-top-hold", 3, "10-20s"], ["vjp-support-hold", 3, "20-30s"], ["vjp-tuck-lsit", 3, "10-20s"], ["vjp-horse-stance", 2, "45-60s"]] },
    ],
  },
  {
    id: "mob", short: "Mobility", title: "Daily mobility (12 min)", tag: "Every day",
    goal: "A quick full-body routine for mornings or after sitting all day. It keeps hips, spine and shoulders moving.",
    when: "Daily. Move slowly and breathe.",
    tips: ["Mobility works best a little every day, not a lot once a week.", "Do it as your warm-up before any workout too."],
    workouts: [
      { name: "Morning flow", items: [["Cat_Stretch", 1, "10"], ["Worlds_Greatest_Stretch", 1, "5"], ["vjp-open-book", 1, "8"], ["vjp-90-90-hip-switch", 1, "10"], ["vjp-deep-squat-hold", 2, "45s"], ["vjp-downward-dog", 2, "30s"], ["vjp-cobra", 2, "20s"], ["vjp-wall-slides", 1, "10"], ["Arm_Circles", 1, "10"], ["vjp-neck-rolls", 1, "5"]] },
    ],
  },
  {
    id: "flex", short: "Flexibility", title: "Full-body flexibility", tag: "Deep stretch",
    goal: "Long holds to open hips, hamstrings, spine and shoulders, working towards a deep squat, a pike, a pancake and a bridge.",
    when: "3 times a week, 25 to 30 minutes, best after training or in the evening. Do the daily mobility on the other days.",
    tips: [
      "Hold 45 to 90 s and relax into it. Go to mild tension, never pain.",
      "Breathe out to sink deeper. Tension usually lets go after about 30 s.",
      "Take a progress photo of your pike and pancake every 4 weeks.",
    ],
    workouts: [
      { name: "Lower body and spine", items: [["vjp-couch-stretch", 2, "60s"], ["vjp-pigeon", 2, "60s"], ["vjp-seated-pike", 3, "45-60s"], ["vjp-pancake", 3, "45-60s"], ["hx-2571", 2, "60s"], ["vjp-jefferson-curl", 2, "8"], ["vjp-deep-squat-hold", 2, "60s"], ["Childs_Pose", 1, "60s"]] },
      { name: "Upper body and back", items: [["vjp-downward-dog", 2, "45s"], ["vjp-wall-slides", 2, "10"], ["Behind_Head_Chest_Stretch", 2, "30s"], ["Overhead_Triceps", 2, "30s"], ["vjp-child-pose-reach", 2, "30s"], ["vjp-open-book", 2, "8"], ["vjp-bridge-pose", 3, "10-20s"], ["vjp-skin-the-cat", 2, "3"]] },
    ],
  },
  {
    id: "band", short: "Travel bands", title: "Travel: resistance bands only", tag: "Masai Mara",
    goal: "Full workouts with just a band, for safari days, hotel rooms and tents.",
    when: "3 days a week: Upper, Lower and core, then the Circuit. Do daily mobility every morning.",
    tips: [
      "Pack one long loop band (medium) and one mini band. Add a door anchor if you have one.",
      "Anchor on a door, pole or tree trunk at the right height. Check it holds before you pull hard.",
      "Too easy? Step further from the anchor, shorten the band, or slow the lowering to 3 s.",
    ],
    workouts: [
      { name: "Upper", items: [["vjp-band-pushup", 3, "8-15"], ["vjp-band-bent-row", 3, "12-15"], ["hx-0997", 3, "10-12"], ["vjp-band-lat-pulldown", 3, "12-15"], ["vjp-band-face-pull", 3, "15"], ["Band_Pull_Apart", 2, "20"], ["hx-0968", 2, "12-15"], ["Speed_Band_Overhead_Triceps", 2, "12-15"]] },
      { name: "Lower and core", items: [["hx-1004", 4, "15-20"], ["vjp-band-deadlift", 3, "12-15"], ["hx-1001", 3, "10"], ["vjp-band-lateral-walk", 3, "10"], ["hx-1408", 3, "15"], ["hx-0979", 3, "10"], ["hx-0999", 2, "15"], ["vjp-hollow-hold", 2, "30s"]] },
      { name: "Circuit (25 min)", note: "4 rounds: 40 s work, 20 s rest, 1 min between rounds.", items: [["hx-1003", 4, "40s"], ["vjp-band-pushup", 4, "40s"], ["Band_Good_Morning", 4, "40s"], ["hx-1012", 4, "40s"], ["hx-0630", 4, "40s"], ["Band_Pull_Apart", 4, "40s"], ["hx-1160", 4, "40s"]] },
    ],
  },
];

const rName = (p: Program, w: PWorkout) => `${p.short}: ${w.name}`;
const routineFor = (p: Program, w: PWorkout) => S.gym.routines.find((r) => r.name === rName(p, w));

/** Adds the program's workouts as routines (skipping any already added). Returns the routines. */
export async function addProgram(p: Program, only?: PWorkout): Promise<Routine[]> {
  await loadLib();
  const out: Routine[] = [];
  update((S) => {
    for (const w of only ? [only] : p.workouts) {
      let r = S.gym.routines.find((x) => x.name === rName(p, w));
      if (!r) {
        r = { id: "r-" + uid(), name: rName(p, w), note: w.note, items: w.items.flatMap(([id, sets, reps]) => { const x = libById(id); return x ? [{ ex: ensureFromLib(S, x), sets, reps }] : []; }) };
        S.gym.routines.push(r);
      }
      out.push(r);
    }
  });
  return out;
}

function ProgramCard({ p, onStart }: { p: Program; onStart: (r: Routine) => void }) {
  useStore(); const lib = useLib();
  const [open, setOpen] = React.useState(false);
  const added = p.workouts.filter((w) => routineFor(p, w)).length;
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2"><CardTitle className="mr-auto text-base">{p.title}</CardTitle><Badge variant="secondary" className="shrink-0">{p.tag}</Badge></div>
        <CardDescription>{p.goal}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">When:</span> {p.when}</p>
        <div className="divide-y rounded-md border">
          {p.workouts.map((w) => { const r = routineFor(p, w); return (
            <div key={w.name} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{w.name}</span><span className="block truncate text-xs text-muted-foreground">{w.items.length} exercises{w.note ? ` · ${w.note}` : ""}</span></span>
              <Button size="xs" variant="outline" onClick={async () => { const [x] = r ? [r] : await addProgram(p, w); onStart(x); }}><Play />Start</Button>
            </div>); })}
        </div>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{open ? "Hide" : "See"} exercises and tips</button>
        {open && <div className="space-y-3">
          {p.workouts.map((w) => (
            <div key={w.name}><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{w.name}</div>
              <ol className="mt-1 space-y-0.5 text-sm">{w.items.map(([id, sets, reps], i) => { const x = lib?.find((e) => e.id === id); return (
                <li key={i} className="flex gap-2"><button className="min-w-0 flex-1 truncate text-left hover:text-brand hover:underline" onClick={() => x && openExDetail(x.id)}>{x?.n || "…"}</button><span className="shrink-0 text-muted-foreground num">{sets} × {reps}</span></li>); })}</ol></div>))}
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">{p.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>}
        <div className="mt-auto">{added === p.workouts.length
          ? <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-emerald-600" />In your routines</div>
          : <Button size="sm" variant="outline" className="w-full" onClick={async () => { const rs = await addProgram(p); toast(`Added ${rs.length} routine${rs.length === 1 ? "" : "s"} from ${p.title}.`); }}><Plus />Add {p.workouts.length === 1 ? "to my routines" : `all ${p.workouts.length} to my routines`}</Button>}</div>
      </CardContent>
    </Card>);
}

export function Programs({ onStart, className }: { onStart: (r: Routine) => void; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div><h2 className="text-lg font-semibold">Programs</h2><p className="text-sm text-muted-foreground">Ready-made plans. Start a session right away, or add them to your routines and edit them like any other routine.</p></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">{PROGRAMS.map((p) => <ProgramCard key={p.id} p={p} onStart={onStart} />)}</div>
    </section>);
}
