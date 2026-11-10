/* Billing link: reads the Receivables Control Room's Google Sheet (read-only) and keeps a computed snapshot in the planner.
   The bill maths below is ported from nil-billing-app (computeBills, buildRates, allocateAdvances, aggregate, computeCommits)
   so the numbers match what that app shows. Sign-in uses the billing app's own OAuth client (same github.io origin). */
import { S, update } from "./store";

export type BBill = { id: string; client: string; src: string; status: string; billno: string; seq: string; type: string; site: string; date: string; base: number; total: number; net: number; paid: number; bal: number; held: number; ret: number; stage: string };
export type BCommit = { id: string; billId: string; client: string; date: string; rem: number; st: string; note: string };
export type BPipe = { id: string; client: string; site: string; desc: string; kind: string; amt: number; stage: string; target: string };
export type BWo = { id: string; client: string; site: string; woNo: string; kind: string; amt: number; status: string; start: string; end: string };
export type Billing = { at: string; asOn: string; bills: BBill[]; commits: BCommit[]; pipe: BPipe[]; wos: BWo[]; T: { net: number; inv: number; pi: number; cred: number; held: number; ret: number; nInv: number; nPi: number; heldExtra?: number } };

/* ---------- parsing (same rules as the billing app) ---------- */
const BILL_COLS = ["id", "client", "src", "status", "billno", "type", "seq", "site", "date", "base", "total", "ret", "adv", "oth", "tds", "pay", "held", "stage", "dateEst", "remark"];
const TABS: Record<string, string[]> = {
  bills: BILL_COLS.concat(["deleted", "payAdj"]), proformas: BILL_COLS, direct_bills: ["id", "client", "date", "amt", "note"], receipts: ["id", "client", "billId", "amt", "date", "mode"],
  advances: ["id", "client", "site", "date", "amt", "pct", "note"], commitments: ["id", "billId", "client", "date", "amt", "status", "note", "by", "loggedOn", "closedOn"],
  pipeline: ["id", "client", "site", "desc", "kind", "amt", "stage", "owner", "target", "note", "billId"], work_orders: ["id", "client", "site", "woNo", "kind", "woDate", "amt", "start", "end", "status"],
  adv_bills: ["id", "advId", "billId", "amt"], overrides: ["billId", "status", "billno", "tds", "ret", "adv", "oth", "date", "base", "total"], settings: ["key", "value"], meta: ["key", "value"],
};
const KEY: Record<string, string> = { overrides: "billId", settings: "key" };
const NUMC: Record<string, 1> = { base: 1, total: 1, ret: 1, adv: 1, oth: 1, tds: 1, pay: 1, held: 1, amt: 1, pct: 1, payAdj: 1 };
const BOOLC: Record<string, 1> = { dateEst: 1, deleted: 1 };
const isoFromSerial = (v: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10);
function toIso(v: any) {
  if (typeof v === "number") return isoFromSerial(v);
  const s = String(v == null ? "" : v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); if (m) { let y = +m[3]; if (y < 100) y += 2000; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  return s;
}
const toBool = (v: any) => v === true || /^(true|yes|y|1)$/i.test(String(v == null ? "" : v).trim());
function toNum(v: any, blank: any) { if (v === "" || v == null) return blank; const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[₹,\s]/g, "")); return isNaN(n) ? blank : n; }
function cellIn(col: string, v: any) { if (col === "payAdj") return toNum(v, null); if (NUMC[col]) return toNum(v, 0); if (BOOLC[col]) return toBool(v); if (col === "date") return toIso(v); return v == null ? "" : String(v); }
const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: any) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const toD = (iso: string) => new Date(iso + "T00:00:00");

/** Rows of every tab (header row first) → tab objects, matched by header name. */
export function parseTabs(grid: Record<string, any[][]>) {
  const raw: Record<string, any[]> = {};
  for (const t in TABS) {
    const rows = grid[t] || []; const hdr = (rows[0] || []).map((h: any) => String(h ?? "").trim());
    const kcol = hdr.indexOf(KEY[t] || TABS[t][0]);
    raw[t] = rows.slice(1).filter((r) => r[kcol] !== undefined && r[kcol] !== null && String(r[kcol]).trim() !== "")
      .map((r) => { const o: any = {}; TABS[t].forEach((c) => { const i = hdr.indexOf(c); o[c] = cellIn(c, i < 0 ? undefined : r[i]); }); return o; });
  }
  return raw;
}

