CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting_approval', 'completed', 'failed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note text NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  workflow_ref text,
  summary text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  run_id uuid REFERENCES automation_runs(id) ON DELETE SET NULL,
  name text NOT NULL,
  path text NOT NULL,
  kind text NOT NULL DEFAULT 'file',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS approvals_task_id_idx ON approvals(task_id);
CREATE INDEX IF NOT EXISTS automation_runs_task_id_idx ON automation_runs(task_id);
CREATE INDEX IF NOT EXISTS artifacts_task_id_idx ON artifacts(task_id);

INSERT INTO workspaces (id, slug, name, description) VALUES
  ('10000000-0000-4000-8000-000000000001', 'project-a', 'Project A', 'Project A delivery and automation workspace'),
  ('10000000-0000-4000-8000-000000000002', 'project-t', 'Project T', 'Project T delivery and automation workspace'),
  ('10000000-0000-4000-8000-000000000003', 'blog', 'Blog', 'Content planning and publishing workspace'),
  ('10000000-0000-4000-8000-000000000004', 'youtube', 'YouTube', 'Video production automation workspace')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO tasks (id, workspace_id, title, description, status, priority) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Review weekly article draft', 'Review the generated draft before publishing.', 'waiting_approval', 'high'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Prepare project status brief', 'Collect the current project status into a concise brief.', 'in_progress', 'normal'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'Draft video outline', 'Create an initial outline for the next video.', 'completed', 'normal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO approvals (id, task_id, status, note) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'pending', 'Confirm tone and facts before publishing.'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'pending', 'Approve the project brief before distribution.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO automation_runs (id, task_id, status, workflow_ref, summary, finished_at) VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'succeeded', 'mock/youtube-outline', 'Mock outline generated successfully.', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO artifacts (id, task_id, run_id, name, path, kind) VALUES
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'video-outline.md', '/files/youtube/video-outline.md', 'markdown'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', NULL, 'weekly-draft.md', '/files/blog/weekly-draft.md', 'markdown')
ON CONFLICT (id) DO NOTHING;
