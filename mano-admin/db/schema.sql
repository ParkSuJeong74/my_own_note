CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ai_automation_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS workspace_type text NOT NULL DEFAULT 'GENERAL';
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_workspace_type_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_workspace_type_check CHECK (workspace_type IN ('APPLICATION','INFRASTRUCTURE','CONTENT','GENERAL'));

CREATE TABLE IF NOT EXISTS automation_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner text NOT NULL,
  repo text NOT NULL,
  git_url text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, owner, repo)
);

CREATE TABLE IF NOT EXISTS automation_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('GLOBAL','WORKSPACE','REPOSITORY')),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  repository_id uuid REFERENCES automation_repositories(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope='GLOBAL' AND workspace_id IS NULL AND repository_id IS NULL) OR (scope='WORKSPACE' AND workspace_id IS NOT NULL AND repository_id IS NULL) OR (scope='REPOSITORY' AND workspace_id IS NOT NULL AND repository_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY', 'IN_PROGRESS', 'REVIEW', 'DONE')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'GENERAL';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS input_notes text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_text text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reference_items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at timestamptz;
UPDATE tasks t SET task_type = CASE
  WHEN w.slug = 'blog' THEN 'BLOG'
  WHEN w.slug IN ('project-a', 'project-t') THEN 'PROJECT'
  ELSE 'GENERAL'
END
FROM workspaces w WHERE w.id = t.workspace_id;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check CHECK (task_type IN ('GENERAL', 'BLOG', 'PROJECT'));
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
UPDATE tasks SET status = CASE status
  WHEN 'todo' THEN 'DRAFT'
  WHEN 'in_progress' THEN 'IN_PROGRESS'
  WHEN 'waiting_approval' THEN 'REVIEW'
  WHEN 'completed' THEN 'DONE'
  WHEN 'failed' THEN 'REVIEW'
  ELSE status
END;
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('DRAFT', 'READY', 'IN_PROGRESS', 'REVIEW', 'DONE'));

CREATE TABLE IF NOT EXISTS task_repositories (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES automation_repositories(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, repository_id)
);

CREATE TABLE IF NOT EXISTS automation_workers (
  id text PRIMARY KEY, name text NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT '', capabilities jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES automation_repositories(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','CLAIMED','RUNNING','REVIEW','REVISION_REQUESTED','SUCCEEDED','FAILED','CANCELLED')),
  worker_id text REFERENCES automation_workers(id) ON DELETE SET NULL, branch_name text NOT NULL DEFAULT '',
  instruction_snapshot text NOT NULL DEFAULT '', codex_thread_id text, summary text NOT NULL DEFAULT '',
  test_result text NOT NULL DEFAULT '', error_text text NOT NULL DEFAULT '', log_text text NOT NULL DEFAULT '',
  lease_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz,
  started_at timestamptz, finished_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_repository_locks (
  repository_id uuid PRIMARY KEY REFERENCES automation_repositories(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL UNIQUE REFERENCES automation_executions(id) ON DELETE CASCADE,
  lease_expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_pull_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), execution_id uuid NOT NULL UNIQUE REFERENCES automation_executions(id) ON DELETE CASCADE,
  number integer, url text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','MERGED','CLOSED')),
  title text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), merged_at timestamptz
);

CREATE TABLE IF NOT EXISTS automation_revision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), execution_id uuid NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
  note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS automation_events (
  id bigserial PRIMARY KEY, event_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_status text NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN ('PENDING','DELIVERED')),
  attempts integer NOT NULL DEFAULT 0, last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz
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

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  title text NOT NULL, body text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  title text NOT NULL, description text NOT NULL DEFAULT '', starts_at timestamptz NOT NULL, ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'NONE';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#2563eb';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_recurrence_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_recurrence_check CHECK (recurrence IN ('NONE', 'YEARLY'));