/* ---------- maths (ported) ---------- */
export function compute(raw: Record<string, any[]>): Billing {
  const kv = (rows: any[]) => { const o: any = {}; rows.forEach((x) => { o[String(x.key).trim()] = x.value; }); return o; };
  const st = kv(raw.settings);
  const settings = { asOn: st.asOn ? toIso(st.asOn) : new Date().toISOString().slice(0, 10), est: st.est === undefined || st.est === "" ? true : toBool(st.est), showD: st.showD === undefined || st.showD === "" ? true : toBool(st.showD) };
  const deleted: any = {}, payAdj: any = {}, overrides: any = {};
  const bills0 = raw.bills.map((b) => { if (b.deleted) deleted[b.id] = true; if (b.payAdj != null) payAdj[b.id] = b.payAdj; const o: any = {}; BILL_COLS.forEach((c) => (o[c] = b[c])); return o; });
  const pis = raw.proformas.map((p) => ({ ...p, status: p.status || "PI" }));
  const receipts = raw.receipts.map((x) => ({ ...x, mode: x.mode === "D" ? "D" : "" }));
  raw.overrides.forEach((o) => { overrides[o.billId] = { status: o.status, billno: o.billno, manual: true, tds: toNum(o.tds, 0), ret: toNum(o.ret, 0), adv: toNum(o.adv, 0), oth: toNum(o.oth, 0), date: o.date || "", base: toNum(o.base, 0), total: toNum(o.total, 0) }; });
  const advances = raw.advances, advbills = raw.adv_bills;
  const vr = () => receipts.filter((r) => settings.showD || r.mode !== "D");
  // buildRates
  const m: any = {}; bills0.forEach((b) => { if (b.status === "PI" || b.status === "Adv") return; const c = m[b.client] || (m[b.client] = { rb: 0, rr: 0, ab: 0, ar: 0 }); if (b.ret > 0) { c.rb += b.base; c.rr += b.ret; } if (b.adv > 0) { c.ab += b.base; c.ar += b.adv; } });
  const RATES: any = {}; Object.keys(m).forEach((k) => { const c = m[k]; RATES[k] = { ret: c.rb ? Math.round((c.rr / c.rb) * 200) / 200 : 0, adv: c.ab ? Math.round((c.ar / c.ab) * 200) / 200 : 0 }; });
  const rateOf = (client: string) => RATES[client] || { ret: 0, adv: 0 };
  // computeBills
  const asOn = toD(settings.asOn); const list: any[] = [];
  bills0.forEach((b) => { if (!deleted[b.id]) list.push({ added: false, ...b }); });
  pis.forEach((p) => list.push({ pay: 0, remark: "", added: true, manual: true, ...p, status: p.status || "PI" }));
  if (settings.showD) raw.direct_bills.forEach((p) => list.push({ id: p.id, client: p.client, src: "NIL", status: "TI", billno: "", type: "Direct", seq: "", site: "", date: p.date, base: p.amt, total: p.amt, ret: 0, adv: 0, oth: 0, tds: 0, pay: 0, held: 0, stage: "", dateEst: false, remark: p.note || "", added: true, manual: true, direct: true }));
  list.forEach((b) => {
    const o = overrides[b.id];
    if (o) {
      if (b.status === "PI" && o.status && o.status !== "PI") { b.piNo = b.billno; b.piDate = b.date; }
      if (o.status) b.status = o.status; if (o.billno) b.billno = o.billno;
      if (o.date) { b.date = o.date; b.dateEst = false; }
      if (o.base > 0) { b.base = o.base; if (o.total > 0) b.total = o.total; }
      if (o.manual) { b.tds = o.tds || 0; b.ret = o.ret || 0; b.adv = o.adv || 0; b.oth = o.oth || 0; b.manual = true; }
      if (b.piDate && b.stage) b.stage = b.client.indexOf("MEIL") >= 0 ? "Not booked by MEIL" : "";
    }
    let ret = b.ret || 0, adv = b.adv || 0; const oth = b.oth || 0; let tds = b.tds || 0;
    if (payAdj[b.id] != null) b.pay = payAdj[b.id];
    b.estAdv = false;
    if (b.status === "PI" && !b.manual && settings.est && ret + adv + oth + tds === 0) {
      const r = rateOf(b.client); tds = Math.round(b.base * (b.src === "NIL" ? 0.02 : 0)); ret = Math.round(b.base * r.ret);
      if (advances.some((a) => a.client === b.client)) b.estAdv = true; else adv = Math.round(b.base * r.adv);
    }
    b.eRet = ret; b.eAdv = adv; b.eOth = oth; b.eTds = tds;
    b.rc = vr().filter((r) => r.billId === b.id).reduce((a, r) => a + (+r.amt || 0), 0);
    b.paid = (b.pay || 0) + b.rc;
    b.days = Math.round((asOn.getTime() - toD(b.date).getTime()) / 864e5);
  });
  // allocateAdvances (only its effect on eAdv matters here)
  const advMatches = (a: any, b: any) => a.client === b.client && (!a.site || norm(a.site) === norm(b.site || "")) && (!a.date || !b.date || b.date >= a.date);
  const out = advances.slice().sort((x, y) => (x.date || "").localeCompare(y.date || "") || String(x.id).localeCompare(String(y.id))).map((a) => ({ a, amt: +a.amt || 0, pct: +a.pct || 0, rec: 0 }));
  const left = (x: any) => x.amt - x.rec, byId: any = {}, links: any = {}, rest0: any = {};
  out.forEach((x) => (byId[x.a.id] = x));
  advbills.forEach((l) => { if (byId[l.advId]) (links[l.billId] = links[l.billId] || []).push(l); });
  const sorted = list.slice().sort((x, y) => (x.date || "").localeCompare(y.date || ""));
  sorted.forEach((b) => { if (b.status === "Adv" || !links[b.id]) return; if (b.estAdv) b.eAdv = Math.round(links[b.id].reduce((t: number, l: any) => t + (+l.amt || 0), 0)); let rest = b.eAdv; links[b.id].forEach((l: any) => { const take = Math.min(rest, +l.amt || 0); if (take >= 0.5) { byId[l.advId].rec += take; rest -= take; } }); rest0[b.id] = rest; });
  sorted.forEach((b) => {
    if (b.status === "Adv") return; if (links[b.id] && !(rest0[b.id] >= 0.5)) return;
    const cand = out.filter((x) => advMatches(x.a, b)); if (!cand.length) return;
    if (b.estAdv && !links[b.id]) { const x = cand.filter((c) => left(c) >= 1)[0]; b.eAdv = x ? Math.round(Math.min((b.base * x.pct) / 100, left(x))) : 0; }
    let rest = links[b.id] ? rest0[b.id] : b.eAdv;
    for (let i = 0; i < cand.length && rest >= 0.5; i++) { const x = cand[i], take = i === cand.length - 1 ? rest : Math.min(rest, Math.max(0, left(x))); if (take <= 0) continue; x.rec += take; rest -= take; }
  });
  list.forEach((b) => { b.ded = b.eRet + b.eAdv + b.eOth + b.eTds; b.net = b.total - b.ded; b.bal = round2(b.net - b.paid); });
  // aggregate (totals)
  const T = { net: 0, inv: 0, pi: 0, cred: 0, held: 0, ret: 0, nInv: 0, nPi: 0 };
  list.forEach((b) => {
    if (b.status !== "PI") T.ret += b.eRet;
    if (b.bal >= 1) { if (b.status === "PI") { T.pi += b.bal; T.nPi++; } else { T.inv += b.bal; T.nInv++; T.held += Math.min(b.held || 0, b.bal); } }
    else if (b.bal <= -1) T.cred += -b.bal;
  });
  vr().forEach((r) => { if (!r.billId) T.cred += +r.amt || 0; });
  T.net = T.inv + T.pi - T.cred;
  const extra = toNum(kv(raw.meta || []).gstHeldExtra, 0); (T as any).heldExtra = extra;
  // computeCommits (open promises only)
  const clientBal = (name: string) => list.filter((b) => b.client === name && b.status !== "Adv" && b.bal >= 1).reduce((a, b) => a + b.bal, 0);
  const commits: BCommit[] = []; const by: Record<string, any[]> = {};
  raw.commitments.map((c) => ({ ...c, loggedOn: toIso(c.loggedOn), closedOn: toIso(c.closedOn), date: toIso(c.date), status: c.status || "open" })).forEach((c) => { const k = c.billId || "@" + c.client; (by[k] = by[k] || []).push(c); });
  Object.keys(by).forEach((id) => {
    const acct = id.charAt(0) === "@", client = acct ? id.slice(1) : "", b = acct ? null : list.find((x) => x.id === id) || null;
    const items = by[id].map((c) => ({ c, got: c.status === "done" ? +c.amt || 0 : 0, rem: 0, st: "" })).sort((x, y) => (x.c.date || "").localeCompare(y.c.date || "") || (x.c.loggedOn || "").localeCompare(y.c.loggedOn || ""));
    const live = items.filter((x) => x.c.status !== "cancelled" && x.c.status !== "done");
    receipts.filter((r) => (acct ? r.client === client && !r.billId : r.billId === id)).sort((x, y) => (x.date || "").localeCompare(y.date || "")).forEach((r) => {
      let lft = +r.amt || 0;
      live.forEach((x) => { const lo = x.c.loggedOn || settings.asOn, from = lo < settings.asOn ? lo : settings.asOn; if (lft <= 0 || (r.date || "") < from || (x.c.status === "replaced" && (r.date || "") > (x.c.closedOn || ""))) return; const take = Math.min(lft, (+x.c.amt || 0) - x.got); if (take > 0) { x.got += take; lft -= take; } });
    });
    items.forEach((x) => {
      x.rem = round2((+x.c.amt || 0) - x.got);
      x.st = x.c.status === "cancelled" ? "cancelled" : x.rem < 1 ? "received" : x.c.status === "replaced" ? "broken" : (x.c.date || "") < settings.asOn ? "broken" : x.got > 0 ? "part" : "promised";
      const open = x.c.status === "open" && x.rem >= 1 && (acct ? clientBal(client) >= 1 : !!b && b.bal >= 1);
      if (open) commits.push({ id: x.c.id, billId: x.c.billId || "", client: x.c.client || (b ? b.client : client), date: x.c.date, rem: x.rem, st: x.st, note: x.c.note || "" });
    });
  });
  const bills: BBill[] = list.filter((b) => b.status !== "Adv").map((b) => ({ id: b.id, client: b.client, src: b.src || "NIL", status: b.status, billno: b.billno || "", seq: b.seq || "", type: b.type || "", site: b.site || "", date: b.date || "", base: +b.base || 0, total: +b.total || 0, net: round2(b.net), paid: round2(b.paid), bal: b.bal, held: +b.held || 0, ret: b.eRet, stage: b.stage || "" }));
  const pipe: BPipe[] = raw.pipeline.filter((x) => !x.billId && x.stage !== "drop").map((x) => ({ id: x.id, client: x.client, site: x.site, desc: x.desc, kind: x.kind === "TI" ? "TI" : "PI", amt: +x.amt || 0, stage: x.stage || "prep", target: toIso(x.target) }));
  const wos: BWo[] = raw.work_orders.map((w) => ({ id: w.id, client: w.client, site: w.site, woNo: w.woNo, kind: w.kind === "LOI" ? "LOI" : "WO", amt: +w.amt || 0, status: w.status === "closed" ? "closed" : "active", start: toIso(w.start), end: toIso(w.end) }));
  return { at: new Date().toISOString(), asOn: settings.asOn, bills, commits, pipe, wos, T };
}

