# PawCast

**Your dog’s daily Pixar-style sitcom.** Upload photos/videos of your dog (and yourself); the app generates a personalized ~5 minute animated episode every day.

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui  
- **Backend:** Next.js API Routes, Prisma ORM  
- **Database:** PostgreSQL (Supabase)  
- **Auth:** Clerk (social + email)  
- **Storage:** Supabase Storage (images/videos)  
- **AI script:** Anthropic Claude (`claude-sonnet-4-20250514`)  
- **Image-to-video:** Replicate (Stable Video Diffusion)  
- **TTS:** ElevenLabs  
- **Video assembly:** FFmpeg (server-side)  
- **Payments:** Stripe  
- **Background jobs:** Inngest (daily episode + per-request generation)  
- **Deploy:** Vercel  

## Setup

1. **Clone and install**
   ```bash
   cd petcom && npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Fill in all keys (Clerk, Supabase, Anthropic, Replicate, ElevenLabs, Stripe, Inngest)

3. **Database**
   - Create a PostgreSQL database (e.g. Supabase).
   - Set `DATABASE_URL` in `.env.local`.
   - Run:
   ```bash
   npx prisma db push
   ```

4. **Supabase Storage**
   - In Supabase Dashboard, create a storage bucket (e.g. `pawcast-media`).
   - Set `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` if different.

5. **Clerk**
   - Create an application at [clerk.com](https://clerk.com).
   - Add sign-in/sign-up methods and set redirect URLs to your app (e.g. `http://localhost:3000`).

6. **Stripe**
   - Create a product and recurring price for “Pro” in Stripe Dashboard.
   - Set `STRIPE_PRICE_ID_PRO` to that price ID.
   - For local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

7. **Inngest**
   - Sign up at [inngest.com](https://inngest.com), create an app, and add the Inngest dev server or connect Vercel.
   - Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in `.env.local`.

8. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Main flows

- **Landing** (`/`) → Sign in with Clerk → **Onboarding** (`/onboarding`) to add dog + optional owner (name, media, animation style).
- **Dashboard** (`/dashboard`) → Episode list; “Generate episode” enqueues an Inngest job.
- **Episode generation (Inngest):** Script (Claude) → video clip (Replicate SVD) → TTS (ElevenLabs) → FFmpeg assembly → upload to Supabase → episode marked completed.
- **Daily episodes:** Inngest cron `0 8 * * *` creates a new episode for each user with pets and sends `episode/generate`.
- **Billing** (`/dashboard/billing`): Free vs Pro; Stripe Checkout for Pro subscription; webhook updates `Account` and `Subscription`.

## Project layout

- `src/app` – App Router pages and API routes  
- `src/app/(dashboard)/` – Protected dashboard, onboarding, episodes, cast, billing  
- `src/components/ui` – shadcn/ui components  
- `src/lib` – Prisma, Supabase, utils  
- `src/lib/ai` – Claude script, Replicate video, ElevenLabs TTS, FFmpeg assembly  
- `src/inngest` – Inngest client and functions (generate episode, daily cron)  
- `prisma/schema.prisma` – Data model (User, Pet, CastMember, Episode, Account, Subscription)  

## Deploy (Vercel)

- Connect the repo to Vercel.
- Add all env vars from `.env.example`.
- Ensure PostgreSQL (Supabase) and Inngest are configured for production.
- FFmpeg must be available in the runtime for video assembly (e.g. use a serverless function with FFmpeg layer or an external worker that runs FFmpeg).
