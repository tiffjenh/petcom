/**
 * Pre-flight checks for pilot episode generation, then create episode and output Inngest event.
 * Run: npx tsx scripts/pilot-preflight-and-create.ts
 *
 * Household: cmmjrs7aj00027qwnj5eodrp6
 * Ensures: comedy style, dog data, voiceArchetype, animatedAvatar, env vars.
 */

try {
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv optional
}
import { PrismaClient } from "@prisma/client";
import { assignVoiceArchetype } from "../src/lib/ai/voice-archetypes";
import { generateDogAvatar } from "../src/lib/ai/fal-styles";

const prisma = new PrismaClient();
const HOUSEHOLD_ID = "cmmjrs7aj00027qwnj5eodrp6";

const ENV_KEYS = [
  "FAL_KEY",
  "ANTHROPIC_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_PROFESSIONAL",
  "ELEVENLABS_VOICE_CHAOS",
  "ELEVENLABS_VOICE_SWEETHEART",
  "ELEVENLABS_VOICE_PHILOSOPHER",
  "ELEVENLABS_VOICE_DRAMATIC",
  "ELEVENLABS_VOICE_CHILL",
  "ELEVENLABS_VOICE_NARRATOR",
];

function envCheck(key: string): "✓" | "✗" {
  const v = process.env[key];
  return v !== undefined && String(v).trim() !== "" ? "✓" : "✗";
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("PRE-FLIGHT CHECKS");
  console.log("═══════════════════════════════════════\n");

  // 1. Household
  const household = await prisma.household.findUnique({
    where: { id: HOUSEHOLD_ID },
    include: { dogs: true, castMembers: true },
  });
  if (!household) {
    console.error("Household not found:", HOUSEHOLD_ID);
    process.exit(1);
  }

  const humorStyles = (household as { humorStyles?: string[] }).humorStyles;
  const showStyle = household.showStyle ?? [];
  const comedyStyle = humorStyles?.[0] ?? showStyle[0] ?? "(none — will default to mockumentary)";

  console.log("1. HOUSEHOLD");
  console.log("   humorStyles / showStyle → comedy style:", comedyStyle);
  console.log("   showTitle:", household.showTitle);
  console.log("");

  // 2. Dog
  const dog = household.dogs[0];
  if (!dog) {
    console.error("No dog in household.");
    process.exit(1);
  }

  const photoUrls = Array.isArray((dog as { photoUrls?: string[] }).photoUrls)
    ? (dog as { photoUrls: string[] }).photoUrls
    : [];

  console.log("2. DOG");
  console.log("   name:", dog.name);
  console.log("   breed:", dog.breed ?? "(null)");
  console.log("   bio:", (dog as { bio?: string }).bio ?? "(not on schema)");
  console.log("   characterBio:", dog.characterBio ?? "(null)");
  console.log("   personality chips:", dog.personality?.join(", ") ?? "[]");
  console.log("   voiceArchetype:", dog.voiceArchetype ?? "(null)");
  console.log("   animatedAvatar:", dog.animatedAvatar ? `${dog.animatedAvatar.slice(0, 60)}...` : "(null)");
  console.log("   photoUrls count:", photoUrls.length);
  console.log("");

  // 3. Env vars
  console.log("3. ENV VARS (existence only)");
  let missingCritical = false;
  for (const key of ENV_KEYS) {
    const status = envCheck(key);
    if (status === "✗" && (key === "FAL_KEY" || key === "ANTHROPIC_API_KEY" || key === "ELEVENLABS_API_KEY")) {
      missingCritical = true;
    }
    console.log(`   ${key} ${status}`);
  }
  console.log("");

  // 4. Assign voiceArchetype if null
  if (!dog.voiceArchetype) {
    console.log("4. VOICE ARCHETYPE — assigning from personality...");
    const archetype = assignVoiceArchetype(dog.personality ?? []);
    await prisma.dog.update({
      where: { id: dog.id },
      data: { voiceArchetype: archetype.id },
    });
    console.log("   Assigned:", archetype.id);
  } else {
    console.log("4. VOICE ARCHETYPE — already set:", dog.voiceArchetype);
  }
  console.log("");

  // 5. Generate avatar if null
  if (!dog.animatedAvatar) {
    console.log("5. ANIMATED AVATAR — generating...");
    const urls = photoUrls.length > 0 ? photoUrls : [dog.photoUrl];
    const { primary, alt } = await generateDogAvatar(urls, dog.name, dog.breed);
    await prisma.dog.update({
      where: { id: dog.id },
      data: { animatedAvatar: primary, animatedAvatarAlt: alt },
    });
    console.log("   Saved primary URL (truncated):", primary.slice(0, 60) + "...");
  } else {
    console.log("5. ANIMATED AVATAR — already exists.");
  }
  console.log("");

  if (missingCritical) {
    console.warn("\n⚠️  Critical env vars missing (FAL_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY).");
    console.warn("   Set them in .env.local before triggering the Inngest event.\n");
  }

  // Create episode
  const episodeCount = await prisma.episode.count({ where: { householdId: HOUSEHOLD_ID } });
  const nextNum = episodeCount + 1;

  const episode = await prisma.episode.create({
    data: {
      householdId: HOUSEHOLD_ID,
      episodeNum: nextNum,
      season: 1,
      title: `Episode ${nextNum}`,
      synopsis: "",
      script: {},
      status: "pending",
    },
  });

  console.log("═══════════════════════════════════════");
  console.log("EPISODE CREATED");
  console.log("═══════════════════════════════════════");
  console.log("   episodeId:", episode.id);
  console.log("   episodeNum:", nextNum);
  console.log("   season: 1");
  console.log("");

  const eventPayload = {
    name: "episode/generate",
    data: {
      episodeId: episode.id,
      episodeNum: nextNum,
      householdId: HOUSEHOLD_ID,
      season: 1,
      sceneCount: 6,
    },
  };

  console.log("INNGEST TEST EVENT (paste into localhost:8288):");
  console.log(JSON.stringify(eventPayload, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
