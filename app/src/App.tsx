import * as React from "react";
import { Toaster, toast as sonner } from "sonner";
import { cn } from "@/lib/utils";
import { onToast, pushNow, sync, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskSheet } from "@/components/TaskSheet";
import { MeetingDialog } from "@/components/MeetingDialog";
import { Today } from "@/views/Today";
import { Week } from "@/views/Week";
import { Companies } from "@/views/Companies";
import { Sales } from "@/views/Sales";
import { Focus, MiniTimer } from "@/views/Focus";
import { Quit } from "@/views/Quit";
import { Review } from "@/views/Review";
import { CalendarDays, Building2, Handshake, Timer, ShieldCheck, LineChart, Sun, MoreHorizontal, Moon, Dumbbell, Save, Loader2 } from "lucide-react";

const ROUTES = [
  { id: "today", label: "Today", icon: Sun, C: Today },
  { id: "week", label: "Week", icon: CalendarDays, C: Week },
  { id: "companies", label: "Companies", icon: Building2, C: Companies },
  { id: "sales", label: "Sales & network", short: "Sales", icon: Handshake, C: Sales },
  { id: "focus", label: "Focus", icon: Timer, C: Focus },
  { id: "quit", label: "Quit", icon: ShieldCheck, C: Quit },
  { id: "review", label: "Review", icon: LineChart, C: Review },
];
const useHash = () => {
  const get = () => { const h = location.hash.slice(1); return ROUTES.some((r) => r.id === h) ? h : "week"; };
  const [r, setR] = React.useState(get);
  React.useEffect(() => { const f = () => { setR(get()); window.scrollTo(0, 0); }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return r;
};

function SyncState() {
  useStore();
  const map: Record<string, [string, string]> = { loading: ["Loading…", "bg-brand"], synced: ["Saved to Sheet", "bg-emerald-500"], saving: ["Saving…", "bg-brand"], dirty: ["Unsaved changes", "bg-brand"], local: ["Not connected", "bg-destructive"], error: ["Not saved", "bg-destructive"] };
  const [txt, dot] = map[sync.mode] || ["", ""];
  return <a href="#review" title={sync.err || txt} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"><span className={cn("h-2 w-2 rounded-full", dot)} /><span className="hidden sm:inline">{txt}</span></a>;
}
function ThemeToggle() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"));
  return <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" onClick={() => { const d = !dark; setDark(d); document.documentElement.classList.toggle("dark", d); try { localStorage.setItem("lp-theme", d ? "dark" : "light"); } catch {} }}>{dark ? <Sun /> : <Moon />}</Button>;
}

export default function App() {
  const route = useHash(); useStore();
  React.useEffect(() => onToast((m) => sonner(m)), []);
  const R = ROUTES.find((r) => r.id === route)!;
  const phoneMain = ROUTES.slice(0, 5), phoneMore = ROUTES.slice(5);
  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="container flex h-14 items-center gap-2 px-4 sm:px-6 2xl:px-8">
          <a href="#week" className="mr-3 flex items-center gap-2 font-bold tracking-tight"><span className="flex gap-[3px]"><i className="h-2 w-2 rounded-[2px] bg-fin" /><i className="h-2 w-2 rounded-[2px] bg-fit" /><i className="h-2 w-2 rounded-[2px] bg-fam" /></span>VJP Life Planner</a>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {ROUTES.map((r) => <a key={r.id} href={"#" + r.id} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", route === r.id && "bg-secondary text-foreground")}><r.icon className="h-4 w-4" />{r.label}</a>)}
            <a href="legacy.html#goals" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground" title="Fitness and family, until they're rebuilt"><Dumbbell className="h-4 w-4" />Fitness & family</a>
          </nav>
          <div className="flex-1" />
          <MiniTimer />
          <SyncState />
          <ThemeToggle />
          <Button size="sm" variant="brand" onClick={() => pushNow(true)} disabled={sync.saving}>{sync.saving ? <Loader2 className="animate-spin" /> : <Save />}Save</Button>
        </div>
        <nav className="container hidden gap-0.5 overflow-x-auto px-4 pb-2 sm:flex lg:hidden">
          {ROUTES.map((r) => <a key={r.id} href={"#" + r.id} className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground", route === r.id && "bg-secondary text-foreground")}><r.icon className="h-4 w-4" />{r.short || r.label}</a>)}
          <a href="legacy.html#goals" className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground"><Dumbbell className="h-4 w-4" />Fitness</a>
        </nav>
      </header>
      {sync.mode === "local" && <div className="container mt-4 px-4 sm:px-6 2xl:px-8"><div className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm">Not connected to your Google Sheet, so changes are saved on this device only. <a className="font-semibold underline" href="#review">Connect it</a></div></div>}
      <main className="container px-4 pt-5 sm:px-6 sm:pt-7 2xl:px-8"><R.C /></main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-background/95 backdrop-blur sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {phoneMain.map((r) => <a key={r.id} href={"#" + r.id} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground", route === r.id && "text-brand")}><r.icon className="h-5 w-5" />{r.short || r.label}</a>)}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted-foreground", phoneMore.some((r) => r.id === route) && "text-brand")}><MoreHorizontal className="h-5 w-5" />More</DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {phoneMore.map((r) => <DropdownMenuItem key={r.id} onSelect={() => (location.hash = r.id)}><r.icon />{r.label}</DropdownMenuItem>)}
            <DropdownMenuItem onSelect={() => (location.href = "legacy.html#goals")}><Dumbbell />Fitness & family</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
      <TaskSheet />
      <MeetingDialog />
      <Toaster position="bottom-center" offset={84} toastOptions={{ className: "!bg-foreground !text-background !border-0" }} />
    </div>);
}
