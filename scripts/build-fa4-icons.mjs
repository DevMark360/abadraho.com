/**
 * Build src/data/font-awesome-4-icons.json from awps/font-awesome-php (FA 4.7).
 * Run: node scripts/build-fa4-icons.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const url =
  "https://raw.githubusercontent.com/awps/font-awesome-php/master/src/FontAwesomeStatic.php";
const res = await fetch(url);
const php = await res.text();
const re = /'((?:fa-)?[^']+)'\s*=>\s*'(\\f[0-9a-f]+)'/gi;
const icons = [];
let m;
while ((m = re.exec(php))) {
  let cls = m[1];
  if (!cls.startsWith("fa-")) cls = `fa-${cls}`;
  const unicode = m[2].replace(/^\\/, "");
  const name = cls
    .replace(/^fa-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  icons.push({ class: cls, unicode, name });
}
icons.sort((a, b) => a.name.localeCompare(b.name));

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "src", "data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "font-awesome-4-icons.json");
writeFileSync(outPath, JSON.stringify(icons, null, 0));
console.log(`Wrote ${icons.length} icons to ${outPath}`);
