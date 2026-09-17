import {
  ContractValidationError,
  isUuid,
  parseCreateNodeRequest,
  type ApiErrorCode,
  type ApiErrorEnvelope,
} from "@mano/contracts";

import { AccessAuthenticationError, type AccessAuthenticator } from "./auth";
import {
  InvalidNodeParentError,
  NodeIdConflictError,
  OperationReplayMismatchError,
  WorkspaceNotFoundError,
  WorkspaceWriteForbiddenError,
  type IdentityRepository,
  type WorkspaceRepository,
} from "./types";

export interface ApiDependencies {
  readonly authenticate: AccessAuthenticator;
  readonly identities: IdentityRepository;
  readonly workspaces: WorkspaceRepository;
  readonly createRequestId?: () => string;
}

export function createApiHandler(dependencies: ApiDependencies): (request: Request) => Promise<Response> {
  const createRequestId = dependencies.createRequestId ?? (() => crypto.randomUUID());
  return async (request) => {
    const requestId = createRequestId();
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      if (request.method !== "GET") return failure(405, "METHOD_NOT_ALLOWED", "Method is not allowed.", requestId, false);
      return Response.json({ ok: true }, { headers: { "x-request-id": requestId } });
    }
    const treeMatch = /^\/v1\/workspaces\/([^/]+)\/tree$/.exec(url.pathname);
    const nodesMatch = /^\/v1\/workspaces\/([^/]+)\/nodes$/.exec(url.pathname);
    if (url.pathname !== "/v1/me" && !treeMatch && !nodesMatch) {
      return failure(404, "NOT_FOUND", "Route was not found.", requestId, false);
    }
    const expectedMethod = nodesMatch ? "POST" : "GET";
    if (request.method !== expectedMethod) {
      return failure(405, "METHOD_NOT_ALLOWED", "Method is not allowed.", requestId, false);
    }

    try {
      const identity = await dependencies.authenticate(request);
      const me = await dependencies.identities.bootstrap(identity);
      const workspaceId = treeMatch?.[1] ?? nodesMatch?.[1];
      if (workspaceId !== undefined && !isUuid(workspaceId)) {
        return failure(400, "INVALID_REQUEST", "Workspace ID must be a UUID.", requestId, false);
      }
      if (workspaceId === undefined) return json(me, 200, requestId);
      if (nodesMatch) {
        let body: unknown;
        try { body = await request.json(); } catch { return failure(400, "INVALID_REQUEST", "Request body must be valid JSON.", requestId, false); }
        const input = parseCreateNodeRequest(body);
        return json(await dependencies.workspaces.createNode(me.principal.id, workspaceId, input), 201, requestId);
      }
      return json(await dependencies.workspaces.getTree(me.principal.id, workspaceId), 200, requestId);
    } catch (error) {
      if (error instanceof AccessAuthenticationError) {
        return failure(401, "UNAUTHENTICATED", "Authentication is required.", requestId, false);
      }
      if (error instanceof WorkspaceNotFoundError) {
        return failure(404, "NOT_FOUND", "Workspace was not found.", requestId, false);
      }
      if (error instanceof WorkspaceWriteForbiddenError) {
        return failure(403, "FORBIDDEN", "Workspace is read-only.", requestId, false);
      }
      if (error instanceof InvalidNodeParentError || error instanceof NodeIdConflictError || error instanceof ContractValidationError) {
        return failure(400, "INVALID_REQUEST", "Node request is invalid.", requestId, false);
      }
      if (error instanceof OperationReplayMismatchError) {
        return failure(409, "OPERATION_REPLAY_MISMATCH", "Operation ID was already used.", requestId, false);
      }
      return failure(503, "STORAGE_UNAVAILABLE", "The service is temporarily unavailable.", requestId, true);
    }
  };
}

function json(value: unknown, status: number, requestId: string): Response {
  return Response.json(value, { status, headers: { "cache-control": "no-store", "x-request-id": requestId } });
}

function failure(status: number, code: ApiErrorCode, message: string, requestId: string, retryable: boolean): Response {
  const body: ApiErrorEnvelope = { error: { code, message, requestId, retryable, details: {} } };
  return Response.json(body, { status, headers: { "cache-control": "no-store", "x-request-id": requestId } });
}
