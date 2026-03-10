#!/usr/bin/env node
/**
 * debug-inngest.mjs
 * Run from project root: node debug-inngest.mjs
 *
 * To load .env.local for the env check: node -r dotenv/config debug-inngest.mjs dotenv_config_path=.env.local
 * (requires: npm install dotenv)
 *
 * Checks:
 * 1. App is running and serving the Inngest endpoint
 * 2. preview-generate function is registered
 * 3. All required env vars are present
 * 4. ffmpeg is installed
 * 5. Triggers a manual sync of the dev server
 */

import { execSync } from "child_process";
import http from "http";

const APP_URL = "http://localhost:2000";
const INNGEST_URL = "http://localhost:8288";
const INNGEST_ENDPOINT = `${APP_URL}/api/inngest`;

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function ok(msg) { console.log(`${GREEN}✓${RESET} ${msg}`); }
function fail(msg) { console.log(`${RED}✗${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}!${RESET} ${msg}`); }
function header(msg) { console.log(`\n${BOLD}${msg}${RESET}`); }

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on("error", reject);
  });
}

function put(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: "PUT" }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  console.log(`${BOLD}PawCast — Inngest Debug${RESET}`);
  console.log("=".repeat(40));

  // ── 1. Check env vars ────────────────────────────────────────────────────────
  header("1. Environment variables");
  const required = [
    "FAL_KEY",
    "ELEVENLABS_API_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
  ];
  let envOk = true;
  for (const key of required) {
    if (process.env[key]) {
      ok(`${key} is set`);
    } else {
      fail(`${key} is MISSING — add to .env.local`);
      envOk = false;
    }
  }

  // ── 2. Check ffmpeg ──────────────────────────────────────────────────────────
  header("2. ffmpeg");
  try {
    const version = execSync("ffmpeg -version 2>&1").toString().split("\n")[0];
    ok(`ffmpeg found: ${version}`);
  } catch {
    fail("ffmpeg is NOT installed");
    warn("Fix: brew install ffmpeg   (Mac)");
    warn("Fix: sudo apt install ffmpeg   (Linux)");
  }

  // ── 3. Check app is running ──────────────────────────────────────────────────
  header("3. Next.js app (localhost:2000)");
  try {
    const res = await get(`${APP_URL}/api/inngest`);
    if (res.status === 200 || res.status === 405) {
      ok(`App is running at ${APP_URL}`);

      // Check functions are listed
      const body = res.body;
      if (typeof body === "object" && body !== null) {
        const fns = body.fns ?? body.functions ?? [];
        if (Array.isArray(fns) && fns.length > 0) {
          ok(`${fns.length} function(s) registered at /api/inngest:`);
          fns.forEach((f) => console.log(`   • ${f.id ?? f.name ?? JSON.stringify(f)}`));
          const hasPreview = fns.some(
            (f) => (f.id ?? f.name ?? "").includes("preview")
          );
          if (hasPreview) ok("preview-generate is in the list");
          else fail("preview-generate is NOT in the registered functions list");
        } else {
          warn("Could not parse function list from /api/inngest response");
          console.log("   Response:", JSON.stringify(body).substring(0, 200));
        }
      }
    } else {
      fail(`/api/inngest returned status ${res.status}`);
    }
  } catch (e) {
    fail(`App is NOT running at ${APP_URL}`);
    warn("Start it with: npm run dev");
    process.exit(1);
  }

  // ── 4. Check Inngest dev server ──────────────────────────────────────────────
  header("4. Inngest dev server (localhost:8288)");
  try {
    const res = await get(`${INNGEST_URL}/v1/functions`);
    if (res.status === 200) {
      const fns = res.body?.data ?? res.body ?? [];
      ok(`Inngest dev server is running`);
      if (Array.isArray(fns) && fns.length > 0) {
        ok(`${fns.length} function(s) synced to dev server:`);
        fns.forEach((f) => console.log(`   • ${f.id ?? f.slug ?? JSON.stringify(f)}`));
        const hasPreview = fns.some(
          (f) => (f.id ?? f.slug ?? "").includes("preview")
        );
        if (hasPreview) ok("preview-generate is synced to the dev server ✓");
        else {
          fail("preview-generate is NOT synced — triggering sync now...");
          await triggerSync();
        }
      } else {
        warn("No functions synced yet — triggering sync...");
        await triggerSync();
      }
    } else {
      fail(`Inngest dev server returned status ${res.status}`);
    }
  } catch (e) {
    fail("Inngest dev server is NOT running at localhost:8288");
    warn("Start it with: npx inngest-cli@latest dev");
  }

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  header("5. Summary");
  if (!envOk) {
    fail("Fix missing env vars in .env.local first, then restart npm run dev");
  } else {
    ok("If preview-generate is now synced, try generating a trailer again.");
    warn("Watch the npm run dev terminal for pipeline errors (FAL, ElevenLabs, etc.)");
  }
}

async function triggerSync() {
  try {
    // Tell the Inngest dev server to pull functions from the app
    const res = await put(`${INNGEST_URL}/fn/register`);
    ok(`Sync triggered (status ${res.status})`);
    warn(`If that didn't work, open http://localhost:8288, go to Apps, and manually sync: ${INNGEST_ENDPOINT}`);
  } catch {
    warn(`Could not auto-sync. Manually: open http://localhost:8288 → Apps → Add App → ${INNGEST_ENDPOINT}`);
  }
}

main().catch(console.error);
