# ONE — Data Model

Target schema for Milestone 2 (Supabase/Postgres). Milestone 1 uses the same shapes as in-memory TypeScript types (`lib/engine/types.ts`), so persistence is a storage change, not a redesign.

Conventions: UUID primary keys; `created_at`/`updated_at` timestamptz on mutable tables; all money columns are **bigint minor units** (fils) with a `currency` char(3); RLS on every user table keyed by `user_id = auth.uid()`.

## Tables

**profiles** — `id (uuid, = auth.users.id)`, display_name, locale, created_at, updated_at

**financial_profiles** — id, user_id, monthly_income_minor nullable, income_type (`salary|irregular|mixed`), pay_frequency, next_payday date, essential_monthly_estimate_minor, housing_cost_minor, debt_payments_minor, emergency_target_months, minimum_cash_buffer_minor, risk_preference (`low|moderate|high`), investment_experience, dependents_count, preferred_currency, country, created_at, updated_at

**accounts** — id, user_id, name, kind (`checking|savings|cash|other`), balance_minor, currency, source (`manual|demo|bank_api_future`), bank_connection_id nullable, created_at, updated_at

**transactions** — id, user_id, account_id, external_id nullable, amount_minor, currency, direction (`credit|debit`), merchant, merchant_normalized, description, category, subcategory, transaction_date, posted_date, is_recurring bool, recurring_group_id nullable, source (`manual|csv|demo|bank_api_future`), confidence numeric, created_at, updated_at

**recurring_transactions** — id, user_id, merchant_normalized, average_amount_minor, currency, frequency (`weekly|monthly|yearly|custom`), next_expected_date, confidence, type (`bill|subscription|income|other`), active bool, created_at, updated_at

**money_buckets** — id, user_id, key (`life|bills|protect|grow|goals|enjoy`), custom bool, display_order, created_at

**allocations** — id, user_id, income_transaction_id nullable, total_minor, status (`recommended|adjusted|accepted|rejected`), generated_by (`engine`), engine_version, created_at, updated_at

**allocation_items** — id, allocation_id, bucket_key, goal_id nullable, recommended_minor, final_minor, reason_code, reason_inputs jsonb, confidence

**goals** — id, user_id, name, emoji, target_minor, current_minor, currency, target_date nullable, priority (`low|medium|high`), deadline_flexible bool, image_url nullable, auto_allocate bool, status (`active|paused|done`), created_at, updated_at

**goal_contributions** — id, goal_id, user_id, amount_minor, source (`allocation|manual|found_money`), created_at

**insights** — id, user_id, type (`found_money|subscription_increase|duplicate_subscription|price_increase|unusual_spend|fee|forgotten_subscription`), title, description, monthly_impact_minor, annual_impact_minor, confidence, supporting_transaction_ids uuid[], status (`new|reviewed|accepted|dismissed|resolved`), created_at, updated_at

**one_scores** — id, user_id, score int, components jsonb (per-component value + formula inputs), best_next_move jsonb, created_at

**cashflow_forecasts** — id, user_id, generated_at, horizon_days, daily jsonb (date → projected_balance_minor), low_cash_date nullable, buffer_minor

**ai_conversations** — id, user_id, title, created_at, updated_at
**ai_messages** — id, conversation_id, role (`user|assistant|tool`), content, tool_name nullable, tool_payload jsonb nullable, created_at

**user_preferences** — id, user_id, notifications jsonb, theme, language, created_at, updated_at

**audit_events** — id, user_id, event (`allocation_accepted|goal_changed|account_imported|profile_changed|ai_recommendation_generated|…`), metadata jsonb (no sensitive free text), created_at

**bank_connections** — id, user_id, provider, status (`connected|revoked|error`), external_ref, created_at, updated_at (tokens live in a server-only vault, never in this table in plaintext)

## Notes

- Categories: `Income, Housing, Groceries, Dining, Transport, Shopping, Entertainment, Subscriptions, Utilities, Health, Education, Travel, Debt, Transfers, Investments, Savings, Fees, Cash, Other` — stored as text with a lookup table later so categories can evolve.
- User category corrections become reusable rules (`user_id, merchant_normalized → category`), applied before any AI classification.
- `reason_inputs` on allocation items powers the "Why?" explainability UI with actual numbers used.
