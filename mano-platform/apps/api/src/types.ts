export interface AccessIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly email: string;
}

export interface PrincipalView {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
}

export interface WorkspaceView {
  readonly id: string;
  readonly name: string;
  readonly kind: "PERSONAL" | "SHARED";
  readonly role: "OWNER" | "EDITOR" | "VIEWER";
}

export interface MeResponse {
  readonly principal: PrincipalView;
  readonly workspaces: readonly WorkspaceView[];
}

export interface IdentityRepository {
  bootstrap(identity: AccessIdentity): Promise<MeResponse>;
}

export interface NodeView {
  readonly id: string;
  readonly workspaceId: string;
  readonly parentId: string | null;
  readonly kind: "FOLDER" | "PAGE";
  readonly title: string;
  readonly position: number;
  readonly revision: number;
  readonly archivedAt: string | null;
  readonly trashedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TreeResponse {
  readonly workspaceId: string;
  readonly workspaceRevision: number;
  readonly nodes: readonly NodeView[];
}

export interface WorkspaceRepository {
  getTree(principalId: string, workspaceId: string): Promise<TreeResponse>;
  createNode(principalId: string, workspaceId: string, request: CreateNodeRequest): Promise<ApiNode>;
}

export class WorkspaceNotFoundError extends Error {
  constructor() {
    super("Workspace was not found");
  }
}

export class WorkspaceWriteForbiddenError extends Error {
  constructor() {
    super("Workspace membership cannot write");
  }
}

export class InvalidNodeParentError extends Error {
  constructor() {
    super("Parent must be an active folder in the same workspace");
  }
}

export class NodeIdConflictError extends Error {
  constructor() {
    super("Node ID already exists");
  }
}

export class OperationReplayMismatchError extends Error {
  constructor() {
    super("Operation ID was already used with a different request");
  }
}
import type { ApiNode, CreateNodeRequest } from "@mano/contracts";
