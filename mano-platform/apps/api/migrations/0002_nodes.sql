BEGIN;

ALTER TABLE workspaces
  ADD COLUMN revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1);

CREATE TABLE nodes (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id uuid,
  kind text NOT NULL CHECK (kind IN ('FOLDER', 'PAGE')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 500),
  position bigint NOT NULL CHECK (position >= 0),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  archived_at timestamptz,
  trashed_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  CHECK (parent_id IS NULL OR parent_id <> id),
  FOREIGN KEY (parent_id, workspace_id)
    REFERENCES nodes(id, workspace_id)
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX nodes_workspace_tree_idx
  ON nodes (workspace_id, parent_id, position, id);

CREATE INDEX nodes_workspace_trash_idx
  ON nodes (workspace_id, trashed_at)
  WHERE trashed_at IS NOT NULL;

COMMIT;
