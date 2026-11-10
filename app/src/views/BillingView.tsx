import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { newTask, Task } from "@/lib/model";
import { fmtDay, todayStr, weekStart } from "@/lib/date";
import { BBill, hasBillingToken, lakh, syncBilling } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, Stat } from "@/components/bits";
import { ExternalLink, Loader2, Plus, RefreshCw, Check } from "lucide-react";

const APP = "https://corporatenityanand.github.io/nil-billing-app/";
const days = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso + "T00:00:00").getTime()) / 864e5));
const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4); return m < 2 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmtDay(iso.slice(0, 10)); };
const billLabel = (b: BBill) => [b.billno || "no number", b.seq].filter(Boolean).join(" ");

/** Shared sync button: first use opens Google's sign-in pop-up, later ones refresh quietly while the session lasts. */
export function useBillingSync() {
  const [busy, setBusy] = React.useState(false);
  const run = async (interactive = true) => {
    setBusy(true);
    try { const b = await syncBilling(interactive); if (interactive) toast(`Billing updated: ${b.bills.length} bills.`); }
    catch (e: any) { if (e.message !== "SIGNIN") toast(e.message); else if (interactive) toast("Sign in with Google to read the billing sheet."); }
    finally { setBusy(false); }
  };
  return { busy, run };
}
/** Quietly refreshes once per page load when this tab already has a Google token. */
let autoDone = false;
export function useAutoBilling() {
  const { run } = useBillingSync();
  React.useEffect(() => { if (!autoDone && hasBillingToken()) { autoDone = true; run(false); } }, []);
}

export function BillingConnect({ compact }: { compact?: boolean }) {
  useStore(); const { busy, run } = useBillingSync(); const B = S.billing;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "text-sm")}>
      {B ? <span className="text-sm text-muted-foreground">From the billing app · updated {ago(B.at)}</span> : <span className="text-sm text-muted-foreground">Not connected to the billing app yet.</span>}
      <Button size="sm" variant={B ? "outline" : "brand"} disabled={busy} onClick={() => run(true)}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}{B ? "Refresh" : "Connect billing (Google sign-in)"}</Button>
    </div>);
}

function followTask(b: BBill) { return S.tasks.find((t) => !t.done && t.ref?.bill === b.id); }
function makeFollow(b: BBill, company: string) {
  const order = S.work.orders.find((o) => o.company === company && o.client && b.client.toLowerCase().includes(o.client.toLowerCase()));
  update((S) => newTask(S, `Collect ${lakh(b.bal)} from ${b.client.replace(/^\([^)]*\)\s*/, "")} · ${billLabel(b)}${b.site ? " · " + b.site : ""}`, { company, fn: "Receivables", order: order?.id || null, week: weekStart(todayStr()), u: true, i: true, ref: { bill: b.id } } as Partial<Task>));
  toast("Follow-up added to this week as Q1.");
}