/* ---------- reading the Sheet ---------- */
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
let token: { v: string; exp: number } | null = (() => { try { const t = JSON.parse(sessionStorage.getItem("lp-btok") || "null"); return t && t.exp > Date.now() ? t : null; } catch { return null; } })();
let cfgP: Promise<{ clientId: string; sheetId: string }> | null = null;
/** The billing app's public config.js (same site) gives its OAuth client id and sheet id. */
function billingCfg() {
  return (cfgP ||= fetch("/nil-billing-app/config.js", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Couldn't read the billing app's settings."); return r.text(); }).then((t) => {
    const g = (k: string) => (t.match(new RegExp(k + '\\s*:\\s*"([^"]+)"')) || [])[1];
    const clientId = g("clientId"), sheetId = g("sheetId"); if (!clientId || !sheetId) throw new Error("The billing app's settings are missing the sign-in id or sheet id.");
    return { clientId, sheetId };
  }).catch((e) => { cfgP = null; throw e; }));
}
function gis(): Promise<any> {
  const w = window as any; if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = () => { const t0 = Date.now(); (function wait() { if (w.google?.accounts?.oauth2) res(w.google); else if (Date.now() - t0 > 10000) rej(new Error("Google sign-in didn't load.")); else setTimeout(wait, 50); })(); }; s.onerror = () => rej(new Error("Google sign-in didn't load. Check your connection.")); document.head.appendChild(s); });
}
async function getToken(interactive: boolean) {
  if (token && token.exp > Date.now()) return token.v;
  if (!interactive) throw new Error("SIGNIN");
  const [{ clientId }, google] = await Promise.all([billingCfg(), gis()]);
  return new Promise<string>((res, rej) => {
    const granted = (() => { try { return localStorage.getItem("lp-bgrant") === "1"; } catch { return false; } })();
    const tc = google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback: (r: any) => {
      if (!r || r.error) return rej(new Error("Google sign-in failed: " + (r?.error_description || r?.error || "unknown")));
      token = { v: r.access_token, exp: Date.now() + (Math.max(120, +r.expires_in || 3600) - 60) * 1000 };
      try { sessionStorage.setItem("lp-btok", JSON.stringify(token)); localStorage.setItem("lp-bgrant", "1"); } catch {}
      res(token.v);
    }, error_callback: (e: any) => rej(new Error(e?.type === "popup_closed" ? "The Google sign-in window was closed." : e?.type === "popup_failed_to_open" ? "The browser blocked the sign-in pop-up. Allow pop-ups and try again." : "Google sign-in failed.")) });
    tc.requestAccessToken({ prompt: granted ? "" : "consent" });
  });
}
/** Pulls the billing Sheet and stores the computed snapshot. `interactive` may open Google's sign-in pop-up (needs a click). */
export async function syncBilling(interactive: boolean) {
  const { sheetId } = await billingCfg(); const tok = await getToken(interactive);
  const tabs = Object.keys(TABS);
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) + "/values:batchGet?" + tabs.map((t) => "ranges=" + encodeURIComponent("'" + t + "'")).join("&") + "&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER";
  const r = await fetch(url, { headers: { Authorization: "Bearer " + tok } });
  if (r.status === 401) { token = null; try { sessionStorage.removeItem("lp-btok"); } catch {} throw new Error("SIGNIN"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? "This Google account can't open the billing sheet. Sign in with an account it's shared with." : "Google Sheets error: " + (j.error?.message || r.status));
  const grid: Record<string, any[][]> = {}; tabs.forEach((t, i) => (grid[t] = j.valueRanges?.[i]?.values || []));
  if (!grid.bills.length) throw new Error("The billing sheet has no bills tab.");
  const snap = compute(parseTabs(grid));
  update((S) => { S.billing = snap; });
  return snap;
}
export const hasBillingToken = () => !!token && token.exp > Date.now();

