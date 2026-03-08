# Connecting Clerk, GitHub, Supabase, and Vercel

This guide walks through connecting all four services so you can run the app locally and deploy it to production.

---

## 1. GitHub — Host your code

1. **Create a repo** (if you haven’t already):
   - [github.com/new](https://github.com/new)
   - Name it (e.g. `petcom` or `pawcast`), choose Public or Private.

2. **Push your project** from your machine:

   ```bash
   cd /path/to/petcom
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. **Keep `.env.local` out of the repo**  
   The project’s `.gitignore` should already include `.env.local` and `.env*.local`. Never commit real API keys.

---

## 2. Clerk — Authentication

1. Go to **[dashboard.clerk.com](https://dashboard.clerk.com)** and sign in (or create an account).
2. **Create an Application** (or use an existing one).
3. In the sidebar, open **API Keys**.
4. Copy:
   - **Publishable key** (`pk_test_...` or `pk_live_`) → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** (`sk_test_...` or `sk_live_`) → `CLERK_SECRET_KEY`

**Local:** Put these in `.env.local` (see [SETUP.md](./SETUP.md)).

**Vercel:** In your Vercel project → **Settings → Environment Variables**, add the same two variables for Production, Preview, and Development.

**Optional:** Under **Paths** in the Clerk dashboard you can set Sign-in and Sign-up URLs. The app uses `/sign-in` and `/sign-up` and redirects to `/onboarding` after sign-up and `/dashboard` after sign-in (configured in `ClerkProvider` in `src/app/layout.tsx`).

---

## 3. Supabase — Database and storage

The app uses Supabase for **PostgreSQL** (via Prisma) and **Storage** (episode media).

### 3.1 Create a project

1. Go to **[supabase.com](https://supabase.com)** and sign in.
2. **New project** → pick org, name, database password, region.
3. Wait for the project to be ready.

### 3.2 Database (Prisma)

1. In Supabase: **Project Settings** (gear) → **Database**.
2. Under **Connection string**, choose **URI** and copy the connection string.
3. Replace the placeholder password with your **database password**:
   - Format: `postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-[region].pooler.supabase.com:6543/postgres`
   - For Prisma you can use the **Transaction** pooler (port `6543`) or **Session** (port `5432`). This app works with either; use the one Supabase shows.

**Local:** In `.env.local`:

```env
DATABASE_URL="postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

If you use the direct session URL (port 5432), you can omit `?pgbouncer=true`.

**Run migrations:**

```bash
npx prisma migrate deploy
# or for dev: npx prisma migrate dev
```

**Vercel:** Add `DATABASE_URL` with the same Supabase connection string (use the pooler URL for serverless).

### 3.3 Supabase API keys and storage bucket

1. In Supabase: **Project Settings** → **API**.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret; server-only).

3. **Storage:** In the left sidebar open **Storage**, create a bucket named **`pawcast-media`** (or the name you set in `.env`). Set it to **Public** if the app serves media by URL, or keep it private and serve via signed URLs (the app’s bucket name is set by `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`).

**Local and Vercel:**

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET="pawcast-media"
```

---

## 4. Vercel — Deployment

1. Go to **[vercel.com](https://vercel.com)** and sign in (use **Continue with GitHub** so Vercel can see your repos).
2. **Add New** → **Project** → **Import** your GitHub repo (e.g. `petcom`).
3. **Configure:**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave default unless the app lives in a subfolder.
   - **Build Command:** `next build` (default).
   - **Output Directory:** leave default.

4. **Environment variables:**  
   Before or after the first deploy, go to **Project → Settings → Environment Variables** and add every variable your app needs. At minimum for auth + DB + storage:

   - From **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - From **Supabase:** `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`

   Add the rest from `.env.example` when you enable those features (Stripe, Inngest, Resend, etc.). Set **NEXT_PUBLIC_APP_URL** to your Vercel URL (e.g. `https://your-project.vercel.app`).

5. **Deploy:**  
   Click **Deploy**. Vercel will build from `main` and give you a URL. Future pushes to `main` (or your production branch) will trigger new deployments.

6. **Clerk allowed origins:**  
   In the Clerk dashboard, add your Vercel URL (e.g. `https://your-project.vercel.app`) under **Settings → Domains** (or **Paths / allowed origins**) so sign-in works in production.

---

## Quick reference

| Service   | What you need |
|----------|----------------|
| **GitHub** | Repo created, code pushed; `.env.local` not committed. |
| **Clerk**  | App created; publishable + secret keys in env; add Vercel domain in Clerk. |
| **Supabase** | Project created; `DATABASE_URL` (PostgreSQL), API URL + anon + service_role keys; storage bucket `pawcast-media`. |
| **Vercel** | Project imported from GitHub; all env vars set; deploy. |

For local-only setup (Clerk + optional DB), see [SETUP.md](./SETUP.md). For full env vars list see [.env.example](../.env.example) in the project root.
