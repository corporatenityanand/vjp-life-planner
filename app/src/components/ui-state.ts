import { useSyncExternalStore } from "react";
type UIState = { taskSheet: string | null; meeting: { id?: string; date?: string; start?: string; company?: string } | null; orderSheet: string | null; company: string; day: string; week: string };
import { todayStr, weekStart } from "@/lib/date";
let ui: UIState = { taskSheet: null, meeting: null, orderSheet: null, company: (() => { try { return localStorage.getItem("lp2-company") || "all"; } catch { return "all"; } })(), day: todayStr(), week: weekStart(todayStr()) };
const subs = new Set<() => void>();
export function setUI(p: Partial<UIState>) { ui = { ...ui, ...p }; if (p.company) { try { localStorage.setItem("lp2-company", p.company); } catch {} } subs.forEach((f) => f()); }
export function useUI() { return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => ui); }
export const getUI = () => ui;
