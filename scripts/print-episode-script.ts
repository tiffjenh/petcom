/**
 * Print the script field for an episode. Run from repo root:
 *   npx tsx scripts/print-episode-script.ts
 *   EPISODE_ID=cmmjsnak3000b13vvxqbx9m2z npx tsx scripts/print-episode-script.ts
 */
import { prisma } from "../src/lib/prisma";

const EPISODE_ID = process.env.EPISODE_ID ?? "cmmjsnak3000b13vvxqbx9m2z";

async function main() {
  const episode = await prisma.episode.findUnique({
    where: { id: EPISODE_ID },
    select: { id: true, title: true, synopsis: true, script: true, status: true },
  });
  if (!episode) {
    console.error("Episode not found:", EPISODE_ID);
    process.exit(1);
  }
  console.log("--- episode (title, synopsis, status) ---");
  console.log(JSON.stringify({ title: episode.title, synopsis: episode.synopsis, status: episode.status }, null, 2));
  console.log("\n--- script (exactly as stored in DB) ---");
  console.log(JSON.stringify(episode.script, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
