// Converts Space Grotesk Bold (OFL, from @fontsource) into a Three.js typeface JSON,
// so the title can be extruded in code. Only the glyphs the film uses are written.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const src = path.join(root, "assets/fonts/space-grotesk-latin-700-normal.woff");
const out = path.join(root, "assets/fonts/SpaceGrotesk-Bold.typeface.json");
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,";

const font = opentype.loadSync(src);
const r = (n) => Math.round(n * 100) / 100;
const glyphs = {};
for (const ch of CHARS) {
  const g = font.charToGlyph(ch);
  const o = [];
  for (const c of g.path.commands) {
    // typeface.js order: end point first, then control points.
    if (c.type === "M") o.push("m", r(c.x), r(c.y));
    else if (c.type === "L") o.push("l", r(c.x), r(c.y));
    else if (c.type === "Q") o.push("q", r(c.x), r(c.y), r(c.x1), r(c.y1));
    else if (c.type === "C") o.push("b", r(c.x), r(c.y), r(c.x1), r(c.y1), r(c.x2), r(c.y2));
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = { ha: Math.round(g.advanceWidth), x_min: r(bb.x1), x_max: r(bb.x2), o: o.join(" ") };
}
const json = {
  glyphs,
  familyName: "Space Grotesk",
  ascender: font.ascender,
  descender: font.descender,
  underlinePosition: font.tables.post.underlinePosition,
  underlineThickness: font.tables.post.underlineThickness,
  boundingBox: { xMin: font.tables.head.xMin, yMin: font.tables.head.yMin, xMax: font.tables.head.xMax, yMax: font.tables.head.yMax },
  resolution: font.unitsPerEm,
  original_font_information: { format: 0, copyright: "Space Grotesk, SIL Open Font License 1.1", fontFamily: "Space Grotesk", fontSubfamily: "Bold" },
  cssFontWeight: "bold",
  cssFontStyle: "normal",
};
fs.writeFileSync(out, JSON.stringify(json));
console.log(`wrote ${path.relative(root, out)} (${Object.keys(glyphs).length} glyphs, ${font.unitsPerEm} units/em)`);
