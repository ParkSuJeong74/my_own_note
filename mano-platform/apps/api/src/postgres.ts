import { Client, type QueryResult, type QueryResultRow } from "pg";
import type { ApiNode, CreateNodeRequest } from "@mano/contracts";

import {
  InvalidNodeParentError,
  NodeIdConflictError,
  OperationReplayMismatchError,
  WorkspaceNotFoundError,
  WorkspaceWriteForbiddenError,
  type AccessIdentity,
  type IdentityRepository,
  type MeResponse,
  type NodeView,
  type WorkspaceRepository,
  type WorkspaceView,
} from "./types";

interface SqlClient {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<R>>;
  end(): Promise<void>;
}

type ClientFactory = () => Promise<SqlClient>;

interface PrincipalRow extends QueryResultRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface WorkspaceRow extends QueryResultRow {
  id: string;
  name: string;
  kind: "PERSONAL" | "SHARED";
  role: "OWNER" | "EDITOR" | "VIEWER";
}

interface AuthorizedWorkspaceRow extends QueryResultRow {
  id: string;
  revision: string;
  role?: "OWNER" | "EDITOR" | "VIEWER";
}

interface NodeRow extends QueryResultRow {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  kind: "FOLDER" | "PAGE";
  title: string;
  position: string;
  revision: string;
  archived_at: Date | string | null;
  trashed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_operation_id?: string | null;
}

const EMPTY_BLOCK_DOCUMENT = { schemaVersion: 1, blocks: [] } as const;
const EMPTY_BLOCK_DOCUMENT_HASH = "d029a0087e075a213fe766437450d45d4c54f09873f9fafb9ac9c2088ecd0aa5";

export function createPostgresIdentityRepository(connectionString: string): IdentityRepository {
  return createIdentityRepository(postgresClientFactory(connectionString));
}

export function createPostgresWorkspaceRepository(connectionString: string): WorkspaceRepository {
  return createWorkspaceRepository(postgresClientFactory(connectionString));
}

function postgresClientFactory(connectionString: string): ClientFactory {
  if (connectionString.length === 0) throw new Error("PostgreSQL connection string is required");
  return async () => {
    const client = new Client({ connectionString });
    await client.connect();
    return client;
  };
}

export function createIdentityRepository(createClient: ClientFactory): IdentityRepository {
  return {
    async bootstrap(identity: AccessIdentity): Promise<MeResponse> {
      const client = await createClient();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [identity.issuer, identity.subject]);
        const principalResult = await client.query<PrincipalRow>(
          `INSERT INTO identity_principals (id, issuer, subject, email)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (issuer, subject) DO UPDATE
           SET email = EXCLUDED.email, updated_at = now()
           RETURNING id, email::text, display_name`,
          [crypto.randomUUID(), identity.issuer, identity.subject, identity.email],
        );
        const principal = principalResult.rows[0];
        if (!principal) throw new Error("Principal upsert returned no row");

        let memberships = await loadMemberships(client, principal.id);
        if (memberships.length === 0) {
          const workspaceId = crypto.randomUUID();
          await client.query(
            "INSERT INTO workspaces (id, name, kind) VALUES ($1, $2, 'PERSONAL')",
            [workspaceId, "내 워크스페이스"],
          );
          await client.query(
            "INSERT INTO workspace_members (workspace_id, principal_id, role) VALUES ($1, $2, 'OWNER')",
            [workspaceId, principal.id],
          );
          memberships = await loadMemberships(client, principal.id);
        }
        await client.query("COMMIT");
        return {
          principal: { id: principal.id, email: principal.email, displayName: principal.display_name },
          workspaces: memberships,
        };
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* preserve the original failure */ }
        throw error;
      } finally {
        await client.end();
      }
    },
  };
}

