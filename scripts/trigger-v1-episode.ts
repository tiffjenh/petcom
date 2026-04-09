/**
 * Create a V1 episode record for the test household and output the Inngest
 * test event JSON to fire episode/generate (4 scenes × 2 clips, 720P, 60s).
 *
 * Run from project root:
 *   npx tsx scripts/trigger-v1-episode.ts
 *
 * Requires: .env.local with DATABASE_URL. Optionally set INNGEST_EVENT_KEY to
 * actually send the event; otherwise the script only creates the episode and
 * prints the JSON for manual trigger.
 */

import { PrismaClient } from "@prisma/client";
import { Inngest } from "inngest";

const prisma = new PrismaClient();

const TEST_HOUSEHOLD_ID = "cmmjrs7aj00027qwnj5eodrp6";

async function main() {
  const household = await prisma.household.findUnique({
    where: { id: TEST_HOUSEHOLD_ID },
    include: { dogs: true },
  });
  if (!household) {
    throw new Error(`Household ${TEST_HOUSEHOLD_ID} not found.`);
  }
  if (household.dogs.length === 0) {
    throw new Error("Household has no dog.");
  }

  const episodeCount = await prisma.episode.count({
    where: { householdId: household.id },
  });
  const nextNum = episodeCount + 1;

  const episode = await prisma.episode.create({
    data: {
      householdId: household.id,
      episodeNum: nextNum,
      season: 1,
      title: `Episode ${nextNum}`,
      synopsis: "",
      script: {},
      status: "pending",
    },
  });

  console.log("Created episode:", episode.id, `(Episode ${nextNum})`);

  const eventPayload = {
    name: "episode/generate" as const,
    data: {
      episodeId: episode.id,
      householdId: household.id,
      episodeNum: episode.episodeNum,
      season: episode.season,
    },
  };

  console.log("\nInngest test event JSON (paste into Inngest dashboard or use with send):\n");
  console.log(JSON.stringify(eventPayload, null, 2));

  if (process.env.INNGEST_EVENT_KEY) {
    const inngest = new Inngest({
      id: "pawcast",
      eventKey: process.env.INNGEST_EVENT_KEY,
    });
    await inngest.send(eventPayload);
    console.log("\nEvent sent to Inngest.");
  } else {
    console.log("\nSet INNGEST_EVENT_KEY in .env.local to send the event automatically.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
