BEGIN;
CREATE TABLE IF NOT EXISTS easyopen_device_requests(
  device_hash text PRIMARY KEY, user_code_hash text NOT NULL UNIQUE,
  platform text NOT NULL CHECK(platform IN('desktop','android','ios')),
  expires_at timestamptz NOT NULL, approved_user_id uuid REFERENCES easyopen_users(id) ON DELETE CASCADE,
  consumed_at timestamptz, last_polled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS easyopen_device_requests_expiry ON easyopen_device_requests(expires_at);
CREATE TABLE IF NOT EXISTS easyopen_device_sessions(
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES easyopen_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS easyopen_device_sessions_user ON easyopen_device_sessions(user_id);
COMMIT;
