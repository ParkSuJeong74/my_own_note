import { isUuid, type ApiErrorCode, type ApiErrorEnvelope } from "@mano/contracts";

import { AccessAuthenticationError, type AccessAuthenticator } from "./auth";
import { WorkspaceNotFoundError, type IdentityRepository, type WorkspaceRepository } from "./types";

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
    if (url.pathname !== "/v1/me" && !treeMatch) {
      return failure(404, "NOT_FOUND", "Route was not found.", requestId, false);
    }
    if (request.method !== "GET") return failure(405, "METHOD_NOT_ALLOWED", "Method is not allowed.", requestId, false);

    try {
      const identity = await dependencies.authenticate(request);
      const me = await dependencies.identities.bootstrap(identity);
      const workspaceId = treeMatch?.[1];
      if (workspaceId !== undefined && !isUuid(workspaceId)) {
        return failure(400, "INVALID_REQUEST", "Workspace ID must be a UUID.", requestId, false);
      }
      const response = workspaceId === undefined
        ? me
        : await dependencies.workspaces.getTree(me.principal.id, workspaceId);
      return Response.json(response, { headers: { "cache-control": "no-store", "x-request-id": requestId } });
    } catch (error) {
      if (error instanceof AccessAuthenticationError) {
        return failure(401, "UNAUTHENTICATED", "Authentication is required.", requestId, false);
      }
      if (error instanceof WorkspaceNotFoundError) {
        return failure(404, "NOT_FOUND", "Workspace was not found.", requestId, false);
      }
      return failure(503, "STORAGE_UNAVAILABLE", "The service is temporarily unavailable.", requestId, true);
    }
  };
}

function failure(status: number, code: ApiErrorCode, message: string, requestId: string, retryable: boolean): Response {
  const body: ApiErrorEnvelope = { error: { code, message, requestId, retryable, details: {} } };
  return Response.json(body, { status, headers: { "cache-control": "no-store", "x-request-id": requestId } });
}
