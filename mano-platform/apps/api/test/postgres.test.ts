import { describe, expect, it } from "vitest";

import { createIdentityRepository, createWorkspaceRepository } from "../src/postgres";
import { WorkspaceNotFoundError } from "../src/types";

const identity = {
  issuer: "https://mano.cloudflareaccess.com",
  subject: "access-user-1",
  email: "pilot@example.com",
};

function fakeClient(existingWorkspace: boolean, failMembership = false) {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  let membershipReads = 0;
  const client = {
    async query(text: string, values?: readonly unknown[]) {
      calls.push(values ? { text, values } : { text });
      if (text.includes("RETURNING id")) {
        return { rows: [{ id: "principal-1", email: identity.email, display_name: null }] };
      }
      if (text.includes("FROM workspace_members")) {
        membershipReads += 1;
        if (failMembership) throw new Error("membership read failed");
        if (existingWorkspace || membershipReads > 1) {
          return { rows: [{ id: "workspace-1", name: "내 워크스페이스", kind: "PERSONAL", role: "OWNER" }] };
        }
      }
      return { rows: [] };
    },
    async end() { calls.push({ text: "END_CONNECTION" }); },
  };
  return { calls, client };
}

describe("PostgreSQL identity repository", () => {
  it("returns existing memberships without creating another workspace", async () => {
    const fake = fakeClient(true);
    const repository = createIdentityRepository(async () => fake.client as never);
    await expect(repository.bootstrap(identity)).resolves.toMatchObject({
      principal: { id: "principal-1", email: identity.email },
      workspaces: [{ id: "workspace-1", role: "OWNER" }],
    });
    expect(fake.calls.map((call) => call.text)).toEqual(expect.arrayContaining(["BEGIN", "COMMIT", "END_CONNECTION"]));
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO workspaces"))).toBe(false);
  });

  it("creates one personal workspace when the principal has no membership", async () => {
    const fake = fakeClient(false);
    const repository = createIdentityRepository(async () => fake.client as never);
    const result = await repository.bootstrap(identity);
    expect(result.workspaces).toHaveLength(1);
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO workspaces"))).toBe(true);
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO workspace_members"))).toBe(true);
    const upsert = fake.calls.find((call) => call.text.includes("identity_principals"));
    expect(upsert?.values?.slice(1)).toEqual([identity.issuer, identity.subject, identity.email]);
  });

  it("rolls back and closes the connection when bootstrap fails", async () => {
    const fake = fakeClient(false, true);
    const repository = createIdentityRepository(async () => fake.client as never);
    await expect(repository.bootstrap(identity)).rejects.toThrow("membership read failed");
    expect(fake.calls.map((call) => call.text)).toEqual(expect.arrayContaining(["ROLLBACK", "END_CONNECTION"]));
    expect(fake.calls.some((call) => call.text === "COMMIT")).toBe(false);
  });
});

