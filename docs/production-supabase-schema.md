# Production Supabase schema contract

Captured from the production `public` schema on 2026-08-29. This is a read-only snapshot for application compatibility; it is not a migration.

The machine-readable copy is `tests/fixtures/production-schema-contract.json`, and `tests/schema-contract.test.mjs` checks the application enums and signed-in generation query against it. If production schema changes, update the database migration first, refresh this snapshot, and update the application and tests together.

## Critical `rooms` contract

- Columns: `id`, `user_id`, `room_type`, `goal`, `style_key`, `budget_tier`, `input_image_path`, `input_image_width`, `input_image_height`, `status`, `created_at`, `deleted_at`, `latest_generation_id`, `generation_status`, `generation_step`, `generation_error`, `mode`, `strength`.
- There is **no `rooms.updated_at` column**. Ordering and polling must not select or order by it.
- `status` CHECK: `draft`, `generating`, `generated`, `failed`.
- `room_type` CHECK: `living_room`, `bedroom`, `dining_room`, `office`, `small_space`, `other`.
- `goal` CHECK: `cozier`, `brighter`, `modern`, `bigger`, `refresh_budget`.
- `style_key` CHECK: `modern_minimal`, `cozy_neutral`, `scandinavian`, `japandi`, `soft_boho`, `clean_traditional`.
- `budget_tier` CHECK: `rearrange_only`, `under_500`, `500_1500`, `1500_3000`, `3000_plus`.
- `strength` CHECK: 0 through 100.
- `user_id` references `profiles(id)` with cascade delete.

The application uses `generation_status` for detailed progress (`queued`, `analyzing`, `rearrange`, `redesign`, `uploading`, `done`, or `error`) while the constrained top-level `status` remains one of the four values above.

## Other launch-path tables

`guest_trials` has the 15 columns recorded in the JSON contract. `trial_token` is unique. Production currently has no CHECK constraint on its `status` or selection columns, so route validation remains required.

`generations` has the 15 columns recorded in the JSON contract. `room_id` references `rooms(id)` with cascade delete, and `user_id` references `profiles(id)` with cascade delete.

`profiles.plan` is constrained to `free` or `pro`. Usage fields are `monthly_generation_limit`, `monthly_generations_used`, and `usage_reset_at`.

## Ownership boundary

Production RLS policies restrict `rooms` and `generations` reads and mutations to `auth.uid() = user_id`. Profile reads and safe updates are restricted to the signed-in profile. Guest trials are accessed only through server-side code using the service role and an unguessable/idempotent trial token; client code never receives the service-role key.

## Refresh procedure

Run the existing read-only `information_schema.columns`, `pg_constraint`, and `pg_policies` queries through the Supabase project connection. Never infer a new column or status from application code. After refreshing the fixture, run `npm test`, `npm run typecheck`, and `npm run build`.
