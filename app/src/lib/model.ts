import { addDays, todayStr, uid, weekStart, weekDays } from "./date";

export const FUNCTIONS = ["Contracts", "Planning / Procurement", "Mobilisation", "Operations", "Quality / Safety / Compliance", "Billing", "Receivables", "Payables", "Equipment repairs / maintenance", "Manpower", "Finance", "Incidents"];
export const NETWORKING = "Networking";
export const COMPANIES_DEFAULT = [
  { id: "NIL", short: "NIL", name: "Nityanand Infrastructure Ltd", color: "#0d9488" },
  { id: "NMFP", short: "NMFP", name: "Nityanand Mobile Fuel Pump", color: "#2563eb" },
  { id: "NFS", short: "NFS", name: "Nityanand Fuel Station", color: "#d97706" },
  { id: "GE", short: "Gowda", name: "Gowda Estates", color: "#9333ea" },
];
export const ORDER_STATUS: [string, string][] = [["pipeline", "Pipeline"], ["ongoing", "Ongoing"], ["finalbill", "Final bill pending"], ["halted", "Halted"], ["complete", "Complete"], ["cancelled", "Cancelled"]];
export const PILLARS: Record<string, string> = { fin: "Work", fit: "Fitness", fam: "Family", oth: "Other" };
export const QLABEL: Record<number, string> = { 1: "Do now", 2: "Schedule", 3: "Delegate", 4: "Later" };
export const QSUB: Record<number, string> = { 1: "urgent + important", 2: "important, not urgent", 3: "urgent, not important", 4: "neither" };
export const Q2UI: Record<number, [boolean, boolean]> = { 1: [true, true], 2: [false, true], 3: [true, false], 4: [false, false] };
export const BREAKS = ["Stand up and drink a full glass of water.", "10 push-ups or 20 squats.", "Walk to the window. Look at something far away for 20 seconds.", "Stretch: hips, hamstrings, neck. One minute each side.", "Five slow breaths: 4 seconds in, 6 seconds out.", "Refill water, then write the next tiny step for the task.", "Step outside for two minutes. No phone."];
export const TRIGGERS = ["Stress", "Boredom", "Tired", "Lonely", "Social", "Celebrating", "Late night", "Other"];
export const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export type Goal = { text?: string; rev?: number | null; profit?: number | null; revAct?: number | null; profAct?: number | null };
export type Company = { id: string; short: string; name: string; color: string };
export type Order = { id: string; company: string; title: string; client?: string; kind: "WO" | "PO"; value?: number | null; status: string; job?: string; completion?: string; receivables?: string; notes?: string; legacySite?: string; created?: string };
export type Meeting = { id: string; title: string; who?: string; org?: string; company?: string | null; purpose?: string; date?: string | null; week?: string | null; start?: string; mins?: number; place?: string; status: "planned" | "done" | "cancelled"; outcome?: string; followUp?: string; created?: string };
export type Task = { id: string; t: string; p: string; date: string | null; week?: string | null; u: boolean | null; i: boolean | null; imp?: number | null; top: number; done: boolean; doneAt?: string | null; carried?: number; created?: string;
  company?: string | null; fn?: string | null; order?: string | null; meeting?: string | null; est?: number | null; notes?: string; biz?: string | null; ref?: any };
