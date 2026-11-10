import * as React from "react";
import { S, update, useStore, toast } from "@/lib/store";
import { Meeting, newTask, NETWORKING } from "@/lib/model";
import { addDays, todayStr, uid, weekStart } from "@/lib/date";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CompanySelect } from "./pickers";
import { setUI, useUI } from "./ui-state";

const blankM = (p: any): Meeting => ({ id: "", title: "", who: "", org: "", company: p?.company && p.company !== "all" ? p.company : null, purpose: "", date: p?.date ?? null, week: p?.date ? null : weekStart(todayStr()), start: p?.start || "", mins: 60, place: "", status: "planned", outcome: "", followUp: "" });

export function MeetingDialog() {
  const ui = useUI(); useStore();
  const open = !!ui.meeting;
  const existing = ui.meeting?.id ? S.net.meetings.find((m) => m.id === ui.meeting!.id) : undefined;
  const [m, setM] = React.useState<Meeting>(blankM(null));
  React.useEffect(() => { if (open) setM(existing ? { ...existing } : blankM(ui.meeting)); }, [open, ui.meeting?.id, ui.meeting?.date, ui.meeting?.start]);
  const set = (p: Partial<Meeting>) => setM((x) => ({ ...x, ...p }));
  const close = () => setUI({ meeting: null });
  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!m.title.trim() && !m.who?.trim()) { toast("Add who you're meeting or a title."); return; }
    update((S) => {
      const rec: Meeting = { ...m, title: m.title.trim() || `Meet ${m.who}`, week: m.date ? null : m.week || weekStart(todayStr()) };
      const newFollow = m.status === "done" && m.followUp?.trim() && !(existing && existing.status === "done" && existing.followUp === m.followUp);
      if (existing) Object.assign(existing, rec); else S.net.meetings.push({ ...rec, id: uid(), created: new Date().toISOString() });
      if (newFollow) {
        newTask(S, m.followUp.trim(), { company: m.company || null, fn: NETWORKING, week: weekStart(todayStr()) });
        toast("Follow-up added to this week's tasks.");
      }
    });
    close();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{existing ? "Meeting" : "New meeting"}</DialogTitle><DialogDescription>Networking is how sales orders come in. Log who, why, and what came of it.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Who</Label><Input autoFocus value={m.who} onChange={(e) => set({ who: e.target.value })} placeholder="e.g. Rajesh Shah" /></div>
            <div className="space-y-1.5"><Label>Company / organisation</Label><Input value={m.org} onChange={(e) => set({ org: e.target.value })} placeholder="e.g. MEIL" /></div>
          </div>
          <div className="space-y-1.5"><Label>Title</Label><Input value={m.title} onChange={(e) => set({ title: e.target.value })} placeholder={m.who ? `Meet ${m.who}` : "Lunch with…"} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>For which company</Label><CompanySelect value={m.company} onChange={(v) => set({ company: v })} /></div>
            <div className="space-y-1.5"><Label>Purpose</Label><Input value={m.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="New tender, rate revision, intro…" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={m.date || ""} onChange={(e) => set({ date: e.target.value || null })} /></div>
            <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={m.start || ""} onChange={(e) => set({ start: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Minutes</Label><Input type="number" min={5} step={5} value={m.mins || 60} onChange={(e) => set({ mins: +e.target.value || 60 })} /></div>
          </div>
          {!m.date && <div className="space-y-1.5"><Label>No date yet? Pick the week</Label>
            <ToggleGroup type="single" value={m.week || ""} onValueChange={(v) => v && set({ week: v })} className="w-full">
              {[0, 7, 14, 21].map((n) => { const w = addDays(weekStart(todayStr()), n); return <ToggleGroupItem key={n} value={w} className="flex-1">{n === 0 ? "This week" : n === 7 ? "Next week" : `In ${n / 7} weeks`}</ToggleGroupItem>; })}
            </ToggleGroup></div>}
          <div className="space-y-1.5"><Label>Where</Label><Input value={m.place} onChange={(e) => set({ place: e.target.value })} placeholder="Office, Trident BKC, call…" /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <ToggleGroup type="single" value={m.status} onValueChange={(v) => v && set({ status: v as any })}>
              <ToggleGroupItem value="planned">Planned</ToggleGroupItem><ToggleGroupItem value="done">Happened</ToggleGroupItem><ToggleGroupItem value="cancelled">Cancelled</ToggleGroupItem>
            </ToggleGroup></div>
          {m.status === "done" && <>
            <div className="space-y-1.5"><Label>Outcome</Label><Textarea value={m.outcome} onChange={(e) => set({ outcome: e.target.value })} placeholder="What did you learn or agree?" /></div>
            <div className="space-y-1.5"><Label>Follow-up task (optional)</Label><Input value={m.followUp} onChange={(e) => set({ followUp: e.target.value })} placeholder="Send rate card to Rajesh" /></div>
          </>}
          <DialogFooter className="pt-1">
            {existing && <Button type="button" variant="ghost" className="mr-auto text-destructive" onClick={() => { update((S) => { S.net.meetings = S.net.meetings.filter((x) => x.id !== existing.id); }); close(); }}>Delete</Button>}
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" variant="brand">Save meeting</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);
}
