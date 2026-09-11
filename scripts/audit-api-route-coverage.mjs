import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const frontendRoots = ["src", "server.ts"];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    if (entry.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(rel);
  }
}
for (const rel of frontendRoots) {
  const full = path.join(root, rel);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) walk(rel);
  else if (fs.existsSync(full)) files.push(rel);
}

const routeSet = new Set();
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of text.matchAll(/(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*[`"'](\/api\/[^`"'?$]+)/g)) {
    routeSet.add(match[1]);
  }
}

const functionRoutes = [];
function walkFunctions(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFunctions(rel);
    else if (entry.name.endsWith(".ts")) {
      const route = "/api/" + rel.slice("functions/api/".length, -3).replace(/\\/g, "/").replace(/\/index$/, "");
      functionRoutes.push(route.replace(/\[\[path\]\]/, "<catch-all>"));
    }
  }
}
walkFunctions("functions/api");

const normalizedFunctions = new Set(functionRoutes);
const report = [...routeSet].sort().map(route => ({
  route,
  exactFunction: normalizedFunctions.has(route),
  catchAll: normalizedFunctions.has("/api/<catch-all>"),
}));
console.log(JSON.stringify({frontendRoutes: report, functionRoutes: functionRoutes.sort()}, null, 2));
