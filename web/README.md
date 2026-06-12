# CorpoRite Web

Next.js marketing site, dashboard, and credits backend for the CorpoRite Chrome extension.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in `.env.local`:
   - **DATABASE_URL** — Neon Postgres connection string
   - **AUTH_SECRET** — `openssl rand -base64 32`
   - **AUTH_GOOGLE_ID** / **AUTH_GOOGLE_SECRET** — Google OAuth (Web application)
   - **OPENAI_API_KEY** — server-side OpenAI key
   - **STRIPE_*** — Stripe keys and price IDs for credit packs
   - **NEXT_PUBLIC_APP_URL** — `http://localhost:3000` for local dev

3. Push database schema:

   ```bash
   npm run db:push
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Google OAuth setup

1. Create a **Web application** OAuth client in Google Cloud Console.
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. For production, add your deployed URL callback as well.

## Stripe setup

1. Create two one-time payment products (500 credits / $5, 2000 credits / $15).
2. Copy price IDs to `STRIPE_PRICE_500` and `STRIPE_PRICE_2000`.
3. Set up webhook endpoint: `https://your-domain.com/api/stripe/webhook`
4. Listen for `checkout.session.completed`.

## Deploy (Vercel)

1. Import the `web/` directory as a Vercel project.
2. Add all environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_APP_URL` to your production domain.
4. Update `API_BASE_URL` in the extension's `shared/constants.js` to match.

## API endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/rewrite` | Bearer token | Rewrite text, deduct 1 credit |
| `GET /api/credits` | Bearer token or session | Credit balance + recent activity |
| `POST /api/stripe/checkout` | Session | Create Stripe Checkout session |
| `POST /api/stripe/webhook` | Stripe signature | Handle successful payments |
| `GET /auth/extension` | Session | Extension OAuth handoff |