export function createWorkspaceRepository(createClient: ClientFactory): WorkspaceRepository {
  return {
    async getTree(principalId: string, workspaceId: string) {
      const client = await createClient();
      try {
        const workspaceResult = await client.query<AuthorizedWorkspaceRow>(
          `SELECT w.id, w.revision::text
           FROM workspaces w
           JOIN workspace_members m ON m.workspace_id = w.id
           WHERE w.id = $1 AND m.principal_id = $2 AND w.archived_at IS NULL`,
          [workspaceId, principalId],
        );
        const workspace = workspaceResult.rows[0];
        if (!workspace) throw new WorkspaceNotFoundError();
        const nodeResult = await client.query<NodeRow>(
          `SELECT id, workspace_id, parent_id, kind, title, position::text, revision::text,
                  archived_at, trashed_at, created_at, updated_at
           FROM nodes
           WHERE workspace_id = $1
           ORDER BY parent_id NULLS FIRST, position, id`,
          [workspaceId],
        );
        return {
          workspaceId: workspace.id,
          workspaceRevision: safeInteger(workspace.revision, "workspace revision"),
          nodes: nodeResult.rows.map(mapNode),
        };
      } finally {
        await client.end();
      }
    },
    async createNode(principalId: string, workspaceId: string, request: CreateNodeRequest): Promise<ApiNode> {
      const client = await createClient();
      try {
        await client.query("BEGIN");
        const accessResult = await client.query<AuthorizedWorkspaceRow>(
          `SELECT w.id, w.revision::text, m.role
           FROM workspaces w
           JOIN workspace_members m ON m.workspace_id = w.id
           WHERE w.id = $1 AND m.principal_id = $2 AND w.archived_at IS NULL
           FOR UPDATE OF w`,
          [workspaceId, principalId],
        );
        const access = accessResult.rows[0];
        if (!access) throw new WorkspaceNotFoundError();
        if (access.role === "VIEWER") throw new WorkspaceWriteForbiddenError();

        const replayResult = await client.query<NodeRow>(
          `${nodeSelect()} WHERE workspace_id = $1 AND created_operation_id = $2`,
          [workspaceId, request.operationId],
        );
        const replay = replayResult.rows[0];
        if (replay) {
          if (!sameCreation(replay, request)) throw new OperationReplayMismatchError();
          await client.query("COMMIT");
          return mapNode(replay);
        }

        const collision = await client.query("SELECT 1 FROM nodes WHERE id = $1", [request.id]);
        if (collision.rows.length > 0) throw new NodeIdConflictError();
        if (request.parentId !== null) {
          const parent = await client.query(
            `SELECT 1 FROM nodes
             WHERE id = $1 AND workspace_id = $2 AND kind = 'FOLDER'
               AND archived_at IS NULL AND trashed_at IS NULL`,
            [request.parentId, workspaceId],
          );
          if (parent.rows.length === 0) throw new InvalidNodeParentError();
        }

        const inserted = await client.query<NodeRow>(
          `INSERT INTO nodes (id, workspace_id, parent_id, kind, title, position, created_operation_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, workspace_id, parent_id, kind, title, position::text, revision::text,
                     archived_at, trashed_at, created_at, updated_at, created_operation_id`,
          [request.id, workspaceId, request.parentId, request.kind, request.title, request.position, request.operationId],
        );
        const node = inserted.rows[0];
        if (!node) throw new Error("Node insert returned no row");
        if (request.kind === "PAGE") {
          await client.query(
            `INSERT INTO documents (page_id, workspace_id, content, revision, content_hash)
             VALUES ($1, $2, $3::jsonb, 1, decode($4, 'hex'))`,
            [request.id, workspaceId, JSON.stringify(EMPTY_BLOCK_DOCUMENT), EMPTY_BLOCK_DOCUMENT_HASH],
          );
          await client.query(
            `INSERT INTO document_revisions
               (page_id, workspace_id, revision, content, content_hash, created_by, operation_id, reason)
             VALUES ($1, $2, 1, $3::jsonb, decode($4, 'hex'), $5, $6, 'CREATE')`,
            [request.id, workspaceId, JSON.stringify(EMPTY_BLOCK_DOCUMENT), EMPTY_BLOCK_DOCUMENT_HASH, principalId, request.operationId],
          );
        }
        await client.query("UPDATE workspaces SET revision = revision + 1, updated_at = now() WHERE id = $1", [workspaceId]);
        await client.query("COMMIT");
        return mapNode(node);
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* preserve the original failure */ }
        throw error;
      } finally {
        await client.end();
      }
    },
  };
}

async function loadMemberships(client: SqlClient, principalId: string): Promise<WorkspaceView[]> {
  const result = await client.query<WorkspaceRow>(
    `SELECT w.id, w.name, w.kind, m.role
     FROM workspace_members m
     JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.principal_id = $1 AND w.archived_at IS NULL
     ORDER BY w.created_at, w.id`,
    [principalId],
  );
  return result.rows;
}

function mapNode(row: NodeRow): NodeView {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentId: row.parent_id,
    kind: row.kind,
    title: row.title,
    position: safeInteger(row.position, "node position"),
    revision: safeInteger(row.revision, "node revision"),
    archivedAt: isoTimestamp(row.archived_at),
    trashedAt: isoTimestamp(row.trashed_at),
    createdAt: isoTimestamp(row.created_at) ?? "",
    updatedAt: isoTimestamp(row.updated_at) ?? "",
  };
}

function safeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} is outside the API integer range`);
  return parsed;
}

function isoTimestamp(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Database returned an invalid timestamp");
  return date.toISOString();
}

function nodeSelect(): string {
  return `SELECT id, workspace_id, parent_id, kind, title, position::text, revision::text,
                 archived_at, trashed_at, created_at, updated_at, created_operation_id
          FROM nodes`;
}

function sameCreation(row: NodeRow, request: CreateNodeRequest): boolean {
  return row.id === request.id && row.parent_id === request.parentId && row.kind === request.kind &&
    row.title === request.title && safeInteger(row.position, "node position") === request.position;
}
