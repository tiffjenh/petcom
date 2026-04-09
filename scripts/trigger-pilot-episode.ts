/**
 * Create the pilot episode record and fire the episode/generate Inngest event
 * so the hardcoded "The Ball. A Documentary." 90s pilot is generated.
 *
 * Run from project root:
 *   npx tsx scripts/trigger-pilot-episode.ts
 *
 * Requires: .env.local with DATABASE_URL, INNGEST_EVENT_KEY (optional for dev)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { Inngest } from "inngest";
import { PILOT_EPISODE_ID } from "../src/lib/ai/pilot-documentary-script";

const prisma = new PrismaClient();

/** Test household (Life with Waffles). Replace with your household id if different. */
const TEST_HOUSEHOLD_ID = "cmmjrs7aj00027qwnj5eodrp6";

async function main() {
  const household = await prisma.household.findUnique({
    where: { id: TEST_HOUSEHOLD_ID },
    include: { dogs: true },
  });
  if (!household) {
    throw new Error(`Household ${TEST_HOUSEHOLD_ID} not found. Create it first or set TEST_HOUSEHOLD_ID.`);
  }
  if (household.dogs.length === 0) {
    throw new Error("Household has no dog. Add Waffles (or a dog) first.");
  }

  const existing = await prisma.episode.findUnique({
    where: { id: PILOT_EPISODE_ID },
  });
  if (existing) {
    console.log("Pilot episode already exists:", PILOT_EPISODE_ID);
    console.log("To re-run: delete the episode first, then run this script again.");
    process.exit(1);
  }

  const episode = await prisma.episode.create({
    data: {
      id: PILOT_EPISODE_ID,
      householdId: TEST_HOUSEHOLD_ID,
      title: "The Ball. A Documentary.",
      episodeNum: 1,
      season: 1,
      synopsis: "When Waffles loses her favorite ball at the park, she launches a full investigation.",
      script: {},
      status: "generating",
    },
  });
  console.log("Created pilot episode:", episode.id);

  const inngest = new Inngest({
    id: "pawcast",
    eventKey: process.env.INNGEST_EVENT_KEY,
  });
  await inngest.send({
    name: "episode/generate",
    data: {
      episodeId: episode.id,
      householdId: household.id,
      episodeNum: episode.episodeNum,
      season: episode.season,
    },
  });
  console.log("Fired episode/generate event. Check Inngest dashboard for progress.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