export type Focus = { id: string; at: string; mins: number; taskId?: string | null; p?: string; label?: string; company?: string | null; fn?: string | null; kind?: "focus" | "manual" | "meeting" };
export type State = {
  settings: { work: number; short: number; long: number; every: number; sound: boolean; netPerWeek?: number };
  projects: any; goals: any; vices: { list: any[] }; weeks: Record<string, any>; fitlog: any; famlog: any;
  work: { companies: Company[]; functions: string[]; goals: Record<string, { y: Record<string, Goal>; m: Record<string, Goal>; w: Record<string, Goal> }>; orders: Order[]; migrated?: boolean; unit?: string };
  net: { meetings: Meeting[] };
  gym: Gym;
  tasks: Task[]; focus: Focus[]; workouts: Workout[];
};
export type Exercise = { id: string; name: string; muscle: string; equip?: string; kind: "weight" | "bw" | "time"; custom?: boolean };
export type WSet = { w?: number | null; r?: number | null; done?: boolean; warm?: boolean };
export type WEx = { id: string; ex: string; sets: WSet[]; note?: string; target?: string };
export type Workout = { id: string; start: string; end?: string | null; name: string; routine?: string | null; ex: WEx[]; notes?: string };
export type Routine = { id: string; name: string; items: { ex: string; sets: number; reps: string }[]; note?: string };
export type Gym = { exercises: Exercise[]; routines: Routine[]; active: Workout | null; rest: number; photos?: any[] };
export function blank(): State {
  return {
    settings: { work: 25, short: 5, long: 15, every: 4, sound: true, netPerWeek: 3 },
    projects: { sites: [], weekGoals: {}, receivablesGoal: "" },
    goals: { turnoverTarget: 100, biz: [], fitness: { targetKg: 72, targetLean: 90, weekly: { strength: 4, cardio: 3, mobility: 3, swim: 1, surf: 0, mma: 1 }, skills: [] }, family: { people: [], weddingTarget: 3, weddingSaved: 0, weddingSteps: [], villaBudget: 0, villaSaved: 0, villaSteps: [], outingEveryDays: 30, checkupEveryDays: 180, nextTrip: "" } },
    vices: { list: [] }, weeks: {}, fitlog: { body: [], sessions: [] }, famlog: { events: [] },
    work: { companies: COMPANIES_DEFAULT.map((c) => ({ ...c })), functions: [...FUNCTIONS], goals: {}, orders: [], migrated: false, unit: "Cr" },
    net: { meetings: [] },
    gym: { exercises: [], routines: [], active: null, rest: 90 },
    tasks: [], focus: [], workouts: [],
  };
}

/* ---------- one-time move of v1 "projects" (sites → departments → items) into orders + tasks ---------- */
const DEPT_FN: Record<string, string | null> = { Contracts: "Contracts", Operations: "Operations", Procurement: "Planning / Procurement", Planning: "Planning / Procurement", Equipment: "Equipment repairs / maintenance", Billing: "Billing", Payables: "Payables", Incidents: "Incidents", Commission: "Finance", Receivables: "Receivables", Manpower: "Manpower" };
const ST_MAP = (s: string) => { s = (s || "").toUpperCase(); return s.startsWith("PAUSED") ? "pipeline" : s.startsWith("RESIDUAL") ? "finalbill" : s.startsWith("HALTED") ? "halted" : s.startsWith("COMPLETE") ? "complete" : s.startsWith("CANCEL") ? "cancelled" : "ongoing"; };
export function migrate(S: State): boolean {
  if (S.work.migrated) return false;
  const sites = (S.projects && S.projects.sites) || [];
  // map v1 business ids onto companies (v1 used NIL/NMFP/NFS/GE)
  sites.forEach((site: any) => {
    const oid = "o-" + site.id;
    const live = !["complete", "cancelled"].includes(ST_MAP(site.status));
    if (!S.work.orders.some((o) => o.id === oid)) {
      const notes: string[] = [];
      Object.entries(site.depts || {}).forEach(([dp, arr]: any) => { const n = (arr || []).filter((i: any) => i.note).map((i: any) => i.t); if (n.length) notes.push(`${dp}: ${n.join(", ")}`); });
      S.work.orders.push({ id: oid, company: site.business || "NIL", title: site.name || "Untitled", kind: "WO", status: ST_MAP(site.status), job: site.jobType || "", completion: site.exp || "", receivables: site.receivables || "", notes: notes.join("\n"), legacySite: site.id, created: new Date().toISOString() });
    }
    Object.entries(site.depts || {}).forEach(([dp, arr]: any) => (arr || []).forEach((it: any) => {
      if (it.note || it.d) return;
      if (!live && !S.tasks.some((t) => t.ref && t.ref.item === it.id && !t.done)) return; // finished sites: leave leftovers in the old projects backup
      const fn = DEPT_FN[dp] ?? null;
      const linked = S.tasks.find((t) => t.ref && t.ref.item === it.id && !t.done);
      const [u, i] = it.q ? Q2UI[it.q] : [null, null];
      if (linked) { Object.assign(linked, { company: site.business || "NIL", fn, order: oid, t: it.t }); if (it.q) { linked.u = u; linked.i = i; } return; }
      const id = "m-" + it.id;
      if (S.tasks.some((t) => t.id === id)) return;
      S.tasks.push({ id, t: it.t, p: "fin", date: null, week: null, u, i, imp: null, top: 0, done: false, carried: 0, created: new Date().toISOString(), company: site.business || "NIL", fn, order: oid });
    }));
  });
  // existing finance tasks: carry their v1 business tag as company
  S.tasks.forEach((t) => { if (t.company === undefined && t.p === "fin" && t.biz && t.biz !== "personal") t.company = t.biz; });
  S.work.migrated = true;
  return true;
}