/* ---------- reading the snapshot ---------- */
const coOf = (src: string) => { const s = norm(src || "NIL"); return S.work.companies.find((c) => norm(c.id) === s || norm(c.short) === s)?.id || null; };
/** Revenue billed (taxable value of tax invoices) for a company between two ISO dates, in rupees. */
export function billedBetween(company: string, from: string, to: string) {
  const B = S.billing; if (!B) return null;
  const mine = B.bills.filter((b) => coOf(b.src) === company);
  if (!mine.length) return null;
  return mine.filter((b) => b.status === "TI" && b.date >= from && b.date <= to).reduce((n, b) => n + b.base, 0);
}
export const companyHasBilling = (company: string) => !!S.billing?.bills.some((b) => coOf(b.src) === company);
export const rupeesToUnit = (v: number) => v / (S.work.unit === "L" ? 1e5 : 1e7);
export const lakh = (v: number) => (Math.abs(v) >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : `₹${(v / 1e5).toFixed(1)} L`);
/** Billing rows for a project: matched on the site name (or client) against the order's title/client. */
export function billsForOrder(o: { title: string; client?: string }) {
  const B = S.billing; if (!B) return [];
  const t = norm(o.title), words = o.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  return B.bills.filter((b) => { const s = norm(b.site); if (s && (s === t || (s.length >= 6 && (t.includes(s) || s.includes(t))))) return true; const sw = (b.client + " " + b.site).toLowerCase(); return words.length > 0 && words.filter((w) => sw.includes(w)).length >= Math.min(2, words.length); });
}
