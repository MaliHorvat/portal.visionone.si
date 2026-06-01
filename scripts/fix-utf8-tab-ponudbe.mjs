import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/components/portal/client-workspace/TabPonudbe.tsx",
);

let s = fs.readFileSync(target, "latin1");

const fixes = [
  [/ASCII-safe . datoteka ne sme pokvariti znaka . ob shranjevanju/g, "ASCII-safe — datoteka ne sme pokvariti znaka € ob shranjevanju"],
  [/o\.id\.slice\(0, 8\) \+ "."/g, 'o.id.slice(0, 8) + "\\u2026"'],
  [/<th>.IFRA<\/th>/g, "<th>\\u0160IFRA</th>"],
  [/draft\.offerDate \|\| "."/g, 'draft.offerDate || "\\u2014"'],
  [/draft\.clientAddress \|\| "."/g, 'draft.clientAddress || "\\u2014"'],
  [/head: \[\["Tip", ".ifra"/g, 'head: [["Tip", "\\u0160ifra"'],
  [/PDF ponudbe izvo.en\./g, "PDF ponudbe izvo\\u017Een."],
  [/<option value="">. izberi ponudbo .<\/option>/g, '<option value="">\\u2014 izberi ponudbo \\u2014</option>'],
  [/<option value="">. brez predloge .<\/option>/g, '<option value="">\\u2014 brez predloge \\u2014</option>'],
  [/Izbri.i/g, "Izbri\\u0161i"],
  [/.tevilka ponudbe/g, "\\u0160tevilka ponudbe"],
  [/Po.ta, Kraj/g, "Po\\u0161ta, Kraj"],
  [/Pogoji ponudbe./g, "Pogoji ponudbe\\u2026"],
  [/obstoje.o/g, "obstoje\\u010Do"],
];

for (const [re, rep] of fixes) {
  s = s.replace(re, rep);
}

s = s.replace(/\x9d/g, "");

fs.writeFileSync(target, s, "utf8");

function validate(file) {
  const b = fs.readFileSync(file);
  for (let i = 0; i < b.length; ) {
    const c = b[i];
    if (c <= 0x7f) {
      i += 1;
      continue;
    }
    if ((c & 0xe0) === 0xc0 && i + 1 < b.length && (b[i + 1] & 0xc0) === 0x80) {
      i += 2;
      continue;
    }
    if ((c & 0xf0) === 0xe0 && i + 2 < b.length && (b[i + 1] & 0xc0) === 0x80 && (b[i + 2] & 0xc0) === 0x80) {
      i += 3;
      continue;
    }
    if (
      (c & 0xf8) === 0xf0 &&
      i + 3 < b.length &&
      (b[i + 1] & 0xc0) === 0x80 &&
      (b[i + 2] & 0xc0) === 0x80 &&
      (b[i + 3] & 0xc0) === 0x80
    ) {
      i += 4;
      continue;
    }
    return false;
  }
  return !(b.toString("utf8").includes("\uFFFD"));
}

if (!validate(target)) {
  console.error("UTF-8 validation failed");
  process.exit(1);
}
console.log("TabPonudbe.tsx UTF-8 OK");
