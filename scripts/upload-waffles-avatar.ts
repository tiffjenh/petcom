/**
 * One-off: Upload StyleAI avatar image to Supabase "avatars" bucket and set
 * dog.animatedAvatar for the dog in householdId cmmjrs7aj00027qwnj5eodrp6.
 *
 * Usage (from repo root, with .env.local loaded):
 *   AVATAR_IMAGE_PATH=/mnt/user-data/uploads/896e7697-7da7-4a6f-b27d-a9f8648add88.png npx tsx scripts/upload-waffles-avatar.ts
 *
 * Ensure bucket "avatars" exists (e.g. run scripts/setup-storage.ts first).
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HOUSEHOLD_ID = "cmmjrs7aj00027qwnj5eodrp6";
const BUCKET = "avatars";
const DEFAULT_IMAGE_PATH = "/mnt/user-data/uploads/896e7697-7da7-4a6f-b27d-a9f8648add88.png";

async function main() {
  const imagePath = process.env.AVATAR_IMAGE_PATH ?? DEFAULT_IMAGE_PATH;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }

  const buffer = await readFile(imagePath);
  const supabase = createClient(supabaseUrl, serviceKey);
  const key = `waffles-styleai-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(key);
  console.log("Uploaded avatar URL:", publicUrl);

  const prisma = new PrismaClient();
  const dog = await prisma.dog.findFirst({
    where: { householdId: HOUSEHOLD_ID },
    orderBy: { createdAt: "asc" },
  });
  if (!dog) throw new Error(`No dog found for household ${HOUSEHOLD_ID}`);

  await prisma.dog.update({
    where: { id: dog.id },
    data: { animatedAvatar: publicUrl },
  });
  console.log("Updated dog", dog.id, dog.name, "animatedAvatar ->", publicUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