/* ---------- task helpers ---------- */
export const rated = (t: Task) => t.u != null && t.i != null;
export function quad(t: Task): number | null { if (!rated(t)) return null; return t.u && t.i ? 1 : t.i ? 2 : t.u ? 3 : 4; }
export const score = (t: Task) => (t.i ? 6 : 0) + (t.u ? 3 : 0) + (t.imp || 1) * 1.5;
export const tasksOn = (S: State, d: string) => S.tasks.filter((t) => t.date === d);
export const findTask = (S: State, id?: string | null) => (id ? S.tasks.find((t) => t.id === id) : undefined);
export const inWeek = (t: Task, ws: string) => { const end = addDays(ws, 6); return (t.date && t.date >= ws && t.date <= end) || (!t.date && t.week === ws); };
export function newTask(S: State, text: string, extra: Partial<Task> = {}): Task {
  const t: Task = { id: uid(), t: text.trim(), p: extra.company || extra.fn ? "fin" : "oth", date: null, week: null, u: null, i: null, imp: null, top: 0, done: false, carried: 0, created: new Date().toISOString(), company: null, fn: null, order: null, ...extra };
  if (t.company || t.fn || t.order) t.p = "fin";
  S.tasks.push(t); return t;
}
export function setQ(t: Task, q: number) { if (q) { [t.u, t.i] = Q2UI[q]; } else { t.u = null; t.i = null; } }
export function setDone(t: Task, v: boolean) { t.done = v; t.doneAt = v ? new Date().toISOString() : null; }
export const topOf = (S: State, d: string) => tasksOn(S, d).filter((t) => t.top > 0).sort((a, b) => a.top - b.top);
export function normalizeTop(S: State, d: string) { topOf(S, d).forEach((t, i) => (t.top = i + 1)); }
export function suggestTop3(S: State, d: string) {
  const open = tasksOn(S, d).filter((t) => !t.done).sort((a, b) => score(b) - score(a));
  tasksOn(S, d).forEach((t) => (t.top = 0));
  open.slice(0, 3).forEach((t, i) => (t.top = i + 1));
}
/* ---------- labels ---------- */
export const company = (S: State, id?: string | null) => S.work.companies.find((c) => c.id === id);
export const companyName = (S: State, id?: string | null) => { const c = company(S, id); return c ? c.short : id || ""; };
export const orderOf = (S: State, id?: string | null) => (id ? S.work.orders.find((o) => o.id === id) : undefined);
export const liveOrder = (o: Order) => !["complete", "cancelled"].includes(o.status);
/* ---------- time ---------- */
export type TimeRow = { company: string; fn: string; mins: number };
export function timeEntries(S: State, from: string, to: string): TimeRow[] {
  const rows: TimeRow[] = [];
  S.focus.forEach((f) => {
    const d = f.at.slice(0, 10); if (d < from || d > to) return;
    const t = findTask(S, f.taskId);
    const c = f.company ?? t?.company ?? (t && t.p !== "fin" ? "_life" : null);
    rows.push({ company: c || "_none", fn: f.fn ?? t?.fn ?? (t && t.p !== "fin" ? PILLARS[t.p] : "") ?? "", mins: f.mins || 0 });
  });
  S.net.meetings.forEach((m) => { if (m.status !== "done" || !m.date || m.date < from || m.date > to) return; rows.push({ company: m.company || "_none", fn: NETWORKING, mins: m.mins || 60 }); });
  S.workouts.forEach((w) => { const d = w.start.slice(0, 10); if (!w.end || d < from || d > to) return; rows.push({ company: "_life", fn: "Workout", mins: Math.max(1, Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000)) }); });
  return rows;
}
export const weekRange = (ws: string) => [ws, addDays(ws, 6)] as const;
export { todayStr, weekStart, weekDays };

