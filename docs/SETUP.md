# Setup — Get the app running on localhost:2000

The **"Missing Clerk Secret Key or API Key"** error means the app needs environment variables before it can run.

## 1. Create your env file

From the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and fill in at least the **Clerk** keys (required for the app to load).

## 2. Get Clerk keys (required)

1. Go to **[dashboard.clerk.com](https://dashboard.clerk.com)** and sign in or create an account.
2. Create an **Application** (or use an existing one).
3. Open **API Keys** in the sidebar.
4. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`) → put in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_` or `sk_live_`) → put in `CLERK_SECRET_KEY`

In `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

## 3. Restart the dev server

After saving `.env.local`:

```bash
npm run dev
```

Then open **http://localhost:2000**. The server error should be gone and you can sign in and use the app.

---

**Optional (for full features later):**  
Add `DATABASE_URL`, Supabase keys, and other vars from `.env.example` when you need the database, uploads, and episode generation. For just viewing the UI and testing auth, Clerk keys are enough to get past the error.

For connecting **Clerk, GitHub, Supabase, and Vercel** together (including deployment), see [CONNECTING_SERVICES.md](./CONNECTING_SERVICES.md).
