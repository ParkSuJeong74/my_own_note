BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE identity_principals (
  id uuid PRIMARY KEY,
  issuer text NOT NULL CHECK (issuer <> ''),
  subject text NOT NULL CHECK (subject <> ''),
  email citext NOT NULL CHECK (email <> ''),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  UNIQUE (issuer, subject)
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('PERSONAL', 'SHARED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES identity_principals(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, principal_id)
);

CREATE INDEX workspace_members_principal_idx ON workspace_members (principal_id, workspace_id);

COMMIT;
