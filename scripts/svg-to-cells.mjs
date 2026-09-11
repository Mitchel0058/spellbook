#!/usr/bin/env node
// Converts a "1x1 rect per pixel" SVG into a { width, height, cells } object
// to paste into src/lib/symbols.js.
//
// Usage:
//   node scripts/svg-to-cells.mjs path/to/icon.svg
//   cat icon.svg | node scripts/svg-to-cells.mjs

import { readFileSync } from "node:fs";

const input = process.argv[2]
    ? readFileSync(process.argv[2], "utf8")
    : readFileSync(0, "utf8");

const width = Number(input.match(/width="(\d+)"/)?.[1]);
const height = Number(input.match(/height="(\d+)"/)?.[1]);

const cells = [...input.matchAll(/<rect\s+x="(\d+)"\s+y="(\d+)"/g)].map(
    ([, x, y]) => [Number(x), Number(y)],
);

console.log(JSON.stringify({ width, height, cells }, null, 4));