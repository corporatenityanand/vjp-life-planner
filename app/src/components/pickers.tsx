import { S, useStore } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyDot } from "./bits";
import { liveOrder } from "@/lib/model";
const N = "__none";
export function CompanySelect({ value, onChange, allowNone = true, allLabel, className }: { value?: string | null; onChange: (v: string | null) => void; allowNone?: boolean; allLabel?: string; className?: string }) {
  useStore();
  return (
    <Select value={value || (allLabel ? "all" : N)} onValueChange={(v) => onChange(v === N ? null : v)}>
      <SelectTrigger className={className} aria-label="Company"><SelectValue /></SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value="all">{allLabel}</SelectItem>}
        {allowNone && !allLabel && <SelectItem value={N}>No company (personal)</SelectItem>}
        {S.work.companies.map((c) => <SelectItem key={c.id} value={c.id}><span className="flex items-center gap-2"><CompanyDot id={c.id} />{c.short}</span></SelectItem>)}
      </SelectContent>
    </Select>);
}
export function FnSelect({ value, onChange, className }: { value?: string | null; onChange: (v: string | null) => void; className?: string }) {
  useStore();
  return (
    <Select value={value || N} onValueChange={(v) => onChange(v === N ? null : v)}>
      <SelectTrigger className={className} aria-label="Function"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={N}>No function</SelectItem>
        {S.work.functions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
      </SelectContent>
    </Select>);
}
export function OrderSelect({ value, company, onChange, className }: { value?: string | null; company?: string | null; onChange: (v: string | null) => void; className?: string }) {
  useStore();
  const list = S.work.orders.filter((o) => (!company || o.company === company) && (liveOrder(o) || o.id === value));
  return (
    <Select value={value || N} onValueChange={(v) => onChange(v === N ? null : v)}>
      <SelectTrigger className={className} aria-label="Sales order"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={N}>No sales order</SelectItem>
        {list.map((o) => <SelectItem key={o.id} value={o.id}>{o.kind} · {o.title}</SelectItem>)}
      </SelectContent>
    </Select>);
}
