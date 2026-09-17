import { people, families } from "../src/data/sampleData";
import { saveTree } from "../api/_lib/db";

async function main() {
  await saveTree(people, families);
  console.log(`Seed abgeschlossen: ${people.length} Personen, ${families.length} Familien.`);
}

main().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exitCode = 1;
});
