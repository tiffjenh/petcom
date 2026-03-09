import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Use SUPABASE_SERVICE_ROLE_KEY (project standard); fallback for SUPABASE_SERVICE_KEY
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(process.env.SUPABASE_URL!, serviceKey!);

const buckets = [
  {
    name: "pawcast-media",
    public: true,
    fileSizeLimit: 52428800, // 50MB
    description: "Main bucket for demo uploads and generated media",
  },
  {
    name: "demo-uploads",
    public: true,
    fileSizeLimit: 52428800, // 50MB
    description: "Temporary photo/video uploads from anonymous demo users",
  },
  {
    name: "user-uploads",
    public: false,
    fileSizeLimit: 52428800, // 50MB
    description: "Permanent photo/video uploads from registered users",
  },
  {
    name: "avatars",
    public: true,
    fileSizeLimit: 10485760, // 10MB
    description: "Generated animated avatars for dogs and cast members",
  },
  {
    name: "style-previews",
    public: true,
    fileSizeLimit: 10485760, // 10MB
    description: "Generated dog images in all 18 art styles",
  },
  {
    name: "trailers",
    public: true,
    fileSizeLimit: 52428800, // 50MB (Supabase free tier max; increase in Dashboard on higher plan)
    description: "30-second trailer videos",
  },
  {
    name: "episodes",
    public: false,
    fileSizeLimit: 52428800, // 50MB (increase in Dashboard on Pro/Team)
    description: "Full weekly episode videos for subscribers",
  },
];

async function setupStorage() {
  console.log("🪣 Setting up Supabase storage buckets...\n");

  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
      });

      if (error) {
        if (error.message.includes("already exists")) {
          console.log(`✓ Already exists: ${bucket.name}`);
        } else {
          console.error(`✗ Failed: ${bucket.name} — ${error.message}`);
        }
      } else {
        console.log(
          `✅ Created: ${bucket.name} (${bucket.public ? "public" : "private"})`
        );
      }
    } catch (err) {
      console.error(`✗ Error creating ${bucket.name}:`, err);
    }
  }

  console.log("\n📋 Setting up storage policies...\n");

  // Storage policies: Supabase uses RLS on storage.objects. Service role can bypass RLS.
  // If you need anon/authenticated access, add policies in Dashboard → Storage → bucket → Policies.
  try {
    const r1 = await supabase.rpc("exec_sql", {
      sql: `
      DO $$ BEGIN
        CREATE POLICY "Public demo upload access"
        ON storage.objects FOR ALL
        USING (bucket_id = 'demo-uploads')
        WITH CHECK (bucket_id = 'demo-uploads');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
    });
    if (r1?.error) throw r1.error;
    console.log("✅ Policy set: demo-uploads");
  } catch {
    console.log(
      "⚠ Policies skipped (use Dashboard → Storage → bucket → Policies if needed)."
    );
  }

  try {
    const r2 = await supabase.rpc("exec_sql", {
      sql: `
      DO $$ BEGIN
        CREATE POLICY "Public pawcast-media access"
        ON storage.objects FOR ALL
        USING (bucket_id = 'pawcast-media')
        WITH CHECK (bucket_id = 'pawcast-media');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
    });
    if (r2?.error) throw r2.error;
    console.log("✅ Policy set: pawcast-media");
  } catch {
    // Already logged above
  }

  console.log("\n🎉 Storage setup complete!");
  console.log("\nBuckets created:");
  buckets.forEach((b) => {
    console.log(
      `  - ${b.name} (${b.public ? "public" : "private"}) — ${b.description}`
    );
  });
}

setupStorage().catch(console.error);
