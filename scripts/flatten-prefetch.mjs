// Next 16 static export writes segment-prefetch payloads as nested folders
// (salaries/__next.salaries/__PAGE__.txt) but the client router requests a dotted
// filename (salaries/__next.salaries.__PAGE__.txt). Plain static hosts (IPFS, any CDN)
// can't rewrite that, so we write the dotted copies next to the folders.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "out");
let written = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) flatten(full, dir, entry.name);
    else walk(full);
  }
}

/** Copy every file under `segDir` to `parent/<prefix>.<relative path with dots>`. */
function flatten(segDir, parent, prefix) {
  for (const entry of fs.readdirSync(segDir, { withFileTypes: true })) {
    const full = path.join(segDir, entry.name);
    const name = `${prefix}.${entry.name}`;
    if (entry.isDirectory()) flatten(full, parent, name);
    else {
      fs.copyFileSync(full, path.join(parent, name));
      written++;
    }
  }
}

if (!fs.existsSync(OUT)) {
  console.error(`flatten-prefetch: ${OUT} not found`);
  process.exit(1);
}
walk(OUT);
console.log(`flatten-prefetch: wrote ${written} prefetch file(s)`);
