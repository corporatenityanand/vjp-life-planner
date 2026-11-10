// Copies the Vite build to the repo root so GitHub Pages (main, /) serves it. v1 stays at legacy.html.
import fs from "fs"; import path from "path";
const dist = path.resolve("dist"), root = path.resolve("..");
fs.rmSync(path.join(root, "assets"), { recursive: true, force: true });
fs.cpSync(path.join(dist, "assets"), path.join(root, "assets"), { recursive: true });
fs.copyFileSync(path.join(dist, "index.html"), path.join(root, "index.html"));
fs.writeFileSync(path.join(root, ".nojekyll"), "");
console.log("Published build to repo root.");