CREATE TABLE IF NOT EXISTS workspace_postits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '', content text NOT NULL DEFAULT '', color text NOT NULL DEFAULT 'yellow',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (color IN ('yellow', 'blue', 'pink', 'purple', 'green'))
);

CREATE TABLE IF NOT EXISTS workspace_todo_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES workspace_todo_categories(id) ON DELETE CASCADE,
  title text NOT NULL, description text NOT NULL DEFAULT '', completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  completed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_todo_completions (
  todo_id uuid NOT NULL REFERENCES daily_todos(id) ON DELETE CASCADE,
  completed_on date NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_id, completed_on)
);

CREATE TABLE IF NOT EXISTS monthly_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_todo_completions (
  todo_id uuid NOT NULL REFERENCES monthly_todos(id) ON DELETE CASCADE,
  completed_month date NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_id, completed_month),
  CHECK (date_part('day', completed_month) = 1)
);

CREATE TABLE IF NOT EXISTS yearly_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yearly_todo_completions (
  todo_id uuid NOT NULL REFERENCES yearly_todos(id) ON DELETE CASCADE,
  completed_year integer NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_id, completed_year)
);

CREATE TABLE IF NOT EXISTS money_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('CASH','BANK','INVESTMENT','DEBT')),
  balance numeric(18,2) NOT NULL DEFAULT 0, note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS bank_name text NOT NULL DEFAULT '';
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS monthly_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS interest_rate numeric(7,4) NOT NULL DEFAULT 0;
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS maturity_date date;
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS monthly_active boolean NOT NULL DEFAULT true;
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS is_mine boolean NOT NULL DEFAULT true;
ALTER TABLE money_accounts ADD COLUMN IF NOT EXISTS is_withdrawable boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS money_fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0, payment_day integer,
  note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31)
);
ALTER TABLE money_fixed_expenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS money_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  issuer text NOT NULL DEFAULT '', performance_target numeric(18,2) NOT NULL DEFAULT 0,
  performance_amount numeric(18,2) NOT NULL DEFAULT 0, bill_amount numeric(18,2) NOT NULL DEFAULT 0,
  payment_day integer, note text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31)
);

