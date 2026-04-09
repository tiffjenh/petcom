/**
 * Create a fresh episode for a household and output Inngest test event JSON.
 * Run: npx tsx scripts/create-episode-and-inngest-event.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HOUSEHOLD_ID = "cmmjrs7aj00027qwnj5eodrp6";

async function main() {
  const household = await prisma.household.findUnique({
    where: { id: HOUSEHOLD_ID },
    include: { dogs: true },
  });
  if (!household) {
    throw new Error(`Household ${HOUSEHOLD_ID} not found.`);
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

  console.log("1. Episode count (before this create):", episodeCount);
  console.log("2. Created episode:", episode.id, "episodeNum:", episode.episodeNum, "season:", episode.season);

  const dog = household.dogs[0];
  if (dog) {
    console.log("3. dog.animatedAvatar:", dog.animatedAvatar ?? "(null)");
    console.log("4. dog.voiceArchetype:", dog.voiceArchetype ?? "(null)");
    console.log("5. dog.characterBio:", dog.characterBio ?? "(null)");
    console.log("   dog.personality:", dog.personality?.length ? dog.personality.join(", ") : "[]");
  } else {
    console.log("3–5. No dog in household.");
  }

  const humorStyles = (household as { humorStyles?: string[] }).humorStyles ?? household.showStyle ?? [];
  console.log("6. household.humorStyles / showStyle:", humorStyles.length ? humorStyles : "(empty)");

  const eventPayload = {
    name: "episode/generate" as const,
    data: {
      episodeId: episode.id,
      episodeNum: episode.episodeNum,
      householdId: household.id,
      season: episode.season,
    },
  };

  console.log("\n═══════════════════════════════════════");
  console.log("Inngest test event JSON (paste into Inngest):");
  console.log("═══════════════════════════════════════\n");
  console.log(JSON.stringify(eventPayload, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
