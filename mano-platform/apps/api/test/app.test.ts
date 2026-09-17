import { describe, expect, it, vi } from "vitest";

import { createApiHandler } from "../src/app";
import { AccessAuthenticationError } from "../src/auth";
import {
  OperationReplayMismatchError,
  WorkspaceNotFoundError,
  WorkspaceWriteForbiddenError,
  type AccessIdentity,
  type IdentityRepository,
  type WorkspaceRepository,
} from "../src/types";

const identity: AccessIdentity = {
  issuer: "https://mano.cloudflareaccess.com",
  subject: "access-user-1",
  email: "pilot@example.com",
};
const workspaceId = "56e146d2-99a3-4afe-a5ae-dab330032046";
const me = {
  principal: { id: "principal-1", email: identity.email, displayName: null },
  workspaces: [{ id: workspaceId, name: "내 워크스페이스", kind: "PERSONAL" as const, role: "OWNER" as const }],
};

function handler(options: {
  authError?: boolean; storageError?: boolean; workspaceMissing?: boolean;
  writeForbidden?: boolean; replayMismatch?: boolean;
} = {}) {
  const bootstrap = vi.fn<IdentityRepository["bootstrap"]>().mockImplementation(async () => {
    if (options.storageError) throw new Error("database password must not leak");
    return me;
  });
  const getTree = vi.fn<WorkspaceRepository["getTree"]>().mockImplementation(async () => {
    if (options.workspaceMissing) throw new WorkspaceNotFoundError();
    return { workspaceId, workspaceRevision: 3, nodes: [] };
  });
  const createNode = vi.fn<WorkspaceRepository["createNode"]>().mockImplementation(async (_principalId, id, input) => {
    if (options.writeForbidden) throw new WorkspaceWriteForbiddenError();
    if (options.replayMismatch) throw new OperationReplayMismatchError();
    return {
      id: input.id, workspaceId: id, parentId: input.parentId, kind: input.kind, title: input.title,
      position: input.position, revision: 1, archivedAt: null, trashedAt: null,
      createdAt: "2026-09-17T00:00:00.000Z", updatedAt: "2026-09-17T00:00:00.000Z",
    };
  });
  return {
    bootstrap,
    getTree,
    createNode,
    fetch: createApiHandler({
      authenticate: async () => {
        if (options.authError) throw new AccessAuthenticationError();
        return identity;
      },
      identities: { bootstrap },
      workspaces: { getTree, createNode },
      createRequestId: () => "request-1",
    }),
  };
}

describe("API handler", () => {
  it("serves health without authentication or storage", async () => {
    const api = handler({ authError: true });
    const response = await api.fetch(new Request("https://api.example/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(api.bootstrap).not.toHaveBeenCalled();
  });

  it("returns the authenticated bootstrap response without caching", async () => {
    const api = handler();
    const response = await api.fetch(new Request("https://api.example/v1/me"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(me);
    expect(api.bootstrap).toHaveBeenCalledWith(identity);
  });

  it("rejects unauthenticated requests before repository access", async () => {
    const api = handler({ authError: true });
    const response = await api.fetch(new Request("https://api.example/v1/me"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED", requestId: "request-1" } });
    expect(api.bootstrap).not.toHaveBeenCalled();
  });

  it("returns a tree only through the authenticated principal membership", async () => {
    const api = handler();
    const response = await api.fetch(new Request(`https://api.example/v1/workspaces/${workspaceId}/tree`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ workspaceId, workspaceRevision: 3, nodes: [] });
    expect(api.getTree).toHaveBeenCalledWith("principal-1", workspaceId);
  });

  it("rejects malformed and inaccessible workspace identifiers safely", async () => {
    const malformed = handler();
    const invalid = await malformed.fetch(new Request("https://api.example/v1/workspaces/not-a-uuid/tree"));
    expect(invalid.status).toBe(400);
    expect(malformed.getTree).not.toHaveBeenCalled();

    const inaccessible = handler({ workspaceMissing: true });
    const missing = await inaccessible.fetch(new Request(`https://api.example/v1/workspaces/${workspaceId}/tree`));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("validates and creates a page through the authenticated principal", async () => {
    const api = handler();
    const input = {
      operationId: "b8df8229-3e09-4525-bb62-1743dc093f91",
      id: "12e946ae-8ca1-4484-964d-f874e4c2eb5c",
      kind: "PAGE", title: " 제목 없음 ", parentId: null, position: 0,
    };
    const response = await api.fetch(new Request(`https://api.example/v1/workspaces/${workspaceId}/nodes`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
    }));
    expect(response.status).toBe(201);
    expect(api.createNode).toHaveBeenCalledWith("principal-1", workspaceId, { ...input, title: "제목 없음" });
  });

  it("rejects malformed JSON and invalid node contracts before writing", async () => {
    const api = handler();
    const malformed = await api.fetch(new Request(`https://api.example/v1/workspaces/${workspaceId}/nodes`, {
      method: "POST", body: "{",
    }));
    expect(malformed.status).toBe(400);
    const invalid = await api.fetch(new Request(`https://api.example/v1/workspaces/${workspaceId}/nodes`, {
      method: "POST", body: JSON.stringify({ title: "" }),
    }));
    expect(invalid.status).toBe(400);
    expect(api.createNode).not.toHaveBeenCalled();
  });

  it("maps write authorization and operation replay failures", async () => {
    const input = {
      operationId: "b8df8229-3e09-4525-bb62-1743dc093f91", id: "12e946ae-8ca1-4484-964d-f874e4c2eb5c",
      kind: "FOLDER", title: "폴더", parentId: null, position: 0,
    };
    const call = (api: ReturnType<typeof handler>) => api.fetch(new Request(`https://api.example/v1/workspaces/${workspaceId}/nodes`, {
      method: "POST", body: JSON.stringify(input),
    }));
    expect((await call(handler({ writeForbidden: true }))).status).toBe(403);
    const replay = await call(handler({ replayMismatch: true }));
    expect(replay.status).toBe(409);
    expect(await replay.json()).toMatchObject({ error: { code: "OPERATION_REPLAY_MISMATCH" } });
  });

  it("uses safe route, method and storage errors", async () => {
    const api = handler({ storageError: true });
    const storage = await api.fetch(new Request("https://api.example/v1/me"));
    expect(storage.status).toBe(503);
    expect(JSON.stringify(await storage.json())).not.toContain("password");
    expect((await api.fetch(new Request("https://api.example/v1/me", { method: "POST" }))).status).toBe(405);
    expect((await api.fetch(new Request("https://api.example/missing"))).status).toBe(404);
  });
});
