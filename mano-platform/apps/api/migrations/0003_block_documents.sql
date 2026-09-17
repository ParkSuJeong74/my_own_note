BEGIN;

ALTER TABLE nodes
  ADD COLUMN created_operation_id uuid;

CREATE UNIQUE INDEX nodes_workspace_creation_operation_idx
  ON nodes (workspace_id, created_operation_id)
  WHERE created_operation_id IS NOT NULL;

CREATE TABLE documents (
  page_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, workspace_id),
  FOREIGN KEY (page_id, workspace_id)
    REFERENCES nodes(id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE document_revisions (
  page_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
  created_by uuid NOT NULL REFERENCES identity_principals(id),
  operation_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('CREATE', 'EDIT', 'RESTORE', 'IMPORT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, revision),
  UNIQUE (workspace_id, operation_id),
  FOREIGN KEY (page_id, workspace_id)
    REFERENCES documents(page_id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX document_revisions_workspace_page_idx
  ON document_revisions (workspace_id, page_id, revision DESC);

COMMIT;