export function BillingTab({ c }: { c: string }) {
  useStore(); useAutoBilling();
  const B = S.billing;
  if (!B) return (
    <Card><CardHeader><CardTitle>Connect the billing app</CardTitle><CardDescription>Reads your receivables sheet (read-only) with the same Google account you use in the billing app. Revenue actuals, receivables and bills to raise then show up here and in your goals.</CardDescription></CardHeader>
      <CardContent><BillingConnect /></CardContent></Card>);
  const mine = B.bills.filter((b) => (b.src || "NIL").toUpperCase() === (S.work.companies.find((x) => x.id === c)?.id || "").toUpperCase() || (b.src || "NIL").toUpperCase() === (S.work.companies.find((x) => x.id === c)?.short || "").toUpperCase());
  if (!mine.length) return <Empty>The billing app has no bills for this company. It covers {Array.from(new Set(B.bills.map((b) => b.src || "NIL"))).join(", ")}.<div className="mt-3 flex justify-center"><BillingConnect /></div></Empty>;
  const due = mine.filter((b) => b.status !== "PI" && b.bal >= 1).sort((a, b) => days(a.date) * -1 + days(b.date));
  const byClient: Record<string, { due: number; n: number; oldest: number }> = {};
  due.forEach((b) => { const x = (byClient[b.client] = byClient[b.client] || { due: 0, n: 0, oldest: 0 }); x.due += b.bal; x.n++; x.oldest = Math.max(x.oldest, days(b.date)); });
  const clients = Object.entries(byClient).sort((a, b) => b[1].due - a[1].due);
  const maxDue = Math.max(1, ...clients.map(([, x]) => x.due));
  const T = B.T; const ym = todayStr().slice(0, 7);
  const monthBilled = mine.filter((b) => b.status === "TI" && b.date.startsWith(ym)).reduce((n, b) => n + b.base, 0);
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2"><BillingConnect /><div className="flex-1" /><Button asChild variant="ghost" size="sm"><a href={APP} target="_blank" rel="noreferrer">Open billing app<ExternalLink /></a></Button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Net receivable" value={lakh(T.net)} sub="invoiced + proforma − credits" />
        <Stat label="Invoiced due" value={lakh(T.inv)} sub={`${T.nInv} bills`} />
        <Stat label="Proforma pipeline" value={lakh(T.pi)} sub={`${T.nPi} proformas`} />
        <Stat label="GST held by clients" value={lakh(T.held + (T.heldExtra || 0))} />
        <Stat label="Retention held" value={lakh(T.ret)} />
        <Stat label={`Billed in ${new Date(ym + "-01T00:00:00").toLocaleString("en-IN", { month: "long" })}`} value={lakh(monthBilled)} sub="taxable value, tax invoices" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Who owes what</CardTitle><CardDescription>Invoiced and still unpaid, by client. Age is days since the bill date.</CardDescription></CardHeader>
          <CardContent className="space-y-2.5">{clients.map(([n, x]) => (
            <div key={n} className="text-sm"><div className="flex items-baseline gap-2"><span className="mr-auto min-w-0 truncate font-medium">{n}</span><span className="font-semibold num">{lakh(x.due)}</span></div>
              <div className="mt-1 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", x.oldest > 90 ? "bg-q1" : x.oldest > 45 ? "bg-q2" : "bg-fin")} style={{ width: `${(x.due / maxDue) * 100}%` }} /></span><span className="w-36 text-right text-xs text-muted-foreground num">{x.n} bill{x.n > 1 ? "s" : ""} · oldest {x.oldest} d</span></div></div>))}
            {!clients.length && <Empty>Nothing invoiced is outstanding.</Empty>}</CardContent></Card>
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Payment promises</CardTitle><CardDescription>Open commitments logged in the billing app.</CardDescription></CardHeader>
            <CardContent>{B.commits.length ? B.commits.map((x) => (
              <div key={x.id} className="flex items-center gap-2 border-b py-2 text-sm last:border-0"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{x.client}</span><span className="block truncate text-xs text-muted-foreground">{x.note}</span></span>
                <span className={cn("text-xs num", x.st === "broken" ? "font-semibold text-q1" : "text-muted-foreground")}>{x.st === "broken" ? "missed " : ""}{fmtDay(x.date)}</span><span className="w-20 text-right font-semibold num">{lakh(x.rem)}</span></div>)) : <p className="text-sm text-muted-foreground">No open promises.</p>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Bills to raise</CardTitle><CardDescription>The billing app's pipeline: bills being prepared.</CardDescription></CardHeader>
            <CardContent>{B.pipe.length ? B.pipe.map((x) => (
              <div key={x.id} className="flex items-center gap-2 border-b py-2 text-sm last:border-0"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{x.client} · {x.desc}</span><span className="block truncate text-xs text-muted-foreground">{x.site}</span></span>
                <span className={cn("text-xs num", x.target && x.target < todayStr() ? "font-semibold text-q1" : "text-muted-foreground")}>{x.target ? fmtDay(x.target) : ""}</span><span className="w-20 text-right font-semibold num">{lakh(x.amt)}</span></div>)) : <p className="text-sm text-muted-foreground">Nothing in the pipeline.</p>}</CardContent></Card>
        </div>
      </div>
      <Card className="min-w-0 overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-base">Unpaid bills</CardTitle><CardDescription>Oldest first. Turn any of them into a Q1 follow-up task under Receivables.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 font-medium">Client · site</th><th className="font-medium">Bill</th><th className="font-medium">Date</th><th className="text-right font-medium">Age</th><th className="text-right font-medium">Due</th><th /></tr></thead>
          <tbody>{due.sort((a, b) => a.date.localeCompare(b.date)).map((b) => { const f = followTask(b); return (
            <tr key={b.id} className="border-b last:border-0"><td className="py-2 pr-2"><div className="font-medium">{b.client}</div><div className="text-xs text-muted-foreground">{b.site}{b.stage ? ` · ${b.stage}` : ""}</div></td>
              <td className="pr-2 num">{billLabel(b)}</td><td className="pr-2 num">{fmtDay(b.date)}</td><td className={cn("pr-2 text-right num", days(b.date) > 90 && "font-semibold text-q1")}>{days(b.date)} d</td><td className="pr-2 text-right font-semibold num">{lakh(b.bal)}</td>
              <td className="text-right">{f ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" />Task added</span> : <Button size="xs" variant="outline" onClick={() => makeFollow(b, c)}><Plus />Follow up</Button>}</td></tr>); })}</tbody></table></CardContent></Card>
    </div>);
}
