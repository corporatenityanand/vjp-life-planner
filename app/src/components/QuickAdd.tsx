import * as React from "react";
import { S, update, useStore } from "@/lib/store";
import { newTask, Task } from "@/lib/model";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanySelect, FnSelect } from "./pickers";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** One line in, one task out. Paste several lines to add several. Company + function are sticky between adds. */
export function QuickAdd({ preset, placeholder, showPickers = true, className, autoFocus }: { preset?: Partial<Task>; placeholder?: string; showPickers?: boolean; className?: string; autoFocus?: boolean }) {
  useStore();
  const [v, setV] = React.useState("");
  const [co, setCo] = React.useState<string | null>(preset?.company ?? (() => { try { return localStorage.getItem("lp2-add-co"); } catch { return null; } })());
  const [fn, setFn] = React.useState<string | null>(preset?.fn ?? null);
  React.useEffect(() => { if (preset?.company !== undefined) setCo(preset.company ?? null); }, [preset?.company]);
  const ref = React.useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = v.split(/\n/).map((x) => x.replace(/^\s*(\[[^\]]*\]|-|\*|•)\s*/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    update((S) => lines.forEach((l) => newTask(S, l, { ...preset, company: preset?.company !== undefined ? preset.company : co, fn: preset?.fn !== undefined ? preset.fn : fn })));
    try { if (co) localStorage.setItem("lp2-add-co", co); } catch {}
    setV(""); ref.current?.focus();
  };
  return (
    <form onSubmit={submit} className={cn("flex flex-wrap gap-2", className)}>
      <Input ref={ref} autoFocus={autoFocus} value={v} onChange={(e) => setV(e.target.value)} onPaste={(e) => { const txt = e.clipboardData.getData("text"); if (txt.includes("\n")) { e.preventDefault(); setV(txt); setTimeout(() => (e.target as HTMLInputElement).form?.requestSubmit(), 0); } }} placeholder={placeholder || "Add a task…"} className="min-w-0 basis-full sm:basis-auto sm:min-w-[200px] flex-1" />
      {showPickers && preset?.company === undefined && <CompanySelect value={co} onChange={setCo} className="w-[calc(50%-4px)] sm:w-[150px]" />}
      {showPickers && preset?.fn === undefined && <FnSelect value={fn} onChange={setFn} className="w-[calc(50%-4px)] sm:w-[190px]" />}
      <Button type="submit" variant="brand"><Plus />Add</Button>
    </form>);
}
