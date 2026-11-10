/* Data store + Google Sheet sync. Same protocol and Sheet as v1: docs map {key:{v}|{items}} pushed to the Apps Script web app.
   Every edit is cached in this browser at once and its records marked unsaved; unsaved records win over what the Sheet sends
   until the Sheet confirms it stored them. */
import { useSyncExternalStore } from "react";
import { blank, type State, migrate, seedGym } from "./model";

const FIXED = ["settings", "projects", "goals", "vices", "weeks", "fitlog", "famlog", "work", "net", "gym", "billing"] as const;
const LS_DOCS = "lp2-docs", LS_DIRTY = "lp2-dirty", LS_CFG = "lp-sheet";
const isObj = (x: any) => x && typeof x === "object" && !Array.isArray(x);
export const canon = (x: any) => JSON.stringify(x, (_k, v) => (isObj(v) ? Object.keys(v).sort().reduce((o: any, kk) => ((o[kk] = v[kk]), o), {}) : v));
function deepMerge(base: any, over: any): any { if (!isObj(base) || !isObj(over)) return over === undefined ? base : over; const o = { ...base }; for (const k in over) o[k] = deepMerge(base[k], over[k]); return o; }

const known = new Set<string>();
function toDocs(st: State) {
  const m: Record<string, any> = {};
  FIXED.forEach((k) => (m[k] = { v: (st as any)[k] }));
  const tb: Record<string, any[]> = {}, fb: Record<string, any[]> = {};
  st.tasks.forEach((t) => { const b = "tasks-" + (t.date ? t.date.slice(0, 7) : "someday"); (tb[b] = tb[b] || []).push(t); });
  st.focus.forEach((f) => { const b = "focus-" + f.at.slice(0, 7); (fb[b] = fb[b] || []).push(f); });
  const gb: Record<string, any[]> = {};
  st.workouts.forEach((w) => { const b = "gym-" + w.start.slice(0, 7); (gb[b] = gb[b] || []).push(w); });
  for (const k in tb) m[k] = { items: tb[k] };
  for (const k in fb) m[k] = { items: fb[k] };
  for (const k in gb) m[k] = { items: gb[k] };
  for (const k of known) if (/^(tasks|focus|gym)-/.test(k) && !m[k]) m[k] = { items: [] };
  return m;
}
function fromDocs(map: Record<string, any>): State {
  const st = blank();
  FIXED.forEach((k) => { if (map[k] && map[k].v !== undefined) (st as any)[k] = deepMerge((st as any)[k], map[k].v); });
  for (const k in map) {
    known.add(k);
    if (k.startsWith("tasks-")) st.tasks.push(...(map[k].items || []));
    if (k.startsWith("focus-")) st.focus.push(...(map[k].items || []));
    if (k.startsWith("gym-")) st.workouts.push(...(map[k].items || []));
  }
  return st;
}

export type SyncMode = "loading" | "synced" | "saving" | "dirty" | "local" | "error";
export let S: State = blank();
export let CFG: { url: string; token: string } | null = (() => { try { return JSON.parse(localStorage.getItem(LS_CFG) || "null"); } catch { return null; } })();
let dbReady = false, inFlight = false, again = false, lastErr = "";
let cur: Record<string, string> = {};
const DIRTY = new Set<string>((() => { try { return JSON.parse(localStorage.getItem(LS_DIRTY) || "[]"); } catch { return []; } })());
export const sync = { mode: (CFG ? "loading" : "local") as SyncMode, err: "", saving: false };

let version = 0;
const subs = new Set<() => void>();
function emit() { version++; subs.forEach((f) => f()); }
export function useStore() { useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => version); return S; }

let toastFn: (m: string) => void = () => {};
export function onToast(f: (m: string) => void) { toastFn = f; }
export const toast = (m: string) => toastFn(m);

function setSync(m: SyncMode, extra?: string) { sync.mode = m; sync.err = extra || lastErr; emit(); }
function saveDirty() { try { localStorage.setItem(LS_DIRTY, JSON.stringify([...DIRTY])); } catch {} }
function cacheLocal() { try { localStorage.setItem(LS_DOCS, JSON.stringify(toDocs(S))); } catch (e: any) { lastErr = "browser storage: " + e.message; } }
function snapCur() { const m = toDocs(S); cur = {}; for (const k in m) cur[k] = canon(m[k]); }
function markDirty() { const m = toDocs(S); let ch = false; for (const k in m) { const j = canon(m[k]); if (cur[k] !== j) { cur[k] = j; known.add(k); if (!DIRTY.has(k)) { DIRTY.add(k); ch = true; } } } if (ch) saveDirty(); }