ALTER TABLE workspace_postits ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES workspace_todo_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS approvals_task_id_idx ON approvals(task_id);
CREATE INDEX IF NOT EXISTS automation_runs_task_id_idx ON automation_runs(task_id);
CREATE INDEX IF NOT EXISTS artifacts_task_id_idx ON artifacts(task_id);
CREATE INDEX IF NOT EXISTS notes_workspace_id_idx ON notes(workspace_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS calendar_events_starts_at_idx ON calendar_events(starts_at);
CREATE INDEX IF NOT EXISTS workspace_postits_workspace_id_idx ON workspace_postits(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_postits_category_id_idx ON workspace_postits(category_id);
CREATE INDEX IF NOT EXISTS workspace_todo_categories_workspace_id_idx ON workspace_todo_categories(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_todos_category_id_idx ON workspace_todos(category_id);
CREATE INDEX IF NOT EXISTS global_todos_updated_at_idx ON global_todos(updated_at DESC);
CREATE INDEX IF NOT EXISTS daily_todo_completions_date_idx ON daily_todo_completions(completed_on DESC);
CREATE INDEX IF NOT EXISTS monthly_todo_completions_month_idx ON monthly_todo_completions(completed_month DESC);
CREATE INDEX IF NOT EXISTS yearly_todo_completions_year_idx ON yearly_todo_completions(completed_year DESC);
CREATE INDEX IF NOT EXISTS money_accounts_updated_at_idx ON money_accounts(updated_at DESC);
CREATE INDEX IF NOT EXISTS money_fixed_expenses_updated_at_idx ON money_fixed_expenses(updated_at DESC);
CREATE INDEX IF NOT EXISTS money_cards_updated_at_idx ON money_cards(updated_at DESC);
CREATE INDEX IF NOT EXISTS automation_repositories_workspace_id_idx ON automation_repositories(workspace_id);
CREATE INDEX IF NOT EXISTS automation_instructions_workspace_id_idx ON automation_instructions(workspace_id);
CREATE INDEX IF NOT EXISTS task_repositories_repository_id_idx ON task_repositories(repository_id);
CREATE INDEX IF NOT EXISTS automation_executions_task_id_idx ON automation_executions(task_id);
CREATE INDEX IF NOT EXISTS automation_executions_queue_idx ON automation_executions(status,created_at);
CREATE INDEX IF NOT EXISTS automation_events_pending_idx ON automation_events(delivery_status,created_at);

INSERT INTO workspaces (id, slug, name, description, links) VALUES
  ('10000000-0000-4000-8000-000000000001', 'project-a', 'Project A', 'Project A delivery and automation workspace', '[{"label":"API Docs","url":"https://api.world-alcove.com/api/docs"},{"label":"Admin","url":"https://api.world-alcove.com/admin"},{"label":"Frontend","url":"https://world-alcove.com/"},{"label":"Notion","url":"https://app.notion.com/p/Alcove-26ad775dd79d828f9998812dee6c5a3f?source=copy_link"},{"label":"GitHub","url":"https://github.com/Alcove-World-Official/alcove_be"}]'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'project-t', 'Project T', 'Project T delivery and automation workspace', '[{"label":"API Docs","url":"https://tono-api.mano.io.kr/api/swagger-ui/index.html"},{"label":"Admin","url":"https://tono-api.mano.io.kr/admin"},{"label":"Notion","url":"https://app.notion.com/p/7bae9463df6182aa84be01a2a6575b25?source=copy_link"},{"label":"GitHub","url":"https://github.com/TonoLab/tono-be"}]'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'blog', 'Blog', 'Content planning and publishing workspace', '[{"label":"Naver Blog","url":"https://blog.naver.com/mano_s2"}]'::jsonb),
  ('10000000-0000-4000-8000-000000000004', 'youtube', 'YouTube', 'Video production automation workspace', '[]'::jsonb),
  ('10000000-0000-4000-8000-000000000005', 'freelancer', 'Freelancer', 'Client work and freelance delivery workspace', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, slug, name, description, links, ai_automation_enabled, workspace_type) VALUES
  ('10000000-0000-4000-8000-000000000006', 'my-own-note', 'Mano', 'Mano Admin and home-server operations', '[]'::jsonb, true, 'INFRASTRUCTURE')
ON CONFLICT (id) DO UPDATE SET name='Mano',links='[]'::jsonb,ai_automation_enabled=true,workspace_type='INFRASTRUCTURE';

UPDATE workspaces SET ai_automation_enabled=true,workspace_type='APPLICATION' WHERE slug IN ('project-a','project-t');
UPDATE workspaces SET workspace_type='CONTENT' WHERE slug IN ('blog','youtube');

INSERT INTO tasks (id, workspace_id, title, description, status, priority, task_type) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Review weekly article draft', 'Review the generated draft before publishing.', 'REVIEW', 'high', 'BLOG'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Prepare project status brief', 'Collect the current project status into a concise brief.', 'IN_PROGRESS', 'normal', 'PROJECT'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'Draft video outline', 'Create an initial outline for the next video.', 'DONE', 'normal', 'GENERAL')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, task_type = EXCLUDED.task_type;

INSERT INTO approvals (id, task_id, status, note) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'pending', 'Confirm tone and facts before publishing.'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'pending', 'Approve the project brief before distribution.')
ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note;

INSERT INTO automation_runs (id, task_id, status, workflow_ref, summary, finished_at) VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'succeeded', 'mock/youtube-outline', 'Mock outline generated successfully.', now())
ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary;

INSERT INTO artifacts (id, task_id, run_id, name, path, kind) VALUES
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'video-outline.md', '/files/youtube/video-outline.md', 'markdown'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', NULL, 'weekly-draft.md', '/files/blog/weekly-draft.md', 'markdown')
ON CONFLICT (id) DO NOTHING;
