import * as React from "react";
import { cn } from "@/lib/utils";
import { S, update, useStore, toast } from "@/lib/store";
import { Task, quad, setDone, setQ, normalizeTop, topOf, QLABEL, QSUB } from "@/lib/model";
import { addDays, fmtShort, todayStr, weekStart, weekDays } from "@/lib/date";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CompanyBadge, FnBadge, OrderBadge, QBadge, qColor } from "./bits";
import { setUI } from "./ui-state";
import { CalendarDays, MoreHorizontal, Play, Star, Trash2, Pencil, Inbox, ArrowRight } from "lucide-react";

export function PlanPopover({ t, children, ws }: { t: Task; children: React.ReactNode; ws?: string }) {
  const base = ws || weekStart(t.date || t.week || todayStr());
  const [w, setW] = React.useState(base);
  const q = quad(t);
  return (
    <Popover onOpenChange={(o) => o && setW(base)}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[330px]">
        <div className="text-xs font-medium text-muted-foreground">Priority</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} onClick={() => update(() => setQ(t, q === n ? 0 : n))}
              className={cn("rounded-md border px-2 py-1.5 text-left text-xs transition-colors", q === n ? qColor[n] : "hover:bg-accent")}>
              <div className="font-semibold">Q{n} · {QLABEL[n]}</div><div className="text-[11px] opacity-70">{QSUB[n]}</div>
            </button>))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>When</span>
          <span className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setW(addDays(w, -7))} aria-label="Previous week">‹</Button>
            <span className="num">Week of {fmtShort(w)}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setW(addDays(w, 7))} aria-label="Next week">›</Button>
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1">
          {weekDays(w).map((d) => (
            <button key={d} onClick={() => update(() => { if (t.date !== d) { t.top = 0; t.date = d; t.week = null; } else { t.date = null; t.week = w; } })}
              className={cn("rounded-md border py-1.5 text-[11px] font-medium leading-tight", t.date === d ? "border-brand bg-brand text-black" : d === todayStr() ? "border-brand/60" : "hover:bg-accent")}>
              {fmtShort(d).split(" ")[0]}<br /><span className="num">{fmtShort(d).split(" ")[1]}</span>
            </button>))}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <Button size="xs" variant={!t.date && t.week === w ? "brand" : "outline"} className="flex-1" onClick={() => update(() => { t.date = null; t.week = w; t.top = 0; })}>This week, no day</Button>
          <Button size="xs" variant={!t.date && !t.week ? "secondary" : "outline"} className="flex-1" onClick={() => update(() => { t.date = null; t.week = null; t.top = 0; })}><Inbox />Backlog</Button>
        </div>
      </PopoverContent>
    </Popover>);
}

export function whenLabel(t: Task) { if (t.date) return t.date === todayStr() ? "Today" : fmtShort(t.date); if (t.week) return "Wk " + fmtShort(t.week); return ""; }

export function TaskRow({ t, compact, hide = [], className }: { t: Task; compact?: boolean; hide?: ("company" | "fn" | "order" | "when")[]; className?: string }) {
  useStore();
  const q = quad(t);
  const star = () => update((S) => {
    if (!t.date) { t.date = todayStr(); t.week = null; }
    if (t.top) { t.top = 0; normalizeTop(S, t.date!); return; }
    const tp = topOf(S, t.date!); if (tp.length >= 3) { toast("Top 3 is full. Remove one first."); return; } t.top = tp.length + 1;
  });
  return (
    <div className={cn("group flex items-start gap-3 py-2.5", className)}>
      <Checkbox className="mt-0.5" checked={t.done} onCheckedChange={(v) => update(() => setDone(t, !!v))} aria-label="Done" />
      <div className="min-w-0 flex-1">
        <button className={cn("block w-full text-left text-sm leading-snug", t.done && "text-muted-foreground line-through")} onClick={() => setUI({ taskSheet: t.id })}>
          {t.top ? <span className="mr-1.5 font-bold text-brand">#{t.top}</span> : null}{t.t}
        </button>
        {!compact && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {!hide.includes("company") && <CompanyBadge id={t.company} />}
            {!hide.includes("fn") && <FnBadge fn={t.fn} />}
            {!hide.includes("order") && <OrderBadge id={t.order} />}
            {t.lead && !hide.includes("order") && (() => { const l = (S.work.leads || []).find((x) => x.id === t.lead); return l ? <button onClick={() => { location.hash = "sales"; try { localStorage.setItem("lp2-salestab", "leads"); } catch {} setUI({ leadSheet: l.id }); }} className="max-w-[180px] truncate rounded-md border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">Lead: {l.title || "untitled"}</button> : null; })()}
            <PlanPopover t={t}><button className="inline-flex items-center gap-1.5"><QBadge q={q} />{!hide.includes("when") && whenLabel(t) && <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium"><CalendarDays className="h-3 w-3" />{whenLabel(t)}</span>}</button></PlanPopover>
            {!!t.carried && t.carried >= 2 && !t.done && <span className="text-[11px] font-semibold text-q2">moved {t.carried}×</span>}
          </div>)}
      </div>
      <div className="flex shrink-0 items-center opacity-80 group-hover:opacity-100">
        {compact && <PlanPopover t={t}><button className="mr-1"><QBadge q={q} /></button></PlanPopover>}
        <Button variant="ghost" size="icon-sm" onClick={star} title={t.top ? "In Top 3" : "Add to today's Top 3"} className={t.top ? "text-brand" : "text-muted-foreground"}><Star className={t.top ? "fill-current" : ""} /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="More"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setUI({ taskSheet: t.id })}><Pencil />Edit details</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { update(() => { t.date = todayStr(); t.week = null; }); }}><ArrowRight />Do today</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { try { localStorage.setItem("lp2-focus-task", t.id); } catch {} location.hash = "focus"; }}><Play />Focus on this</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => update((S) => { S.tasks = S.tasks.filter((x) => x.id !== t.id); if (t.date) normalizeTop(S, t.date); })}><Trash2 />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>);
}
