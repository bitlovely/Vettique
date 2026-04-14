## Vettique — AI Supplier Vetting

Vettique is a clean web app for **Amazon & Shopify sellers** to vet overseas suppliers before sending payment.

Users enter a supplier profile (company, country/region, platform signals, product category, quote, and red flags). The app calls **Google Gemini 2.5 Pro** to return a structured risk report:
- **Risk score** (0–100)
- **Risk level** (LOW / MEDIUM / HIGH)
- **4–6 flags** (red/amber/green) with specific explanations
- **4–5 recommendations**
- A clear verdict (**proceed / caution / avoid**) with headline + detail

### Tech stack
- **Frontend**: Next.js App Router (React 19)
- **Backend**: Next.js Route Handlers (`app/api/*`)
- **Auth + DB**: Supabase (Postgres + Auth)
- **AI**: Google Gemini API (2.5 Pro)
- **Payments**: Stripe subscriptions (Free vs Pro)
- **Hosting**: Vercel (recommended)

### Core pages
- **Landing**: `/`
- **Auth**: `/auth`
- **Dashboard**: `/analyze`
- **New supplier check**: `/analyze/new`

### Billing tiers
| Tier | Price | Limit |
|------|-------|-------|
| Free | $0 | 3 checks / month |
| Pro | $19 / month | Unlimited checks |

Limits are enforced server-side on each `/api/analyze` call using `profiles.checks_this_month`.

---

## Local development

### 1) Install dependencies
```bash
npm install
```

### 2) Environment variables
Create `.env.local` (or `.env`) and set:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Gemini
GEMINI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> If `GEMINI_API_KEY` is missing or Gemini quota is exceeded, the app falls back to a **demo report** so you can keep testing UI flows.

### 3) Supabase database setup
Run these SQL files in the Supabase SQL editor:
- `supabase.sql` (creates `profiles` for plan + usage + Stripe IDs, plus RLS)
- `supabase_reports.sql` (creates `supplier_reports` for persisted reports, plus RLS)

### 4) Run the app
```bash
npm run dev
```

---

## API routes (server)

### AI analysis
- `POST /api/analyze`
  - Requires an authenticated Supabase user
  - Enforces Free plan monthly limit (3 checks/month)
  - Calls Gemini and returns a structured JSON `report`

### Stripe
- `POST /api/stripe/checkout`
  - Creates a Stripe Checkout session for the Pro subscription
- `POST /api/stripe/portal`
  - Opens Stripe Customer Portal for billing management (Pro users)
- `POST /api/stripe/webhook`
  - Stripe webhooks update `profiles.plan` and Stripe IDs

Recommended webhook events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## Notes / Next steps
- Persist each AI response into `supplier_reports` and list them on `/analyze`.
- Add a report details page (e.g. `/analyze/reports/[id]`).
- Harden webhook handling and move webhook Supabase writes to a service role client when deploying (recommended).

