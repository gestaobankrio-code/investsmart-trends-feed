import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arg = process.argv.find((x) => x.startsWith("--max-days="));
const maxDays = Number(arg?.split("=")[1] ?? 3);
const feed = JSON.parse(readFileSync(resolve(import.meta.dirname, "../docs/data/trends.json"), "utf8"));

const ref = feed.registros?.map((r) => r.dataFonte).filter(Boolean).sort().at(-1) ?? feed.semanaFim;
if (!ref) {
  console.error("Feed sem data de referência.");
  process.exit(1);
}
const ageMs = Date.now() - Date.parse(`${ref}T23:59:59Z`);
const ageDays = Math.max(0, Math.floor(ageMs / 86400000));
console.log(`Data da fonte: ${ref}. Idade: ${ageDays} dia(s). Limite operacional: ${maxDays}.`);
if (!Number.isFinite(ageDays) || ageDays > maxDays) process.exit(2);
