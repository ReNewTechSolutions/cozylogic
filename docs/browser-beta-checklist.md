# CozyLogic browser beta checklist

Use this checklist for a small, monitored browser beta. It does not require a new admin dashboard or a second analytics database.

## Required configuration

Required Vercel variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `COZYLOGIC_IMAGE_MODEL`
- `AMAZON_ASSOCIATE_TAG` when affiliate links are enabled

Recommended explicit production overrides (the code has safe defaults when these are absent):

- `COZYLOGIC_IMAGE_QUALITY` and `COZYLOGIC_IMAGE_SIZE`
- `COZYLOGIC_FREE_FIX_IMAGE_MODEL`, `COZYLOGIC_FREE_FIX_IMAGE_QUALITY`, and `COZYLOGIC_FREE_FIX_IMAGE_SIZE`
- `COZYLOGIC_DAILY_IMAGE_CALL_LIMIT` (set production to `25` for the initial beta; the code also defaults to 25 image-job reservations per UTC day)

Keep `DEV_BYPASS_LIMITS` absent or false in production. The QA preservation variables are local-harness settings and are not required by production routes. Never place the OpenAI key or Supabase service-role key in a `NEXT_PUBLIC_` variable.

Supabase resources:

- Auth magic-link sign-in with `https://cozylogic.app/auth/callback` allowed as a redirect URL
- `profiles`, `rooms`, `generations`, and `guest_trials` tables with the production schema contract
- Private `room-inputs` and `room-outputs` buckets
- Row-level security on user-owned tables and storage objects; service-role access only in server routes

OpenAI:

- The account can access each configured image model.
- Production image routes use `n=1`, no fallback image call, and SDK `maxRetries: 0` where the SDK is used.
- Free Fix remains configured separately and uses its validated one-pass preservation prompt.

Amazon Associates:

- `AMAZON_ASSOCIATE_TAG` is the approved production tag.
- The result page disclosure remains visible.
- Free Fix has no shopping section; other budget tiers retain optional Amazon search links.

## Limits and abuse controls

- Free accounts default to one generation per month; profile limits remain the signed-in source of truth.
- Guest retries reuse the deterministic upload/selection job key; signed-in duplicates reuse the existing matching room.
- Completed generations and page refreshes do not create a new image call.
- The global `COZYLOGIC_DAILY_IMAGE_CALL_LIMIT` fails closed when its count cannot be read and returns a friendly 429 when exhausted.
- Uploads are limited to signature-checked JPG, PNG, or WebP files no larger than 10 MB. HEIC/HEIF is rejected before upload with conversion guidance.
- Before inviting users, configure the Vercel Firewall rules below. Keep the application-level daily circuit breaker enabled: the database count is conservative but is not an atomic distributed rate limiter, and Vercel WAF counters are maintained per region.

### Vercel Firewall dashboard rules

The current Pro fixed-window maximum is 10 minutes, so the requested hourly policies need conservative 10-minute mappings. Create these six rules in **Project → Firewall → Configure → New Rule**:

| Rule | Conditions (all must match) | Key / algorithm | Limit | Exceeded action |
| --- | --- | --- | --- | --- |
| Demo upload burst | Environment = Production; Method = POST; Request Path = `/api/demo/upload` | IP address / Fixed Window | 5 requests / 60 seconds | Default (429) |
| Demo upload sustained | Environment = Production; Method = POST; Request Path = `/api/demo/upload` | IP address / Fixed Window | 3 requests / 10 minutes (conservative mapping of 20/hour) | Default (429) |
| Demo generate burst | Environment = Production; Method = POST; Request Path = `/api/demo/generate` | IP address / Fixed Window | 2 requests / 60 seconds | Default (429) |
| Demo generate sustained | Environment = Production; Method = POST; Request Path = `/api/demo/generate` | IP address / Fixed Window | 1 request / 10 minutes (closest available mapping of 5/hour) | Default (429) |
| Signed-in generate burst | Environment = Production; Method = POST; Request Path = `/api/generate` | IP address / Fixed Window | 3 requests / 60 seconds | Default (429) |
| Signed-in generate sustained | Environment = Production; Method = POST; Request Path = `/api/generate` | IP address / Fixed Window | 1 request / 10 minutes (conservative mapping of 10/hour) | Default (429) |

For each rule, first set the exceeded action to **Log**, save, select **Review Changes**, and publish the staged rule. Observe production traffic for at least 10 minutes and exercise the matching preview flow. Only after confirming legitimate users are not over-matched should the exceeded action be changed to **Default (429)** and published again. Keep burst rules above their sustained companion rules. If a future plan/interface supports a 60-minute window, replace the sustained mappings with the exact targets: 20/hour, 5/hour, and 10/hour respectively.

Do not add path-prefix rules and do not include GET requests. The exact-path and POST conditions leave polling/status traffic untouched.

## No-cost smoke test

1. Open `/`, `/demo`, and `/login` on desktop and a narrow mobile viewport.
2. Confirm `/app`, `/app/history`, and `/app/account` redirect unauthenticated users to login.
3. Sign in with a QA magic link and open dashboard, history, account, and an existing saved result.
4. Refresh that result and confirm no request to `/api/generate` or `/api/demo/generate` occurs.
5. Confirm an existing Free Fix result shows “Use what you have” and no shopping section.
6. Confirm an existing non-Free-Fix result shows “Shop this cozy look,” the Associates disclosure, and tagged Amazon links.
7. Check the browser console and failed network requests. Do not submit a generation during this smoke test.

## Failures, usage, and cost

- Product funnel and affiliate-click counts: Vercel project → Analytics → Events.
- Page views: Vercel project → Analytics.
- Failures and timings: Vercel project → Logs; filter JSON logs by `service=cozylogic`, `event=final_failure`, or `scope=generation-metrics`.
- Export the relevant Vercel runtime logs as JSONL, then run `npm run beta:metrics -- path/to/export.jsonl` for image-call count, model/quality mix, completion rate, timing averages, and token-derived estimated cost.
- Supabase is the operational cross-check: `rooms` records signed-in jobs, `guest_trials` records guest jobs, `generations` records completed signed-in outputs, and `profiles` records monthly signed-in usage.
- Cost estimates use the response token counts and documented per-token rates in `lib/cozylogic/imageUsage.ts`. Recheck rates when changing models.

## Rollback

1. Pause beta invitations and lower the daily circuit breaker if spend or abuse rises unexpectedly.
2. Roll back the latest Vercel deployment to the prior known-good production deployment.
3. Do not delete user rooms or generations during rollback; saved results are independent of the frontend deployment.
4. Verify `/`, `/login`, protected redirects, and one existing result after rollback without creating an image.
5. Review `final_failure`, `generation_metric`, and Vercel Analytics events before reopening access.
