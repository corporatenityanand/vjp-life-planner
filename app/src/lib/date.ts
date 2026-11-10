export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const weekStart = (s: string) => { const d = parseYmd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
export const todayStr = () => ymd(new Date());
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const fmtDay = (s: string) => { const d = parseYmd(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtShort = (s: string) => { const d = parseYmd(s); return `${DOW[d.getDay()]} ${d.getDate()}`; };
export const fmtLong = (s: string) => { const d = parseYmd(s); return `${DOWL[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtDT = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const daysBetween = (a: string, b: string) => Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 864e5);
export const toLocalInput = (iso?: string | null) => { const d = iso ? new Date(iso) : new Date(); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const weekDays = (ws: string) => [...Array(7)].map((_, i) => addDays(ws, i));
export const monthKey = (s: string) => s.slice(0, 7);
export const fmtMonth = (k: string) => { const [y, m] = k.split("-").map(Number); return `${MONL[m - 1]} ${y}`; };
export const addMonths = (k: string, n: number) => { const [y, m] = k.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export function dur(ms: number) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; }
export function durText(ms: number) { const x = dur(ms); return x.d ? `${x.d}d ${x.h}h` : x.h ? `${x.h}h ${x.m}m` : `${x.m}m`; }
export const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
export const hm = (mins: number) => { mins = Math.round(mins); const h = Math.floor(mins / 60), m = mins % 60; return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`; };
export const timeToMin = (t: string) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
export const minToTime = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