describe("PostgreSQL workspace repository", () => {
  function treeClient(authorized: boolean) {
    const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
    return {
      calls,
      client: {
        async query(text: string, values?: readonly unknown[]) {
          calls.push(values ? { text, values } : { text });
          if (text.includes("JOIN workspace_members")) {
            return { rows: authorized ? [{ id: "56e146d2-99a3-4afe-a5ae-dab330032046", revision: "4" }] : [] };
          }
          if (text.includes("FROM nodes")) {
            return { rows: [{
              id: "38683e06-ac8b-4f60-b40b-d0bec8d58f18",
              workspace_id: "56e146d2-99a3-4afe-a5ae-dab330032046",
              parent_id: null,
              kind: "PAGE",
              title: "제목 없음",
              position: "1024",
              revision: "1",
              archived_at: null,
              trashed_at: null,
              created_at: "2026-09-17T00:00:00.000Z",
              updated_at: new Date("2026-09-17T01:00:00.000Z"),
            }] };
          }
          return { rows: [] };
        },
        async end() { calls.push({ text: "END_CONNECTION" }); },
      },
    };
  }

  it("loads nodes only after a principal-scoped membership query", async () => {
    const fake = treeClient(true);
    const repository = createWorkspaceRepository(async () => fake.client as never);
    const tree = await repository.getTree("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046");
    expect(tree).toMatchObject({
      workspaceRevision: 4,
      nodes: [{ title: "제목 없음", position: 1024, createdAt: "2026-09-17T00:00:00.000Z" }],
    });
    const membership = fake.calls.find((call) => call.text.includes("JOIN workspace_members"));
    expect(membership?.values).toEqual(["56e146d2-99a3-4afe-a5ae-dab330032046", "principal-1"]);
  });

  it("does not query nodes when membership is absent", async () => {
    const fake = treeClient(false);
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await expect(repository.getTree("other-principal", "56e146d2-99a3-4afe-a5ae-dab330032046"))
      .rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(fake.calls.some((call) => call.text.includes("FROM nodes"))).toBe(false);
    expect(fake.calls.at(-1)?.text).toBe("END_CONNECTION");
  });

  function createClient(options: { role?: "OWNER" | "EDITOR" | "VIEWER"; replay?: boolean } = {}) {
    const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
    const row = {
      id: "12e946ae-8ca1-4484-964d-f874e4c2eb5c",
      workspace_id: "56e146d2-99a3-4afe-a5ae-dab330032046",
      parent_id: null,
      kind: "PAGE",
      title: "제목 없음",
      position: "0",
      revision: "1",
      archived_at: null,
      trashed_at: null,
      created_at: "2026-09-17T00:00:00.000Z",
      updated_at: "2026-09-17T00:00:00.000Z",
      created_operation_id: "b8df8229-3e09-4525-bb62-1743dc093f91",
    };
    return {
      calls,
      client: {
        async query(text: string, values?: readonly unknown[]) {
          calls.push(values ? { text, values } : { text });
          if (text.includes("FOR UPDATE OF w")) return { rows: [{ id: row.workspace_id, revision: "1", role: options.role ?? "OWNER" }] };
          if (text.includes("created_operation_id = $2")) return { rows: options.replay ? [row] : [] };
          if (text.startsWith("INSERT INTO nodes")) return { rows: [row] };
          return { rows: [] };
        },
        async end() { calls.push({ text: "END_CONNECTION" }); },
      },
    };
  }

  const createRequest = {
    operationId: "b8df8229-3e09-4525-bb62-1743dc093f91",
    id: "12e946ae-8ca1-4484-964d-f874e4c2eb5c",
    kind: "PAGE" as const,
    title: "제목 없음",
    parentId: null,
    position: 0,
  };

  it("creates a page, empty block document and first immutable revision atomically", async () => {
    const fake = createClient();
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await expect(repository.createNode("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046", createRequest))
      .resolves.toMatchObject({ id: createRequest.id, kind: "PAGE", revision: 1 });
    const sql = fake.calls.map((call) => call.text);
    expect(sql.some((text) => text.startsWith("INSERT INTO documents"))).toBe(true);
    expect(sql.some((text) => text.startsWith("INSERT INTO document_revisions"))).toBe(true);
    expect(sql.some((text) => text.startsWith("UPDATE workspaces SET revision"))).toBe(true);
    expect(sql).toEqual(expect.arrayContaining(["BEGIN", "COMMIT", "END_CONNECTION"]));
    expect(sql).not.toContain("ROLLBACK");
  });

  it("does not create document rows for a folder", async () => {
    const fake = createClient();
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await repository.createNode("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046", { ...createRequest, kind: "FOLDER" });
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO documents"))).toBe(false);
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO document_revisions"))).toBe(false);
  });

  it("returns an identical operation replay without writing again", async () => {
    const fake = createClient({ replay: true });
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await expect(repository.createNode("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046", createRequest)).resolves.toMatchObject({ id: createRequest.id });
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO nodes"))).toBe(false);
    expect(fake.calls.some((call) => call.text.startsWith("UPDATE workspaces"))).toBe(false);
    expect(fake.calls.map((call) => call.text)).toContain("COMMIT");
  });

  it("rejects an operation replay with a different payload", async () => {
    const fake = createClient({ replay: true });
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await expect(repository.createNode("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046", {
      ...createRequest, title: "다른 제목",
    })).rejects.toThrow("different request");
    expect(fake.calls.map((call) => call.text)).toContain("ROLLBACK");
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO nodes"))).toBe(false);
  });

  it("rejects a parent that is not an active folder in the authorized workspace", async () => {
    const fake = createClient();
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await expect(repository.createNode("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046", {
      ...createRequest, parentId: "a7dc544d-49d4-49da-a3c0-b0dab184fcb1",
    })).rejects.toThrow("active folder");
    expect(fake.calls.map((call) => call.text)).toContain("ROLLBACK");
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO nodes"))).toBe(false);
  });

  it("rolls back before mutation for a viewer", async () => {
    const fake = createClient({ role: "VIEWER" });
    const repository = createWorkspaceRepository(async () => fake.client as never);
    await expect(repository.createNode("principal-1", "56e146d2-99a3-4afe-a5ae-dab330032046", createRequest)).rejects.toThrow("cannot write");
    expect(fake.calls.map((call) => call.text)).toEqual(expect.arrayContaining(["ROLLBACK", "END_CONNECTION"]));
    expect(fake.calls.some((call) => call.text.startsWith("INSERT INTO nodes"))).toBe(false);
  });
});
