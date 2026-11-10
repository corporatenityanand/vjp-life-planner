import * as React from "react";
import { cn } from "@/lib/utils";
import { S, useStore } from "@/lib/store";
import { company, orderOf, QLABEL } from "@/lib/model";
import { Briefcase, Users } from "lucide-react";

export function CompanyDot({ id, className }: { id?: string | null; className?: string }) {
  const c = company(S, id);
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} style={{ background: c ? c.color : "hsl(var(--oth))" }} />;
}
export function CompanyBadge({ id }: { id?: string | null }) {
  useStore(); const c = company(S, id); if (!c) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground/80"><CompanyDot id={id} />{c.short}</span>;
}
export function FnBadge({ fn }: { fn?: string | null }) {
  if (!fn) return null;
  return <span className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{fn}</span>;
}
export function OrderBadge({ id }: { id?: string | null }) {
  const o = orderOf(S, id); if (!o) return null;
  return <span className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-md border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground"><Briefcase className="h-3 w-3 shrink-0" /><span className="truncate">{o.title}</span></span>;
}
export const qColor: Record<number, string> = { 1: "text-q1 bg-q1/10 border-q1/30", 2: "text-q2 bg-q2/10 border-q2/30", 3: "text-q3 bg-q3/10 border-q3/30", 4: "text-q4 bg-q4/10 border-q4/30" };
export function QBadge({ q, className, onClick }: { q: number | null; className?: string; onClick?: () => void }) {
  const C: any = onClick ? "button" : "span";
  if (!q) return <C onClick={onClick} className={cn("inline-flex items-center rounded-md border border-dashed px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>Rate</C>;
  return <C onClick={onClick} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold", qColor[q], className)}>Q{q} · {QLABEL[q]}</C>;
}
export function MeetingIcon() { return <Users className="h-3.5 w-3.5" />; }
export function PageHead({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>{children && <div className="flex flex-wrap items-center gap-2">{children}</div>}</div>;
}
export function Empty({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-dashed p-4 text-sm text-muted-foreground", className)}>{children}</div>;
}
export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-4", className)}><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold num tracking-tight">{value}</div>{sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}</div>;
}