/* ---------- gym ---------- */
const EX: [string, string, string, Exercise["kind"]][] = [
  ["Barbell bench press", "Chest", "Barbell", "weight"], ["Incline dumbbell press", "Chest", "Dumbbell", "weight"], ["Dumbbell bench press", "Chest", "Dumbbell", "weight"], ["Cable fly", "Chest", "Cable", "weight"], ["Push-up", "Chest", "Bodyweight", "bw"], ["Chest dip", "Chest", "Bodyweight", "bw"],
  ["Pull-up", "Back", "Bodyweight", "bw"], ["Lat pulldown", "Back", "Cable", "weight"], ["Barbell row", "Back", "Barbell", "weight"], ["Seated cable row", "Back", "Cable", "weight"], ["One-arm dumbbell row", "Back", "Dumbbell", "weight"], ["Deadlift", "Back", "Barbell", "weight"],
  ["Overhead press", "Shoulders", "Barbell", "weight"], ["Seated dumbbell press", "Shoulders", "Dumbbell", "weight"], ["Lateral raise", "Shoulders", "Dumbbell", "weight"], ["Face pull", "Shoulders", "Cable", "weight"], ["Rear delt fly", "Shoulders", "Dumbbell", "weight"],
  ["Back squat", "Legs", "Barbell", "weight"], ["Front squat", "Legs", "Barbell", "weight"], ["Romanian deadlift", "Legs", "Barbell", "weight"], ["Leg press", "Legs", "Machine", "weight"], ["Bulgarian split squat", "Legs", "Dumbbell", "weight"], ["Walking lunge", "Legs", "Dumbbell", "weight"], ["Leg curl", "Legs", "Machine", "weight"], ["Leg extension", "Legs", "Machine", "weight"], ["Hip thrust", "Legs", "Barbell", "weight"], ["Standing calf raise", "Legs", "Machine", "weight"],
  ["Barbell curl", "Arms", "Barbell", "weight"], ["Dumbbell curl", "Arms", "Dumbbell", "weight"], ["Hammer curl", "Arms", "Dumbbell", "weight"], ["Triceps pushdown", "Arms", "Cable", "weight"], ["Overhead triceps extension", "Arms", "Cable", "weight"], ["Skull crusher", "Arms", "Barbell", "weight"],
  ["Plank", "Core", "Bodyweight", "time"], ["Hanging leg raise", "Core", "Bodyweight", "bw"], ["Cable crunch", "Core", "Cable", "weight"], ["Ab wheel rollout", "Core", "Bodyweight", "bw"],
  ["Kettlebell swing", "Full body", "Kettlebell", "weight"], ["Farmer's carry", "Full body", "Dumbbell", "weight"], ["Burpee", "Full body", "Bodyweight", "bw"],
];
export const MUSCLES = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Full body"];
export function seedGym(S: State) {
  if (S.gym.exercises.length) return false;
  S.gym.exercises = EX.map(([name, muscle, equip, kind]) => ({ id: "x-" + name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, ""), name, muscle, equip, kind }));
  const id = (n: string) => "x-" + n.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");
  S.gym.routines = [
    { id: "r-push", name: "Push", items: [["Barbell bench press", 4, "6-8"], ["Seated dumbbell press", 3, "8-10"], ["Incline dumbbell press", 3, "8-12"], ["Lateral raise", 3, "12-15"], ["Triceps pushdown", 3, "10-12"]].map(([n, s, r]) => ({ ex: id(n as string), sets: s as number, reps: r as string })) },
    { id: "r-pull", name: "Pull", items: [["Pull-up", 4, "6-10"], ["Barbell row", 3, "6-8"], ["Seated cable row", 3, "10-12"], ["Face pull", 3, "12-15"], ["Dumbbell curl", 3, "10-12"]].map(([n, s, r]) => ({ ex: id(n as string), sets: s as number, reps: r as string })) },
    { id: "r-legs", name: "Legs", items: [["Back squat", 4, "5-8"], ["Romanian deadlift", 3, "8-10"], ["Bulgarian split squat", 3, "10"], ["Leg curl", 3, "12"], ["Standing calf raise", 4, "12-15"], ["Hanging leg raise", 3, "10-15"]].map(([n, s, r]) => ({ ex: id(n as string), sets: s as number, reps: r as string })) },
  ];
  return true;
}
export const e1rm = (w?: number | null, r?: number | null) => (w && r ? w * (1 + Math.min(r, 12) / 30) : 0);
export const exById = (S: State, id: string) => S.gym.exercises.find((e) => e.id === id);
/** Most recent finished workout that included this exercise (before `before` ISO). */
export function lastFor(S: State, exId: string, before?: string) {
  const ws = S.workouts.filter((w) => w.end && (!before || w.start < before) && w.ex.some((e) => e.ex === exId)).sort((a, b) => b.start.localeCompare(a.start));
  const w = ws[0]; if (!w) return null;
  return { w, sets: w.ex.find((e) => e.ex === exId)!.sets.filter((s) => s.done && !s.warm) };
}
export const volume = (w: Workout) => w.ex.reduce((n, e) => n + e.sets.reduce((m, s) => m + (s.done && !s.warm ? (s.w || 0) * (s.r || 0) : 0), 0), 0);
export const doneSets = (w: Workout) => w.ex.reduce((n, e) => n + e.sets.filter((s) => s.done && !s.warm).length, 0);
