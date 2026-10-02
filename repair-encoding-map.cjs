const fs = require("fs");
const path = require("path");

const suspicious = /[ÃÂâïð�]/g;
const files = fs.readdirSync(".")
  .filter(name => /\.(html|js|css|txt|md|rules)$/i.test(name));

function score(value) {
  return (value.match(suspicious) || []).length;
}

function repairLine(line) {
  let current = line;
  for (let round = 0; round < 4; round += 1) {
    const before = score(current);
    if (!before) break;
    let candidate;
    try {
      candidate = Buffer.from(current, "latin1").toString("utf8");
    } catch {
      break;
    }
    const after = score(candidate);
    const replacementBefore = (current.match(/\uFFFD/g) || []).length;
    const replacementAfter = (candidate.match(/\uFFFD/g) || []).length;
    if (!candidate || candidate === current || after >= before || replacementAfter > replacementBefore + 2) break;
    current = candidate;
  }
  return current;
}

for (const name of files) {
  const original = fs.readFileSync(name, "utf8");
  const repaired = original.split(/\r?\n/).map(repairLine).join("\r\n");
  if (repaired !== original) {
    fs.writeFileSync(name, repaired, "utf8");
    console.log(`${name}: actualizado`);
  }
}
