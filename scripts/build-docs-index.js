#!/usr/bin/env node
/*
  Rebuilds assets/index.json from every PDF currently in assets/docs.
  Run from the repository root after adding or removing PDFs:

    node scripts/build-docs-index.js

  GitHub Pages is static and does not expose a writable server filesystem to browser code,
  so this script is the reliable way to keep the published manifest synchronized.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'assets', 'docs');
const outFile = path.join(root, 'assets', 'index.json');

function walk(dir){
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) return walk(full);
    if (ent.isFile() && ent.name.toLowerCase().endsWith('.pdf')) return [full];
    return [];
  });
}

fs.mkdirSync(docsDir, { recursive: true });
const files = walk(docsDir).sort((a,b)=>a.localeCompare(b)).map(full => {
  const rel = path.relative(root, full).replace(/\\/g, '/');
  const stat = fs.statSync(full);
  return {
    name: path.basename(full),
    path: rel,
    size: stat.size,
    tags: []
  };
});

fs.writeFileSync(outFile, JSON.stringify({ files }, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, outFile)} with ${files.length} PDF${files.length === 1 ? '' : 's'}.`);
