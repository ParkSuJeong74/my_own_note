CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS easyopen_users(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), google_subject text NOT NULL UNIQUE,
  email text NOT NULL, display_name text, picture_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), last_login_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS easyopen_users_email_ci ON easyopen_users(lower(email));

CREATE TABLE IF NOT EXISTS easyopen_subscriptions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES easyopen_users(id) ON DELETE CASCADE,
  provider text NOT NULL, provider_customer_id text, provider_subscription_id text,
  product_key text NOT NULL, status text NOT NULL CHECK(status IN('pending','active','past_due','canceled','expired')),
  current_period_end timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,provider_subscription_id)
);
CREATE TABLE IF NOT EXISTS easyopen_entitlements(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES easyopen_users(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL, source_type text NOT NULL CHECK(source_type IN('subscription','admin','promotion')),
  source_id text NOT NULL, starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,entitlement_key,source_type,source_id)
);
CREATE TABLE IF NOT EXISTS easyopen_payment_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, provider_event_id text NOT NULL,
  event_type text NOT NULL, payload_sha256 text NOT NULL, status text NOT NULL CHECK(status IN('received','processed','failed')),
  error_code text, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, UNIQUE(provider,provider_event_id)
);
CREATE TABLE IF NOT EXISTS easyopen_audit_events(
  id bigserial PRIMARY KEY, actor_user_id uuid REFERENCES easyopen_users(id) ON DELETE SET NULL,
  action text NOT NULL, target_type text NOT NULL, target_id text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
