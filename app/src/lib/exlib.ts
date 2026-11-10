// Exercise library: 876 exercises from free-exercise-db (public domain, Unlicense).
// Bundled as a lazy chunk; images are served from the project's GitHub repo.
import * as React from "react";
import type { Exercise, State } from "./model";

export type LibEx = { id: string; n: string; c: string; l: string; e: string; f: string; m: string; p: string[]; s: string[]; i: string[]; im: string[] };

let cache: LibEx[] | null = null; let pending: Promise<LibEx[]> | null = null;
export function loadLib() {
  if (cache) return Promise.resolve(cache);
  return (pending ||= import("@/data/exlib.json").then((m) => (cache = (m.default as unknown) as LibEx[])));
}
export function useLib() {
  const [lib, setLib] = React.useState<LibEx[] | null>(cache);
  React.useEffect(() => { if (!lib) loadLib().then(setLib).catch(() => setLib([])); }, []);
  return lib;
}
export const libById = (id?: string) => (id && cache ? cache.find((x) => x.id === id) : undefined);

const IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export const imgUrl = (x: LibEx, i = 0) => (x.im[i] ? IMG + encodeURIComponent(x.id) + "/" + x.im[i] : "");
export const ytSearch = (name: string) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " exercise proper form");
/** Turn any YouTube URL into an embeddable one, or null. */
export function ytEmbed(url?: string) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? "https://www.youtube-nocookie.com/embed/" + m[1] : null;
}

export const CATS: [string, string][] = [["strength", "Strength"], ["stretching", "Stretches"], ["plyometrics", "Plyometrics"], ["cardio", "Cardio"], ["powerlifting", "Powerlifting"], ["olympic weightlifting", "Olympic"], ["strongman", "Strongman"]];
export const LIB_MUSCLES = ["chest", "shoulders", "biceps", "triceps", "forearms", "lats", "middle back", "lower back", "traps", "neck", "abdominals", "quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"];
export const LIB_EQUIP = ["body only", "dumbbell", "barbell", "cable", "machine", "kettlebells", "bands", "e-z curl bar", "exercise ball", "medicine ball", "foam roll", "other", "none"];
const GROUP: Record<string, string> = { chest: "Chest", lats: "Back", "middle back": "Back", "lower back": "Back", traps: "Back", shoulders: "Shoulders", neck: "Shoulders", quadriceps: "Legs", hamstrings: "Legs", glutes: "Legs", calves: "Legs", abductors: "Legs", adductors: "Legs", biceps: "Arms", triceps: "Arms", forearms: "Arms", abdominals: "Core" };
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The workout-log exercise for a library entry, created on first use. Returns its id. */
export function ensureFromLib(S: State, x: LibEx) {
  const have = S.gym.exercises.find((e) => e.lib === x.id);
  if (have) return have.id;
  const kind: Exercise["kind"] = x.c === "stretching" || x.c === "cardio" ? "time" : x.e === "body only" || x.e === "none" ? "bw" : "weight";
  const muscle = x.p.length > 1 && x.c !== "stretching" ? "Full body" : GROUP[x.p[0]] || "Full body";
  const id = "L-" + x.id;
  S.gym.exercises.push({ id, name: x.n, muscle, equip: cap(x.e), kind, lib: x.id });
  return id;
}