let saveTimer: any = null;
/** Mutate state, then cache, mark unsaved and schedule an autosave. */
export function update(fn: (s: State) => void) {
  fn(S);
  markDirty(); cacheLocal();
  if (CFG && DIRTY.size) sync.mode = "dirty";
  clearTimeout(saveTimer);
  if (CFG && dbReady) saveTimer = setTimeout(() => pushNow(false), 2500);
  emit();
}
export const rerender = emit;

async function callSheet(method: "GET" | "POST", body?: any) {
  const c = CFG!;
  const url = c.url + (method === "GET" ? (c.url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(c.token) : "");
  const r = await fetch(url, method === "GET" ? { redirect: "follow" } : { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token: c.token, ...body }) });
  if (!r.ok) throw new Error("Sheet answered " + r.status);
  let j: any; try { j = await r.json(); } catch { throw new Error("Sheet didn't answer with data. Check the web app URL and that it's deployed for Anyone."); }
  if (!j.ok) throw new Error(j.error || "Sheet refused");
  return j;
}
/** Uploads a file to the user's Google Drive through the Sheet's Apps Script. Throws "UPGRADE" if the script is the older version. */
export async function uploadFile(file: File, folder: string): Promise<{ id: string; url: string; name: string; size: number }> {
  if (!CFG) throw new Error("Connect the Google Sheet first (Review tab).");
  if (file.size > 20 * 1024 * 1024) throw new Error("Files up to 20 MB only. Paste a Drive link for bigger ones.");
  const data: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  const j = await callSheet("POST", { upload: { name: file.name, mime: file.type, data, folder } });
  if (!j.file) throw new Error("UPGRADE");
  return j.file;
}
export async function pushNow(manual: boolean) {
  if (!CFG) { if (manual) toast("Connect your Google Sheet first (Review → Your data)."); return; }
  if (inFlight) { again = true; return; }
  clearTimeout(saveTimer);
  const m = toDocs(S); const keys = [...DIRTY].filter((k) => m[k]);
  if (!keys.length) { setSync("synced"); if (manual) toast("Already saved. Nothing new to store."); return; }
  const docs: any = {}; const sent: any = {};
  keys.forEach((k) => { docs[k] = m[k]; sent[k] = canon(m[k]); });
  inFlight = true; sync.saving = true; setSync("saving");
  try {
    const j = await callSheet("POST", { docs });
    (j.saved || keys).forEach((k: string) => { if (cur[k] === sent[k]) DIRTY.delete(k); });
    saveDirty(); lastErr = "";
    setSync(DIRTY.size ? "dirty" : "synced");
    if (manual) toast("Saved to your Google Sheet.");
  } catch (e: any) { lastErr = e.message || String(e); setSync("error"); if (manual) toast("Not saved: " + lastErr); }
  finally { inFlight = false; sync.saving = false; emit(); if (again) { again = false; setTimeout(() => pushNow(false), 500); } }
}
function applyRemote(docs: Record<string, any>) {
  const incoming: any = {};
  for (const k in docs) { if (DIRTY.has(k)) continue; const j = canon(docs[k]); known.add(k); if (cur[k] !== j) incoming[k] = docs[k]; }
  S = fromDocs({ ...toDocs(S), ...incoming }); snapCur(); cacheLocal();
}
export async function connect() {
  if (!CFG) { dbReady = false; setSync("local"); runMigrate(); return; }
  setSync("loading");
  try {
    const j = await callSheet("GET"); applyRemote(j.docs || {}); dbReady = true; lastErr = "";
    runMigrate();
    if (DIRTY.size) pushNow(false); else setSync("synced");
  } catch (e: any) { lastErr = e.message || String(e); setSync("error", "couldn't load from Sheet (" + lastErr + ")"); }
}
function runMigrate() { const m = migrate(S); const g = seedGym(S); if (m || g) update(() => {}); else emit(); if (m) toast("Moved your projects into the new Companies and Sales orders layout."); }
export function setConfig(c: { url: string; token: string } | null) {
  CFG = c; try { if (c) localStorage.setItem(LS_CFG, JSON.stringify(c)); else localStorage.removeItem(LS_CFG); } catch {}
  dbReady = false; return connect();
}
export function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_DOCS) || localStorage.getItem("lp-docs"); // first run: reuse v1's cache
    if (raw) S = fromDocs(JSON.parse(raw));
  } catch {}
  snapCur();
}
export function beaconSave() {
  cacheLocal(); if (!CFG || !DIRTY.size) return;
  const m = toDocs(S); const docs: any = {}; [...DIRTY].forEach((k) => { if (m[k]) docs[k] = m[k]; });
  try { navigator.sendBeacon(CFG.url, new Blob([JSON.stringify({ token: CFG.token, docs })], { type: "text/plain;charset=utf-8" })); } catch {}
}
export const exportDocs = () => toDocs(S);
export function importDocs(d: any) { S = fromDocs(d); update(() => {}); }
export const isReady = () => dbReady;
